import { ChainId } from '@ubeswap/sdk-core'
import {
  BrowserEvent,
  InterfaceElementName,
  InterfaceEventName,
  InterfaceSectionName,
  SharedEventName,
  SwapEventName,
} from '@ubeswap/analytics-events'
import { Currency, CurrencyAmount, Token, UNIVERSAL_ROUTER_ADDRESS } from '@ubeswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import { Trace, TraceEvent, sendAnalyticsEvent, useTrace } from 'analytics'
import { useToggleAccountDrawer } from 'components/AccountDrawer/MiniPortfolio/hooks'
import { ButtonError, ButtonLight, ButtonPrimary } from 'components/Button'
import { GrayCard } from 'components/Card'
import { AutoColumn } from 'components/Column'
import { ConfirmSwapModal } from 'components/ConfirmSwapModal'
import SwapCurrencyInputPanel from 'components/CurrencyInputPanel/SwapCurrencyInputPanel'
import TokenSafetyModal from 'components/TokenSafety/TokenSafetyModal'
import PriceImpactModal from 'components/swap/PriceImpactModal'
import PriceImpactWarning from 'components/swap/PriceImpactWarning'
import SwapDetailsDropdown from 'components/swap/SwapDetailsDropdown'
import confirmPriceImpactWithoutFee from 'components/swap/confirmPriceImpactWithoutFee'
import { Field } from 'components/swap/constants'
import { ArrowContainer, ArrowWrapper, OutputSwapSection, SwapSection } from 'components/swap/styled'
import { useConnectionReady } from 'connection/eagerlyConnect'
import { getChainInfo } from 'constants/chainInfo'
import { asSupportedChain, isSupportedChain } from 'constants/chains'
import { TOKEN_SHORTHANDS } from 'constants/tokens'
import { useCurrency, useDefaultActiveTokens } from 'hooks/Tokens'
import { useIsSwapUnsupported } from 'hooks/useIsSwapUnsupported'
import { useMaxAmountIn } from 'hooks/useMaxAmountIn'
import useParsedQueryString from 'hooks/useParsedQueryString'
import usePermit2Allowance, { AllowanceState } from 'hooks/usePermit2Allowance'
import usePrevious from 'hooks/usePrevious'
import { SwapResult, useSwapCallback } from 'hooks/useSwapCallback'
import { useSwitchChain } from 'hooks/useSwitchChain'
import { useUSDPrice } from 'hooks/useUSDPrice'
import useWrapCallback, { WrapErrorText, WrapType } from 'hooks/useWrapCallback'
import { Trans } from 'i18n'
import JSBI from 'jsbi'
import { formatSwapQuoteReceivedEventProperties } from 'lib/utils/analytics'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown } from 'react-feather'
import { useNavigate } from 'react-router-dom'
import { Text } from 'rebass'
import { useAppSelector } from 'state/hooks'
import { InterfaceTrade, INTERNAL_ROUTER_PREFERENCE_PRICE, TradeState } from 'state/routing/types'
import { isClassicTrade } from 'state/routing/utils'
import {
  queryParametersToCurrencyState,
  useSwapActionHandlers,
  useSwapAndLimitContext,
  useSwapContext,
} from 'state/swap/hooks'
import { useTheme } from 'styled-components'
import { ThemedText } from 'theme/components'
import { maybeLogFirstSwapAction } from 'tracing/swapFlowLoggers'
import { computeFiatValuePriceImpact } from 'utils/computeFiatValuePriceImpact'
import { NumberType, useFormatter } from 'utils/formatNumbers'
import { isEmptyObject } from 'utils/isEmpty'
import { maxAmountSpend } from 'utils/maxAmountSpend'
import { largerPercentValue } from 'utils/percent'
import { computeRealizedPriceImpact, warningSeverity } from 'utils/prices'
import { didUserReject } from 'utils/swapErrorToUserReadableMessage'
import { CurrencyState } from 'state/swap/types'
import { getIsReviewableQuote } from '.'
import { OutputTaxTooltipBody } from './TaxTooltipBody'
import { getRouter } from 'lib/hooks/routing/clientSideSmartOrderRouter'
import { getClientSideQuote } from 'lib/hooks/routing/clientSideSmartOrderRouter'
import { Protocol } from '@uniswap/router-sdk'
import { DGC_DBC, SIC_DBC } from '@ubeswap/smart-order-router'
import { useWDBCStore } from 'store/dbcRatio'
import { calculateWDBCRatio } from 'hooks/useDbcRatio'
import { isWebAndroid, isWebIOS } from 'uniswap/src/utils/platform'
import { openWallet } from 'connection/WalletConnectV2'

