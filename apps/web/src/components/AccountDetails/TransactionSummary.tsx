import { Fraction, TradeType } from '@ubeswap/sdk-core'
import { BigNumber } from 'ethers/lib/ethers'
import { Trans } from 'i18n'
import JSBI from 'jsbi'

import { nativeOnChain } from '../../constants/tokens'
import { useCurrency, useToken } from '../../hooks/Tokens'
import useENSName from '../../hooks/useENSName'
import { VoteOption } from '../../state/governance/types'
import {
  AddLiquidityV2PoolTransactionInfo,
  AddLiquidityV3PoolTransactionInfo,
  ApproveTransactionInfo,
  ClaimTransactionInfo,
  CollectFeesTransactionInfo,
  CreateV3PoolTransactionInfo,
  CustomTransactionInfo,
  DelegateTransactionInfo,
  ExactInputSwapTransactionInfo,
  ExactOutputSwapTransactionInfo,
  ExecuteTransactionInfo,
  MigrateV2LiquidityToV3TransactionInfo,
  QueueTransactionInfo,
  RemoveLiquidityV3TransactionInfo,
  SendTransactionInfo,
  TransactionInfo,
  TransactionType,
  VoteTransactionInfo,
  WrapTransactionInfo,
} from '../../state/transactions/types'

function formatAmount(amountRaw: string, decimals: number, sigFigs: number): string {
  return new Fraction(amountRaw, JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(decimals))).toSignificant(sigFigs)
}

function FormattedCurrencyAmount({
  rawAmount,
  symbol,
  decimals,
  sigFigs,
}: {
  rawAmount: string
  symbol: string
  decimals: number
  sigFigs: number
}) {
  return (
    <>
      {formatAmount(rawAmount, decimals, sigFigs)} {symbol}
    </>
  )
}

function FormattedCurrencyAmountManaged({
  rawAmount,
  currencyId,
  sigFigs = 6,
}: {
  rawAmount: string
  currencyId: string
  sigFigs: number
}) {
  const currency = useCurrency(currencyId)
  return currency ? (
    <FormattedCurrencyAmount
      rawAmount={rawAmount}
      decimals={currency.decimals}
      sigFigs={sigFigs}
      symbol={currency.symbol ?? '???'}
    />
  ) : null
}

function ClaimSummary({ info: { recipient, uniAmountRaw } }: { info: ClaimTransactionInfo }) {
  const { ENSName } = useENSName()
  const name = ENSName ?? recipient
  return typeof uniAmountRaw === 'string' ? (
    <Trans>
      Claim <FormattedCurrencyAmount rawAmount={uniAmountRaw} symbol="UNI" decimals={18} sigFigs={4} /> for {{ name }}
    </Trans>
  ) : (
    <Trans>Claim UBE reward for {{ name }}</Trans>
  )
}

function SubmitProposalTransactionSummary() {
  return <Trans>Submit new proposal</Trans>
}

function ApprovalSummary({ info }: { info: ApproveTransactionInfo }) {
  const token = useToken(info.tokenAddress)

  return BigNumber.from(info.amount)?.eq(0) ? (
    <Trans>Revoke {{ sym: token?.symbol }}</Trans>
  ) : (
    <Trans>Approve {{ sym: token?.symbol }}</Trans>
  )
}

function VoteSummary({ info }: { info: VoteTransactionInfo }) {
  const proposalKey = `${info.governorAddress}/${info.proposalId}`
  if (info.reason && info.reason.trim().length > 0) {
    switch (info.decision) {
      case VoteOption.For:
        return <Trans>Vote for proposal {{ proposalKey }}</Trans>
      case VoteOption.Abstain:
        return <Trans>Vote to abstain on proposal {{ proposalKey }}</Trans>
      case VoteOption.Against:
        return <Trans>Vote against proposal {{ proposalKey }}</Trans>
    }
  } else {
    switch (info.decision) {
      case VoteOption.For:
        return (
          <Trans>
            Vote for proposal {{ proposalKey }} with reason &quot;{{ reason: info.reason }}&quot;
          </Trans>
        )
      case VoteOption.Abstain:
        return (
          <Trans>
            Vote to abstain on proposal {{ proposalKey }} with reason &quot;{{ reason: info.reason }}&quot;
          </Trans>
        )
      case VoteOption.Against:
        return (
          <Trans>
            Vote against proposal {{ proposalKey }} with reason &quot;{{ reason: info.reason }}&quot;
          </Trans>
        )
    }
  }
}

