import { InterfaceEventName } from '@ubeswap/analytics-events'
import { Currency, Percent } from '@ubeswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import { sendAnalyticsEvent, useTrace } from 'analytics'
import { Field, RESET_APPROVAL_TOKENS } from 'components/swap/constants'
import useNativeCurrency from 'lib/hooks/useNativeCurrency'
import { getPriceUpdateBasisPoints } from 'lib/utils/analytics'
import { useCallback, useEffect, useState } from 'react'
import { InterfaceTrade, TradeFillType } from 'state/routing/types'
import { useIsTransactionConfirmed } from 'state/transactions/hooks'
import invariant from 'tiny-invariant'
import { NumberType, useFormatter } from 'utils/formatNumbers'
import { didUserReject } from 'utils/swapErrorToUserReadableMessage'
import { tradeMeaningfullyDiffers } from 'utils/tradeMeaningFullyDiffer'

import { ConfirmModalState } from 'components/ConfirmSwapModal'
import { PendingModalError } from 'components/ConfirmSwapModal/Error'
import { useMaxAmountIn } from './useMaxAmountIn'
import { Allowance, AllowanceState } from './usePermit2Allowance'
import usePrevious from './usePrevious'
import useWrapCallback from './useWrapCallback'

type PendingConfirmModalState = Extract<
  ConfirmModalState,
  | ConfirmModalState.APPROVING_TOKEN
  | ConfirmModalState.PERMITTING
  | ConfirmModalState.PENDING_CONFIRMATION
  | ConfirmModalState.WRAPPING
  | ConfirmModalState.RESETTING_TOKEN_ALLOWANCE
>