const SWAP_FORM_CURRENCY_SEARCH_FILTERS = {
  showCommonBases: true,
}

interface SwapFormProps {
  disableTokenInputs?: boolean
  onCurrencyChange?: (selected: CurrencyState) => void
}

export function SwapForm({ disableTokenInputs = false, onCurrencyChange }: SwapFormProps) {
  const connectionReady = useConnectionReady()
  const { account, chainId: connectedChainId, connector, provider } = useWeb3React()
  const trace = useTrace()

  const { chainId, prefilledState, currencyState } = useSwapAndLimitContext()
  const { swapState, setSwapState, derivedSwapInfo } = useSwapContext()
  const { typedValue, independentField } = swapState

  // token warning stuff
  const parsedQs = useParsedQueryString()
  const prefilledCurrencies = useMemo(() => {
    return queryParametersToCurrencyState(parsedQs)
  }, [parsedQs])
  const prefilledInputCurrency = useCurrency(prefilledCurrencies?.inputCurrencyId, chainId)
  const prefilledOutputCurrency = useCurrency(prefilledCurrencies?.outputCurrencyId, chainId)

  const [loadedInputCurrency, setLoadedInputCurrency] = useState(prefilledInputCurrency)
  const [loadedOutputCurrency, setLoadedOutputCurrency] = useState(prefilledOutputCurrency)

  useEffect(() => {
    setLoadedInputCurrency(prefilledInputCurrency)
    setLoadedOutputCurrency(prefilledOutputCurrency)
  }, [prefilledInputCurrency, prefilledOutputCurrency])

  const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(false)
  const [showPriceImpactModal, setShowPriceImpactModal] = useState<boolean>(false)

  const urlLoadedTokens: Token[] = useMemo(
    () => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c?.isToken ?? false) ?? [],
    [loadedInputCurrency, loadedOutputCurrency]
  )
  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
  }, [])

  // dismiss warning if all imported tokens are in active lists
  const defaultTokens = useDefaultActiveTokens(chainId)
  const urlTokensNotInDefault = useMemo(
    () =>
      urlLoadedTokens && !isEmptyObject(defaultTokens)
        ? urlLoadedTokens
          .filter((token: Token) => {
            return !(token.address in defaultTokens)
          })
          .filter((token: Token) => {
            // Any token addresses that are loaded from the shorthands map do not need to show the import URL
            const supported = asSupportedChain(chainId)
            if (!supported) return true
            return !Object.keys(TOKEN_SHORTHANDS).some((shorthand) => {
              const shorthandTokenAddress = TOKEN_SHORTHANDS[shorthand][supported]
              return shorthandTokenAddress && shorthandTokenAddress === token.address
            })
          })
        : [],
    [chainId, defaultTokens, urlLoadedTokens]
  )

  const theme = useTheme()

  // toggle wallet when disconnected
  const toggleWalletDrawer = useToggleAccountDrawer()

  const {
    trade: { state: tradeState, trade, swapQuoteLatency },
    allowedSlippage,
    currencyBalances,
    parsedAmount,
    currencies,
    inputError: swapInputError,
    outputFeeFiatValue,
    inputTax,
    outputTax,
  } = derivedSwapInfo


  const [inputTokenHasTax, outputTokenHasTax] = useMemo(
    () => [!inputTax.equalTo(0), !outputTax.equalTo(0)],
    [inputTax, outputTax]
  )

  useEffect(() => {
    // Force exact input if the user switches to an output token with tax
    if (outputTokenHasTax && independentField === Field.OUTPUT) {
      setSwapState((state) => ({
        ...state,
        independentField: Field.INPUT,
        typedValue: '',
      }))
    }
  }, [independentField, outputTokenHasTax, setSwapState, trade?.outputAmount])

  const {
    wrapType,
    execute: onWrap,
    inputError: wrapInputError,
  } = useWrapCallback(currencies[Field.INPUT], currencies[Field.OUTPUT], typedValue)
  const showWrap: boolean = wrapType !== WrapType.NOT_APPLICABLE

  const parsedAmounts = useMemo(
    () =>
      showWrap
        ? {
          [Field.INPUT]: parsedAmount,
          [Field.OUTPUT]: parsedAmount,
        }
        : {
          [Field.INPUT]: independentField === Field.INPUT ? parsedAmount : trade?.inputAmount,
          [Field.OUTPUT]: independentField === Field.OUTPUT ? parsedAmount : trade?.outputAmount,
        },
    [independentField, parsedAmount, showWrap, trade]
  )

  const showFiatValueInput = Boolean(parsedAmounts[Field.INPUT])
  const showFiatValueOutput = Boolean(parsedAmounts[Field.OUTPUT])


  // 一个Token等于多少wei
  const getSingleUnitAmount = (currency?: Currency) => {
    if (!currency) return
    return CurrencyAmount.fromRawAmount(currency, JSBI.BigInt(10 ** currency.decimals))
  }

  const fiatValueInput = useUSDPrice(
    parsedAmounts[Field.INPUT] ?? getSingleUnitAmount(currencies[Field.INPUT]),
    currencies[Field.INPUT]
  )
  const fiatValueOutput = useUSDPrice(
    parsedAmounts[Field.OUTPUT] ?? getSingleUnitAmount(currencies[Field.OUTPUT]),
    currencies[Field.OUTPUT]
  )

  const [routeNotFound, routeIsLoading, routeIsSyncing] = useMemo(
    () => [
      tradeState === TradeState.NO_ROUTE_FOUND,
      tradeState === TradeState.LOADING,
      tradeState === TradeState.LOADING && Boolean(trade),
    ],
    [trade, tradeState]
  )

  const fiatValueTradeInput = useUSDPrice(trade?.inputAmount)
  const fiatValueTradeOutput = useUSDPrice(trade?.outputAmount)
  const preTaxFiatValueTradeOutput = useUSDPrice(trade?.outputAmount)
  const [stablecoinPriceImpact, preTaxStablecoinPriceImpact] = useMemo(
    () =>
      routeIsSyncing || !isClassicTrade(trade) || showWrap
        ? [undefined, undefined]
        : [
          computeFiatValuePriceImpact(fiatValueTradeInput.data, fiatValueTradeOutput.data),
          computeFiatValuePriceImpact(fiatValueTradeInput.data, preTaxFiatValueTradeOutput.data),
        ],
    [fiatValueTradeInput, fiatValueTradeOutput, preTaxFiatValueTradeOutput, routeIsSyncing, trade, showWrap]
  )

  const { onSwitchTokens, onCurrencySelection, onUserInput } = useSwapActionHandlers()
  const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value)
      maybeLogFirstSwapAction(trace)
    },
    [onUserInput, trace]
  )
  const handleTypeOutput = useCallback(
    (value: string) => {
      onUserInput(Field.OUTPUT, value)
      maybeLogFirstSwapAction(trace)
    },
    [onUserInput, trace]
  )

  const navigate = useNavigate()
  const swapIsUnsupported = useIsSwapUnsupported(currencies[Field.INPUT], currencies[Field.OUTPUT])

  // reset if they close warning without tokens in params
  const handleDismissTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
    navigate('/swap/')
  }, [navigate])

  // modal and loading
  const [{ showConfirm, tradeToConfirm, swapError, swapResult }, setSwapFormState] = useState<{
    showConfirm: boolean
    tradeToConfirm?: InterfaceTrade
    swapError?: Error
    swapResult?: SwapResult
  }>({
    showConfirm: false,
    tradeToConfirm: undefined,
    swapError: undefined,
    swapResult: undefined,
  })

  const previousConnectedChainId = usePrevious(connectedChainId)
  const previousPrefilledState = usePrevious(prefilledState)
  useEffect(() => {
    const chainChanged = previousConnectedChainId && previousConnectedChainId !== connectedChainId
    const prefilledInputChanged =
      previousPrefilledState?.inputCurrency &&
      !prefilledState.inputCurrency?.equals(previousPrefilledState.inputCurrency)
    const prefilledOutputChanged =
      previousPrefilledState?.outputCurrency &&
      !prefilledState?.outputCurrency?.equals(previousPrefilledState.outputCurrency)

    if (chainChanged || prefilledInputChanged || prefilledOutputChanged) {
      // reset local state
      setSwapFormState({
        tradeToConfirm: undefined,
        swapError: undefined,
        showConfirm: false,
        swapResult: undefined,
      })
    }
  }, [
    connectedChainId,
    prefilledState.inputCurrency,
    prefilledState?.outputCurrency,
    previousConnectedChainId,
    previousPrefilledState,
  ])

  const { formatCurrencyAmount } = useFormatter()
  const formattedAmounts = useMemo(
    () => ({
      [independentField]: typedValue,
      [dependentField]: showWrap
        ? parsedAmounts[independentField]?.toExact() ?? ''
        : formatCurrencyAmount({
          amount: parsedAmounts[dependentField],
          type: NumberType.SwapTradeAmount,
          placeholder: '',
        }),
    }),
    [dependentField, formatCurrencyAmount, independentField, parsedAmounts, showWrap, typedValue]
  )

  const userHasSpecifiedInputOutput = Boolean(
    currencies[Field.INPUT] && currencies[Field.OUTPUT] && parsedAmounts[independentField]?.greaterThan(JSBI.BigInt(0))
  )

  const maximumAmountIn = useMaxAmountIn(trade, allowedSlippage)
  const allowance = usePermit2Allowance(
    maximumAmountIn ??
    (parsedAmounts[Field.INPUT]?.currency.isToken
      ? (parsedAmounts[Field.INPUT] as CurrencyAmount<Token>)
      : undefined),
    isSupportedChain(chainId) ? UNIVERSAL_ROUTER_ADDRESS(chainId) : undefined,
    trade?.fillType
  )

  const maxInputAmount: CurrencyAmount<Currency> | undefined = useMemo(
    () => maxAmountSpend(currencyBalances[Field.INPUT]),
    [currencyBalances]
  )
  const showMaxButton = Boolean(maxInputAmount?.greaterThan(0) && !parsedAmounts[Field.INPUT]?.equalTo(maxInputAmount))
  const swapFiatValues = useMemo(() => {
    return { amountIn: fiatValueTradeInput.data, amountOut: fiatValueTradeOutput.data, feeUsd: outputFeeFiatValue }
  }, [fiatValueTradeInput.data, fiatValueTradeOutput.data, outputFeeFiatValue])

  // the callback to execute the swap
  const swapCallback = useSwapCallback(
    trade,
    swapFiatValues,
    allowedSlippage,
    allowance.state === AllowanceState.ALLOWED ? allowance.permitSignature : undefined
  )

  const handleContinueToReview = useCallback(() => {
    setSwapFormState({
      tradeToConfirm: trade,
      swapError: undefined,
      showConfirm: true,
      swapResult: undefined,
    })
  }, [trade])

  const clearSwapState = useCallback(() => {
    setSwapFormState((currentState) => ({
      ...currentState,
      swapError: undefined,
      swapResult: undefined,
    }))
  }, [])

  const handleOpenWallet = useCallback(async () => {
    if (!connector) {
      console.warn('Wallet connector not found');
      return;
    }

    if (!account) {
      console.warn('Wallet not connected');
      return;
    }

    // Directly open wallet in mobile environment
    if (isWebIOS || isWebAndroid) {
      try {
        // Open wallet with web3 data
        openWallet('', { 
          connector,
          provider,
          account 
        });
        console.log('Attempting to open wallet for signature');
      } catch (error) {
        console.error('Error opening wallet:', error);
      }
    }
  }, [connector, account, provider]);

  const handleSwap = useCallback(() => {
    if (!swapCallback) {
      return
    }
    if (preTaxStablecoinPriceImpact && !confirmPriceImpactWithoutFee(preTaxStablecoinPriceImpact)) {
      return
    }

    // 检查是否在内嵌钱包环境中
    const ethereum = window.ethereum as any;
    const isInWalletBrowser = Boolean(
      ethereum?.isTokenPocket || 
      ethereum?.isImToken || 
      ethereum?.isTrust ||
      ethereum?.isOKExWallet ||
      ethereum?.isBitKeep ||
      ethereum?.isCoin98 ||
      ethereum?.isHuobiWallet ||
      ethereum?.isMathWallet ||
      ethereum?.isOneKey ||
      /TokenPocket|imToken|Trust|OKEx|BitKeep|Coin98|HuobiWallet|MathWallet|OneKey/i.test(navigator.userAgent)
    );

    // 只有在非内嵌钱包环境下才需要唤起钱包
    if ((isWebIOS || isWebAndroid) && !isInWalletBrowser) {
      handleOpenWallet();
    }
    
    swapCallback()
      .then((result) => {
        setSwapFormState((currentState) => ({
          ...currentState,
          swapError: undefined,
          swapResult: result,
        }))
      })
      .catch((error) => {
        setSwapFormState((currentState) => ({
          ...currentState,
          swapError: error,
          swapResult: undefined,
        }))
      })
  }, [swapCallback, preTaxStablecoinPriceImpact, handleOpenWallet])

  const handleOnWrap = useCallback(async () => {
    if (!onWrap) return
    try {
      const txHash = await onWrap()
      setSwapFormState((currentState) => ({
        ...currentState,
        swapError: undefined,
        txHash,
      }))
      onUserInput(Field.INPUT, '')
    } catch (error) {
      if (!didUserReject(error)) {
        sendAnalyticsEvent(SwapEventName.SWAP_ERROR, {
          wrapType,
          input: currencies[Field.INPUT],
          output: currencies[Field.OUTPUT],
        })
      }
      console.error('Could not wrap/unwrap', error)
      setSwapFormState((currentState) => ({
        ...currentState,
        swapError: error,
        txHash: undefined,
      }))
    }
  }, [currencies, onUserInput, onWrap, wrapType])

  // warnings on the greater of fiat value price impact and execution price impact
  const { priceImpactSeverity, largerPriceImpact } = useMemo(() => {
    if (!isClassicTrade(trade)) {
      return { priceImpactSeverity: 0, largerPriceImpact: undefined }
    }

    const marketPriceImpact = trade?.priceImpact ? computeRealizedPriceImpact(trade) : undefined

    console.log('marketPriceImpact:',trade?.priceImpact,  marketPriceImpact)
    console.log('preTaxStablecoinPriceImpact:', preTaxStablecoinPriceImpact)
    const largerPriceImpact = largerPercentValue(marketPriceImpact, preTaxStablecoinPriceImpact)
    // return { priceImpactSeverity: warningSeverity(largerPriceImpact), largerPriceImpact }
    return { priceImpactSeverity: 0, largerPriceImpact: 0 }

  }, [preTaxStablecoinPriceImpact, trade])

  const handleConfirmDismiss = useCallback(() => {
    setSwapFormState((currentState) => ({ ...currentState, showConfirm: false }))
    // If there was a swap, we want to clear the input
    if (swapResult) {
      onUserInput(Field.INPUT, '')
    }
  }, [onUserInput, swapResult])

  const handleAcceptChanges = useCallback(() => {
    setSwapFormState((currentState) => ({ ...currentState, tradeToConfirm: trade }))
  }, [trade])

  const handleInputSelect = useCallback(
    (inputCurrency: Currency) => {
      onCurrencySelection(Field.INPUT, inputCurrency)
      onCurrencyChange?.({
        inputCurrency,
        outputCurrency: currencyState.outputCurrency,
      })
      maybeLogFirstSwapAction(trace)
    },
    [onCurrencyChange, onCurrencySelection, currencyState, trace]
  )
  const inputCurrencyNumericalInputRef = useRef<HTMLInputElement>(null)

  const handleMaxInput = useCallback(() => {
    maxInputAmount && onUserInput(Field.INPUT, maxInputAmount.toExact())
    maybeLogFirstSwapAction(trace)
  }, [maxInputAmount, onUserInput, trace])

  const handleOutputSelect = useCallback(
    (outputCurrency: Currency) => {
      onCurrencySelection(Field.OUTPUT, outputCurrency)
      onCurrencyChange?.({
        inputCurrency: currencyState.inputCurrency,
        outputCurrency,
      })
      maybeLogFirstSwapAction(trace)
    },
    [onCurrencyChange, onCurrencySelection, currencyState, trace]
  )

  const showPriceImpactWarning = isClassicTrade(trade) && largerPriceImpact && priceImpactSeverity > 3

  const prevTrade = usePrevious(trade)
  useEffect(() => {
    if (!trade || prevTrade === trade) return // no new swap quote to log

    sendAnalyticsEvent(SwapEventName.SWAP_QUOTE_RECEIVED, {
      ...formatSwapQuoteReceivedEventProperties(trade, allowedSlippage, swapQuoteLatency, outputFeeFiatValue),
      ...trace,
    })
  }, [prevTrade, trade, trace, allowedSlippage, swapQuoteLatency, outputFeeFiatValue])

  const showDetailsDropdown = Boolean(
    !showWrap && userHasSpecifiedInputOutput && (trade || routeIsLoading || routeIsSyncing)
  )

  const inputCurrency = currencies[Field.INPUT] ?? undefined
  const switchChain = useSwitchChain()
  const switchingChain = useAppSelector((state) => state.wallets.switchingChain)

  const { pairPriceRatio, setRatio, setRatioLoadingPair, wdbcPrice, setWdbcPrice, isLoadingWdbcPrice, setIsLoadingWdbcPrice } = useWDBCStore()
  // 定期获取WDBC价格
  useEffect(() => {
    // fetchWDBCRatio() // 初始调用

    // const intervalId = setInterval(() => {

    console.log('useEffect-currencies', currencies, Field.INPUT, getSingleUnitAmount(currencies[Field.INPUT]), Field.OUTPUT, getSingleUnitAmount(currencies[Field.OUTPUT]))
    fetchWDBCRatio(parsedAmounts[Field.INPUT] ?? getSingleUnitAmount(currencies[Field.INPUT]))
    fetchWDBCRatio(parsedAmounts[Field.OUTPUT] ?? getSingleUnitAmount(currencies[Field.OUTPUT]))

    // }, 30000) // 每30秒更新一次

    // return () => clearInterval(intervalId)
  }, [currencies])

  const fetchWDBCRatio = useCallback(async (currencyAmount?: CurrencyAmount<Currency>) => {
    if (!currencyAmount) {
        console.log('fetchWDBCRatio: currencyAmount为空，直接返回')
        return
    }
    try {
        // console.log('fetchWDBCRatio开始计算:', currencyAmount.currency.symbol)
        const result = await calculateWDBCRatio(currencyAmount)
        if (currencyAmount.currency.symbol === 'DBC') {
            console.log('fetchWDBCRatio计算结果:', result)
        }
        
        if (result && result.ratioNum) {
            const newRatio = {
                ...pairPriceRatio,
                [result.token as string]: result.ratioNum
            }

            setRatio(newRatio)
        }
    } catch (error) {
        console.error('fetchWDBCRatio错误:', error)
    } finally {
      setRatioLoadingPair(
        {
          [currencyAmount.currency.symbol as string]: false
        }
      )
    }
  }, [setRatioLoadingPair, setRatio])


  return (
    <>

      {/* <button onClick={async () => {
        // 首先创建 Token 对象
        const DGC = DGC_DBC
        const SIC = SIC_DBC

        // 创建 CurrencyAmount 对象
        const parsedAmount = CurrencyAmount.fromRawAmount(
          DGC,
          '1000000000000000000' // 1 token，需要考虑 decimals
        )

        const QUOTE_ARGS = {
          // 基础交易参数
          account: "0xde184A6809898D81186DeF5C0823d2107c001Da2",
          amount: "1000000000000000000", // 1 token (18位小数)
          tradeType: 0, // EXACT_INPUT

          // 代币输入参数
          tokenInAddress: "0x18386F368e7C211E84324337fA8f62d5093272E1", // DGC代币地址
          tokenInChainId: 19880818,
          tokenInDecimals: 18,
          tokenInSymbol: "DGC",

          // 代币输出参数
          tokenOutAddress: "0xD7EA4Da7794c7d09bceab4A21a6910D9114Bc936", // WDBC代币地址
          tokenOutChainId: 19880818,
          tokenOutDecimals: 18,
          tokenOutSymbol: "WDBC",

          // 路由相关参数
          routerPreference: INTERNAL_ROUTER_PREFERENCE_PRICE,
          sendPortionEnabled: true,

          // Uniswap X 相关参数 
          needsWrapIfUniswapX: false,
          uniswapXForceSyntheticQuotes: false
        }



        // 支持的协议参数
        const CLIENT_PARAMS = {
          protocols: [Protocol.V2, Protocol.V3, Protocol.MIXED]
        }

        // // 使用示例:
        const router = getRouter(QUOTE_ARGS.tokenInChainId)
        const quoteResult = await getClientSideQuote(QUOTE_ARGS, router, CLIENT_PARAMS)
        console.log("quoteResult:", quoteResult)

      }}>
        测试
      </button> */}

      <TokenSafetyModal
        isOpen={urlTokensNotInDefault.length > 0 && !dismissTokenWarning}
        tokenAddress={urlTokensNotInDefault[0]?.address}
        secondTokenAddress={urlTokensNotInDefault[1]?.address}
        onContinue={handleConfirmTokenWarning}
        onCancel={handleDismissTokenWarning}
        showCancel={true}
      />
      {trade && showConfirm && (
        <ConfirmSwapModal
          trade={trade}
          inputCurrency={inputCurrency}
          originalTrade={tradeToConfirm}
          onAcceptChanges={handleAcceptChanges}
          onCurrencySelection={onCurrencySelection}
          swapResult={swapResult}
          allowedSlippage={allowedSlippage}
          clearSwapState={clearSwapState}
          onConfirm={handleSwap}
          allowance={allowance}
          swapError={swapError}
          onDismiss={handleConfirmDismiss}
          fiatValueInput={fiatValueTradeInput}
          fiatValueOutput={fiatValueTradeOutput}
        />
      )}
      {/* {showPriceImpactModal && showPriceImpactWarning && (
        <PriceImpactModal
          priceImpact={largerPriceImpact}
          onDismiss={() => setShowPriceImpactModal(false)}
          onContinue={() => {
            setShowPriceImpactModal(false)
            handleContinueToReview()
          }}
        />
      )} */}
      <div style={{ display: 'relative' }}>
        <SwapSection>
          <Trace section={InterfaceSectionName.CURRENCY_INPUT_PANEL}>
            <SwapCurrencyInputPanel
              label={<Trans>You pay</Trans>}
              disabled={disableTokenInputs}
              value={formattedAmounts[Field.INPUT]}
              showMaxButton={showMaxButton}
              currency={currencies[Field.INPUT] ?? null}
              onUserInput={handleTypeInput}
              onMax={handleMaxInput}
              fiatValue={showFiatValueInput ? fiatValueInput : undefined}
              onCurrencySelect={handleInputSelect}
              otherCurrency={currencies[Field.OUTPUT]}
              currencySearchFilters={SWAP_FORM_CURRENCY_SEARCH_FILTERS}
              id={InterfaceSectionName.CURRENCY_INPUT_PANEL}
              loading={independentField === Field.OUTPUT && routeIsSyncing}
              ref={inputCurrencyNumericalInputRef}
            />
          </Trace>
        </SwapSection>
        <ArrowWrapper clickable={isSupportedChain(chainId)}>
          <TraceEvent
            events={[BrowserEvent.onClick]}
            name={SwapEventName.SWAP_TOKENS_REVERSED}
            element={InterfaceElementName.SWAP_TOKENS_REVERSE_ARROW_BUTTON}
          >
            <ArrowContainer
              data-testid="swap-currency-button"
              onClick={() => {
                if (disableTokenInputs) return
                onSwitchTokens({
                  newOutputHasTax: inputTokenHasTax,
                  previouslyEstimatedOutput: formattedAmounts[dependentField],
                })
                maybeLogFirstSwapAction(trace)
              }}
              color={theme.neutral1}
            >
              <ArrowDown size="16" color={theme.neutral1} />
            </ArrowContainer>
          </TraceEvent>
        </ArrowWrapper>
      </div>
      <AutoColumn gap="sm">
        <div>
          <OutputSwapSection>
            <Trace section={InterfaceSectionName.CURRENCY_OUTPUT_PANEL}>
              <SwapCurrencyInputPanel
                value={formattedAmounts[Field.OUTPUT]}
                disabled={disableTokenInputs}
                onUserInput={handleTypeOutput}
                label={<Trans>You receive</Trans>}
                showMaxButton={false}
                hideBalance={false}
                fiatValue={showFiatValueOutput ? fiatValueOutput : undefined}
                priceImpact={stablecoinPriceImpact}
                currency={currencies[Field.OUTPUT] ?? null}
                onCurrencySelect={handleOutputSelect}
                otherCurrency={currencies[Field.INPUT]}
                currencySearchFilters={SWAP_FORM_CURRENCY_SEARCH_FILTERS}
                id={InterfaceSectionName.CURRENCY_OUTPUT_PANEL}
                loading={independentField === Field.INPUT && routeIsSyncing}
                numericalInputSettings={{
                  // We disable numerical input here if the selected token has tax, since we cannot guarantee exact_outputs for FOT tokens
                  disabled: inputTokenHasTax || outputTokenHasTax,
                  // Focus the input currency panel if the user tries to type into the disabled output currency panel
                  onDisabledClick: () => inputCurrencyNumericalInputRef.current?.focus(),
                  disabledTooltipBody: (
                    <OutputTaxTooltipBody
                      currencySymbol={currencies[inputTokenHasTax ? Field.INPUT : Field.OUTPUT]?.symbol}
                    />
                  ),
                }}
              />
            </Trace>
          </OutputSwapSection>
        </div>

        {/* {showPriceImpactWarning && <PriceImpactWarning priceImpact={largerPriceImpact} />} */}
        <div>
          {swapIsUnsupported ? (
            <ButtonPrimary $borderRadius="16px" disabled={true}>
              <ThemedText.DeprecatedMain mb="4px">
                <Trans>Unsupported asset</Trans>
              </ThemedText.DeprecatedMain>
            </ButtonPrimary>
          ) : switchingChain ? (
            <ButtonPrimary $borderRadius="16px" disabled={true}>
              <Trans>Connecting to {{ label: getChainInfo(switchingChain)?.label }}</Trans>
            </ButtonPrimary>
          ) : connectionReady && !account ? (
            <TraceEvent
              events={[BrowserEvent.onClick]}
              name={InterfaceEventName.CONNECT_WALLET_BUTTON_CLICKED}
              properties={{ received_swap_quote: getIsReviewableQuote(trade, tradeState, swapInputError) }}
              element={InterfaceElementName.CONNECT_WALLET_BUTTON}
            >
              <ButtonLight onClick={toggleWalletDrawer} fontWeight={535} $borderRadius="16px">
                <Trans>Connect wallet</Trans>
              </ButtonLight>
            </TraceEvent>
          ) : chainId && chainId !== connectedChainId ? (
            <ButtonPrimary
              $borderRadius="16px"
              onClick={async () => {
                try {
                  await switchChain(connector, chainId)
                } catch (error) {
                  if (didUserReject(error)) {
                    // Ignore error, which keeps the user on the previous chain.
                  } else {
                    // TODO(WEB-3306): This UX could be improved to show an error state.
                    throw error
                  }
                }
              }}
            >
              {/* Connect to {getChainInfo(chainId)?.label} */}
              Connect to DBC
            </ButtonPrimary>
          ) : showWrap ? (
            <ButtonPrimary
              $borderRadius="16px"
              disabled={Boolean(wrapInputError)}
              onClick={handleOnWrap}
              fontWeight={535}
              data-testid="wrap-button"
            >
              {wrapInputError ? (
                <WrapErrorText wrapInputError={wrapInputError} />
              ) : wrapType === WrapType.WRAP ? (
                <Trans>Wrap</Trans>
              ) : wrapType === WrapType.UNWRAP ? (
                <Trans>Unwrap</Trans>
              ) : null}
            </ButtonPrimary>
          ) : routeNotFound && userHasSpecifiedInputOutput && !routeIsLoading && !routeIsSyncing ? (
            <GrayCard style={{ textAlign: 'center' }}>
              <ThemedText.DeprecatedMain mb="4px">
                <Trans>Insufficient liquidity for this trade.</Trans>
              </ThemedText.DeprecatedMain>
            </GrayCard>
          ) : (
            <TraceEvent
              events={[BrowserEvent.onClick]}
              name={SharedEventName.ELEMENT_CLICKED}
              element={InterfaceElementName.SWAP_BUTTON}
            >
              <ButtonError
                onClick={() => {
                  showPriceImpactWarning ? setShowPriceImpactModal(true) : handleContinueToReview()
                }}
                id="swap-button"
                data-testid="swap-button"
                disabled={!getIsReviewableQuote(trade, tradeState, swapInputError)}
                error={!swapInputError && priceImpactSeverity > 2 && allowance.state === AllowanceState.ALLOWED}
              >
                <Text fontSize={20}>
                  {swapInputError ? (
                    swapInputError
                  ) : routeIsSyncing || routeIsLoading ? (
                    <Trans>Swap</Trans>
                  ) : priceImpactSeverity > 2 ? (
                    <Trans>Swap anyway</Trans>
                  ) : (
                    <Trans>Swap</Trans>
                  )}
                </Text>
              </ButtonError>
            </TraceEvent>
          )}
          {showDetailsDropdown && (
            <SwapDetailsDropdown
              trade={trade}
              syncing={routeIsSyncing}
              loading={routeIsLoading}
              allowedSlippage={allowedSlippage}
            />
          )}
        </div>
      </AutoColumn>
    </>
  )
}