function QueueSummary({ info }: { info: QueueTransactionInfo }) {
  const proposalKey = `${info.governorAddress}/${info.proposalId}`
  return <Trans>Queue proposal {{ proposalKey }}.</Trans>
}

function ExecuteSummary({ info }: { info: ExecuteTransactionInfo }) {
  const proposalKey = `${info.governorAddress}/${info.proposalId}`
  return <Trans>Execute proposal {{ proposalKey }}.</Trans>
}

function DelegateSummary({ info: { delegatee } }: { info: DelegateTransactionInfo }) {
  const { ENSName } = useENSName(delegatee)
  const name = ENSName ?? delegatee
  return <Trans>Delegate voting power to {{ name }}</Trans>
}

function WrapSummary({ info: { chainId, currencyAmountRaw, unwrapped } }: { info: WrapTransactionInfo }) {
  const native = chainId ? nativeOnChain(chainId) : undefined

  if (unwrapped) {
    return (
      <Trans>
        Unwrap{' '}
        <FormattedCurrencyAmount
          rawAmount={currencyAmountRaw}
          symbol={native?.wrapped?.symbol ?? 'WETH'}
          decimals={18}
          sigFigs={6}
        />{' '}
        to {{ symbol: native?.symbol ?? 'ETH' }}
      </Trans>
    )
  } else {
    return (
      <Trans>
        Wrap{' '}
        <FormattedCurrencyAmount
          rawAmount={currencyAmountRaw}
          symbol={native?.symbol ?? 'ETH'}
          decimals={18}
          sigFigs={6}
        />{' '}
        to {{ symbol: native?.wrapped?.symbol ?? 'WETH' }}
      </Trans>
    )
  }
}

function DepositLiquidityStakingSummary() {
  // not worth rendering the tokens since you can should no longer deposit liquidity in the staking contracts
  // todo: deprecate and delete the code paths that allow this, show user more information
  return <Trans>Deposit liquidity</Trans>
}

function WithdrawLiquidityStakingSummary() {
  return <Trans>Withdraw deposited liquidity</Trans>
}

function MigrateLiquidityToV3Summary({
  info: { baseCurrencyId, quoteCurrencyId },
}: {
  info: MigrateV2LiquidityToV3TransactionInfo
}) {
  const baseCurrency = useCurrency(baseCurrencyId)
  const quoteCurrency = useCurrency(quoteCurrencyId)

  return (
    <Trans>
      Migrate {{ baseSymbol: baseCurrency?.symbol }}/{{ quoteSymbol: quoteCurrency?.symbol }} liquidity to V3
    </Trans>
  )
}

function CreateV3PoolSummary({ info: { quoteCurrencyId, baseCurrencyId } }: { info: CreateV3PoolTransactionInfo }) {
  const baseCurrency = useCurrency(baseCurrencyId)
  const quoteCurrency = useCurrency(quoteCurrencyId)

  return (
    <Trans>
      Create {{ baseSymbol: baseCurrency?.symbol }}/{{ quoteSymbol: quoteCurrency?.symbol }} V3 pool
    </Trans>
  )
}

function CollectFeesSummary({ info: { currencyId0, currencyId1 } }: { info: CollectFeesTransactionInfo }) {
  const currency0 = useCurrency(currencyId0)
  const currency1 = useCurrency(currencyId1)

  return (
    <Trans>
      Collect {{ symbol0: currency0?.symbol }}/{{ symbol1: currency1?.symbol }} fees
    </Trans>
  )
}

function RemoveLiquidityV3Summary({
  info: { baseCurrencyId, quoteCurrencyId, expectedAmountBaseRaw, expectedAmountQuoteRaw },
}: {
  info: RemoveLiquidityV3TransactionInfo
}) {
  return (
    <Trans>
      Remove{' '}
      <FormattedCurrencyAmountManaged rawAmount={expectedAmountBaseRaw} currencyId={baseCurrencyId} sigFigs={3} /> and{' '}
      <FormattedCurrencyAmountManaged rawAmount={expectedAmountQuoteRaw} currencyId={quoteCurrencyId} sigFigs={3} />
    </Trans>
  )
}

function AddLiquidityV3PoolSummary({
  info: { createPool, quoteCurrencyId, baseCurrencyId },
}: {
  info: AddLiquidityV3PoolTransactionInfo
}) {
  const baseCurrency = useCurrency(baseCurrencyId)
  const quoteCurrency = useCurrency(quoteCurrencyId)

  return createPool ? (
    <Trans>
      Create pool and add {{ baseSymbol: baseCurrency?.symbol }}/{{ quoteSymbol: quoteCurrency?.symbol }} V3 liquidity
    </Trans>
  ) : (
    <Trans>
      Add {{ baseSymbol: baseCurrency?.symbol }}/{{ quoteSymbol: quoteCurrency?.symbol }} V3 liquidity
    </Trans>
  )
}