export function useConfirmModalState({
  trade,
  originalTrade,
  allowedSlippage,
  onSwap,
  allowance,
  onCurrencySelection,
}: {
  trade: InterfaceTrade
  originalTrade?: InterfaceTrade
  allowedSlippage: Percent
  onSwap: () => void
  allowance: Allowance
  onCurrencySelection: (field: Field, currency: Currency) => void
}) {
  const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState>(ConfirmModalState.REVIEWING)
  const [approvalError, setApprovalError] = useState<PendingModalError>()
  const [pendingModalSteps, setPendingModalSteps] = useState<PendingConfirmModalState[]>([])
  const { formatCurrencyAmount } = useFormatter()

  // 2. 生成所需步骤的函数
  const generateRequiredSteps = useCallback(() => {
    const steps: PendingConfirmModalState[] = []
    // 2.1 如果需要wrap（例如ETH转WETH），添加wrap步骤
    if (trade.fillType === TradeFillType.UniswapX && trade.wrapInfo.needsWrap) {
      steps.push(ConfirmModalState.WRAPPING)
    }
    // 2.2 如果需要重置代币授权，添加重置步骤
    if (
      allowance.state === AllowanceState.REQUIRED &&
      allowance.needsSetupApproval &&
      RESET_APPROVAL_TOKENS.some((token) => token.equals(allowance.token)) &&
      allowance.allowedAmount.greaterThan(0)
    ) {
      steps.push(ConfirmModalState.RESETTING_TOKEN_ALLOWANCE)
    }
    // 2.3 如果需要设置授权，添加授权步骤
    if (allowance.state === AllowanceState.REQUIRED && allowance.needsSetupApproval) {
      steps.push(ConfirmModalState.APPROVING_TOKEN)
    }
    // 2.4 如果需要签名许可，添加签名步骤
    if (allowance.state === AllowanceState.REQUIRED && allowance.needsPermitSignature) {
      steps.push(ConfirmModalState.PERMITTING)
    }
    // 2.5 最后添加确认交易步骤
    steps.push(ConfirmModalState.PENDING_CONFIRMATION)
    return steps
  }, [allowance, trade])

  const { chainId } = useWeb3React()
  const trace = useTrace()
  const maximumAmountIn = useMaxAmountIn(trade, allowedSlippage)

  const nativeCurrency = useNativeCurrency(chainId)

  const [wrapTxHash, setWrapTxHash] = useState<string>()
  const { execute: onWrap } = useWrapCallback(
    nativeCurrency,
    trade.inputAmount.currency,
    formatCurrencyAmount({
      amount: trade.inputAmount,
      type: NumberType.SwapTradeAmount,
    })
  )
  const wrapConfirmed = useIsTransactionConfirmed(wrapTxHash)
  const prevWrapConfirmed = usePrevious(wrapConfirmed)
  const catchUserReject = async (e: any, errorType: PendingModalError) => {
    setConfirmModalState(ConfirmModalState.REVIEWING)
    if (didUserReject(e)) return
    console.error(e)
    setApprovalError(errorType)
  }

  const performStep = useCallback(
    async (step: ConfirmModalState) => {
      switch (step) {
        case ConfirmModalState.WRAPPING:
          setConfirmModalState(ConfirmModalState.WRAPPING)
          onWrap?.()
            .then((wrapTxHash) => {
              setWrapTxHash(wrapTxHash)
              // After the wrap has succeeded, reset the input currency to be WETH
              // because the trade will be on WETH -> token
              onCurrencySelection(Field.INPUT, trade.inputAmount.currency)
              sendAnalyticsEvent(InterfaceEventName.WRAP_TOKEN_TXN_SUBMITTED, {
                chain_id: chainId,
                token_symbol: maximumAmountIn?.currency.symbol,
                token_address: maximumAmountIn?.currency.address,
                ...trade,
                ...trace,
              })
            })
            .catch((e) => catchUserReject(e, PendingModalError.WRAP_ERROR))
          break
        case ConfirmModalState.RESETTING_TOKEN_ALLOWANCE:
          setConfirmModalState(ConfirmModalState.RESETTING_TOKEN_ALLOWANCE)
          invariant(allowance.state === AllowanceState.REQUIRED, 'Allowance should be required')
          allowance.revoke().catch((e) => catchUserReject(e, PendingModalError.TOKEN_APPROVAL_ERROR))
          break
        case ConfirmModalState.APPROVING_TOKEN:
          setConfirmModalState(ConfirmModalState.APPROVING_TOKEN)
          invariant(allowance.state === AllowanceState.REQUIRED, 'Allowance should be required')
          allowance.approve().catch((e) => catchUserReject(e, PendingModalError.TOKEN_APPROVAL_ERROR))
          break
        case ConfirmModalState.PERMITTING:
          setConfirmModalState(ConfirmModalState.PERMITTING)
          invariant(allowance.state === AllowanceState.REQUIRED, 'Allowance should be required')
          allowance.permit().catch((e) => catchUserReject(e, PendingModalError.TOKEN_APPROVAL_ERROR))
          break
        case ConfirmModalState.PENDING_CONFIRMATION:
          setConfirmModalState(ConfirmModalState.PENDING_CONFIRMATION)
          try {
            // 这里是核心swap执行方法
            // onSwap 是从外部传入的实际执行swap的函数
            onSwap()
          } catch (e) {
            catchUserReject(e, PendingModalError.CONFIRMATION_ERROR)
          }
          break
        default:
          setConfirmModalState(ConfirmModalState.REVIEWING)
          break
      }
    },
    [
      allowance,
      chainId,
      maximumAmountIn?.currency.address,
      maximumAmountIn?.currency.symbol,
      onSwap,
      onWrap,
      trace,
      trade,
      onCurrencySelection,
    ]
  )

  // 1. swap的入口函数
  const startSwapFlow = useCallback(() => {
    // 1.1 获取所需的所有步骤
    const steps = generateRequiredSteps()
    // 1.2 设置待处理的模态框步骤
    setPendingModalSteps(steps)
    // 1.3 执行第一个步骤
    performStep(steps[0])
  }, [generateRequiredSteps, performStep])


  const previousSetupApprovalNeeded = usePrevious(
    allowance.state === AllowanceState.REQUIRED ? allowance.needsSetupApproval : undefined
  )

  useEffect(() => {
    // If the wrapping step finished, trigger the next step (allowance or swap).
    if (wrapConfirmed && !prevWrapConfirmed) {
      // moves on to either approve WETH or to swap submission
      performStep(pendingModalSteps[1])
    }
  }, [pendingModalSteps, performStep, prevWrapConfirmed, wrapConfirmed])

  useEffect(() => {
    if (
      allowance.state === AllowanceState.REQUIRED &&
      allowance.needsPermitSignature &&
      // If the token approval switched from missing to fulfilled, trigger the next step (permit2 signature).
      !allowance.needsSetupApproval &&
      previousSetupApprovalNeeded
    ) {
      performStep(ConfirmModalState.PERMITTING)
    }
  }, [allowance, performStep, previousSetupApprovalNeeded])

  const previousRevocationPending = usePrevious(
    allowance.state === AllowanceState.REQUIRED && allowance.isRevocationPending
  )
  useEffect(() => {
    if (allowance.state === AllowanceState.REQUIRED && previousRevocationPending && !allowance.isRevocationPending) {
      performStep(ConfirmModalState.APPROVING_TOKEN)
    }
  }, [allowance, performStep, previousRevocationPending])

  function isInApprovalPhase(confirmModalState: ConfirmModalState) {
    return (
      confirmModalState === ConfirmModalState.RESETTING_TOKEN_ALLOWANCE ||
      confirmModalState === ConfirmModalState.APPROVING_TOKEN ||
      confirmModalState === ConfirmModalState.PERMITTING
    )
  }

  const doesTradeDiffer = originalTrade && tradeMeaningfullyDiffers(trade, originalTrade, allowedSlippage)
  useEffect(() => {
    // Automatically triggers the next phase if the local modal state still thinks we're in the approval phase,
    // but the allowance has been set. This will automaticaly trigger the swap.
    if (isInApprovalPhase(confirmModalState) && allowance.state === AllowanceState.ALLOWED) {
      // Caveat: prevents swap if trade has updated mid approval flow.
      if (doesTradeDiffer) {
        setConfirmModalState(ConfirmModalState.REVIEWING)
        return
      }
      performStep(ConfirmModalState.PENDING_CONFIRMATION)
    }
  }, [allowance, confirmModalState, doesTradeDiffer, performStep])

  const onCancel = () => {
    setConfirmModalState(ConfirmModalState.REVIEWING)
    setApprovalError(undefined)
  }

  const [lastExecutionPrice, setLastExecutionPrice] = useState(trade?.executionPrice)
  const [priceUpdate, setPriceUpdate] = useState<number>()
  useEffect(() => {
    if (lastExecutionPrice && !trade.executionPrice.equalTo(lastExecutionPrice)) {
      setPriceUpdate(getPriceUpdateBasisPoints(lastExecutionPrice, trade.executionPrice))
      setLastExecutionPrice(trade.executionPrice)
    }
  }, [lastExecutionPrice, setLastExecutionPrice, trade])

  return {
    startSwapFlow,
    onCancel,
    confirmModalState,
    doesTradeDiffer,
    approvalError,
    pendingModalSteps,
    priceUpdate,
    wrapTxHash,
  }
}