function AddLiquidityV2PoolSummary({
  info: { quoteCurrencyId, expectedAmountBaseRaw, expectedAmountQuoteRaw, baseCurrencyId },
}: {
  info: AddLiquidityV2PoolTransactionInfo
}) {
  return (
    <Trans>
      Add <FormattedCurrencyAmountManaged rawAmount={expectedAmountBaseRaw} currencyId={baseCurrencyId} sigFigs={3} />{' '}
      and <FormattedCurrencyAmountManaged rawAmount={expectedAmountQuoteRaw} currencyId={quoteCurrencyId} sigFigs={3} />{' '}
      to DBCSwap V2
    </Trans>
  )
}

function SendSummary({ info }: { info: SendTransactionInfo }) {
  return (
    <Trans>
      Sent
      <FormattedCurrencyAmountManaged rawAmount={info.amount} currencyId={info.currencyId} sigFigs={6} /> to{' '}
      {{ recipient: info.recipient }}
    </Trans>
  )
}

function SwapSummary({ info }: { info: ExactInputSwapTransactionInfo | ExactOutputSwapTransactionInfo }) {
  if (info.tradeType === TradeType.EXACT_INPUT) {
    return (
      <Trans>
        Swap exactly{' '}
        <FormattedCurrencyAmountManaged
          rawAmount={info.inputCurrencyAmountRaw}
          currencyId={info.inputCurrencyId}
          sigFigs={6}
        />{' '}
        for{' '}
        <FormattedCurrencyAmountManaged
          rawAmount={info.settledOutputCurrencyAmountRaw ?? info.expectedOutputCurrencyAmountRaw}
          currencyId={info.outputCurrencyId}
          sigFigs={6}
        />
      </Trans>
    )
  } else {
    return (
      <Trans>
        Swap{' '}
        <FormattedCurrencyAmountManaged
          rawAmount={info.expectedInputCurrencyAmountRaw}
          currencyId={info.inputCurrencyId}
          sigFigs={6}
        />{' '}
        for exactly{' '}
        <FormattedCurrencyAmountManaged
          rawAmount={info.outputCurrencyAmountRaw}
          currencyId={info.outputCurrencyId}
          sigFigs={6}
        />
      </Trans>
    )
  }
}

function CustomTransactionSummary({ info }: { info: CustomTransactionInfo }) {
  return <Trans>{info.summary}</Trans>
}

export function TransactionSummary({ info }: { info: TransactionInfo }) {
  switch (info.type) {
    case TransactionType.ADD_LIQUIDITY_V3_POOL:
      return <AddLiquidityV3PoolSummary info={info} />

    case TransactionType.ADD_LIQUIDITY_V2_POOL:
      return <AddLiquidityV2PoolSummary info={info} />

    case TransactionType.CLAIM:
      return <ClaimSummary info={info} />

    case TransactionType.DEPOSIT_LIQUIDITY_STAKING:
      return <DepositLiquidityStakingSummary />

    case TransactionType.WITHDRAW_LIQUIDITY_STAKING:
      return <WithdrawLiquidityStakingSummary />

    case TransactionType.SWAP:
      return <SwapSummary info={info} />

    case TransactionType.APPROVAL:
      return <ApprovalSummary info={info} />

    case TransactionType.VOTE:
      return <VoteSummary info={info} />

    case TransactionType.DELEGATE:
      return <DelegateSummary info={info} />

    case TransactionType.WRAP:
      return <WrapSummary info={info} />

    case TransactionType.CREATE_V3_POOL:
      return <CreateV3PoolSummary info={info} />

    case TransactionType.MIGRATE_LIQUIDITY_V3:
      return <MigrateLiquidityToV3Summary info={info} />

    case TransactionType.COLLECT_FEES:
      return <CollectFeesSummary info={info} />

    case TransactionType.REMOVE_LIQUIDITY_V3:
      return <RemoveLiquidityV3Summary info={info} />

    case TransactionType.QUEUE:
      return <QueueSummary info={info} />

    case TransactionType.EXECUTE:
      return <ExecuteSummary info={info} />

    case TransactionType.SUBMIT_PROPOSAL:
      return <SubmitProposalTransactionSummary />

    case TransactionType.SEND:
      return <SendSummary info={info} />

    case TransactionType.CUSTOM:
      return <CustomTransactionSummary info={info} />
  }
}
