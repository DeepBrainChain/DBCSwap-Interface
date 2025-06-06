import { OperationVariables, QueryResult } from '@apollo/client'
import { DeepPartial } from '@apollo/client/utilities'
import * as Sentry from '@sentry/react'
import { ChainId, Currency, Token } from '@ubeswap/sdk-core'
import { AVERAGE_L1_BLOCK_TIME } from 'constants/chainInfo'
import { NATIVE_CHAIN_ID, WRAPPED_NATIVE_CURRENCY, nativeOnChain } from 'constants/tokens'
import ms from 'ms'
import { ExploreTab } from 'pages/Explore'
import { useEffect } from 'react'
import { DefaultTheme } from 'styled-components'
import { ThemeColors } from 'theme/colors'
import {
  Chain,
  ContractInput,
  Token as GqlToken,
  HistoryDuration,
  PriceSource,
  TokenStandard,
} from 'uniswap/src/data/graphql/uniswap-data-api/__generated__/types-and-hooks'
import { getNativeTokenDBAddress } from 'utils/nativeTokens'

export enum PollingInterval {
  Slow = ms(`5m`),
  Normal = ms(`1m`),
  Fast = AVERAGE_L1_BLOCK_TIME,
  LightningMcQueen = ms(`3s`), // approx block interval for polygon
}

// Polls a query only when the current component is mounted, as useQuery's pollInterval prop will continue to poll after unmount
export function usePollQueryWhileMounted<T, K extends OperationVariables>(
  queryResult: QueryResult<T, K>,
  interval: PollingInterval
) {
  const { startPolling, stopPolling } = queryResult

  useEffect(() => {
    startPolling(interval)
    return stopPolling
  }, [interval, startPolling, stopPolling])

  return queryResult
}

export enum TimePeriod {
  HOUR,
  DAY,
  WEEK,
  MONTH,
  YEAR,
}

export function toHistoryDuration(timePeriod: TimePeriod): HistoryDuration {
  switch (timePeriod) {
    case TimePeriod.HOUR:
      return HistoryDuration.Hour
    case TimePeriod.DAY:
      return HistoryDuration.Day
    case TimePeriod.WEEK:
      return HistoryDuration.Week
    case TimePeriod.MONTH:
      return HistoryDuration.Month
    case TimePeriod.YEAR:
      return HistoryDuration.Year
  }
}

export type PricePoint = { timestamp: number; value: number }

export function isPricePoint(p: PricePoint | undefined): p is PricePoint {
  return p !== undefined
}

const GQL_MAINNET_CHAINS = [
  Chain.Ethereum,
  Chain.Polygon,
  Chain.Celo,
  Chain.Optimism,
  Chain.Arbitrum,
  Chain.Bnb,
  Chain.Avalanche,
  Chain.Base,
  Chain.Blast,
  Chain.DBC,
] as const

/** Used for making graphql queries to all chains supported by the graphql backend. Must be mutable for some apollo typechecking. */
export const GQL_MAINNET_CHAINS_MUTABLE = [Chain.DBC]

const GQL_TESTNET_CHAINS = [Chain.EthereumGoerli, Chain.EthereumSepolia, Chain.DBCTEST] as const

const UX_SUPPORTED_GQL_CHAINS = [...GQL_MAINNET_CHAINS, ...GQL_TESTNET_CHAINS] as const
type InterfaceGqlChain = (typeof UX_SUPPORTED_GQL_CHAINS)[number]

export const CHAIN_ID_TO_BACKEND_NAME: { [key: number]: InterfaceGqlChain } = {
  [ChainId.MAINNET]: Chain.Ethereum,
  [ChainId.GOERLI]: Chain.EthereumGoerli,
  [ChainId.SEPOLIA]: Chain.EthereumSepolia,
  [ChainId.POLYGON]: Chain.Polygon,
  [ChainId.POLYGON_MUMBAI]: Chain.Polygon,
  [ChainId.CELO]: Chain.Celo,
  [ChainId.CELO_ALFAJORES]: Chain.Celo,
  [ChainId.ARBITRUM_ONE]: Chain.Arbitrum,
  [ChainId.ARBITRUM_GOERLI]: Chain.Arbitrum,
  [ChainId.OPTIMISM]: Chain.Optimism,
  [ChainId.OPTIMISM_GOERLI]: Chain.Optimism,
  [ChainId.BNB]: Chain.Bnb,
  [ChainId.AVALANCHE]: Chain.Avalanche,
  [ChainId.BASE]: Chain.Base,
  [ChainId.BLAST]: Chain.Blast,
  [ChainId.DBC]: Chain.DBC,
}


export function chainIdToBackendName(chainId: number | undefined) {
  return chainId && CHAIN_ID_TO_BACKEND_NAME[chainId]
    ? CHAIN_ID_TO_BACKEND_NAME[chainId]
    : CHAIN_ID_TO_BACKEND_NAME[ChainId.CELO]
}

const GQL_CHAINS = [ChainId.MAINNET, ChainId.OPTIMISM, ChainId.POLYGON, ChainId.ARBITRUM_ONE, ChainId.CELO] as const
type GqlChainsType = (typeof GQL_CHAINS)[number]

export function isGqlSupportedChain(chainId: number | undefined): chainId is GqlChainsType {
  return !!chainId && GQL_CHAINS.includes(chainId)
}

export function toContractInput(currency: Currency): ContractInput {
  const chain = chainIdToBackendName(currency.chainId)
  return { chain, address: currency.isToken ? currency.address : getNativeTokenDBAddress(chain) }
}

export function gqlToCurrency(token: DeepPartial<GqlToken>): Currency | undefined {
  if (!token.chain) return undefined
  const chainId = supportedChainIdFromGQLChain(token.chain)
  if (!chainId) return undefined
  if (token.standard === TokenStandard.Native || token.address === NATIVE_CHAIN_ID || !token.address)
    return nativeOnChain(chainId)
  else
    return new Token(
      chainId,
      token.address,
      token.decimals ?? 18,
      token.symbol ?? undefined,
      token.name ?? token.project?.name ?? undefined
    )
}

const URL_CHAIN_PARAM_TO_BACKEND: { [key: string]: InterfaceGqlChain } = {
  ethereum: Chain.Ethereum,
  polygon: Chain.Polygon,
  celo: Chain.Celo,
  arbitrum: Chain.Arbitrum,
  optimism: Chain.Optimism,
  bnb: Chain.Bnb,
  avalanche: Chain.Avalanche,
  base: Chain.Base,
  blast: Chain.Blast,
}

/**
 * @param chainName parsed in chain name from url query parameter
 * @returns if chainName is a valid chain name, returns the backend chain name, otherwise returns undefined
 */
export function getValidUrlChainName(chainName: string | undefined): Chain | undefined {
  const validChainName = chainName && URL_CHAIN_PARAM_TO_BACKEND[chainName]
  return validChainName ? validChainName : undefined
}

/**
 * @param chainName parsed in chain name from the url query parameter
 * @returns if chainName is a valid chain name, returns the ChainId, otherwise returns undefined
 */
export function getValidUrlChainId(chainName: string | undefined): ChainId | undefined {
  const validChainName = chainName && URL_CHAIN_PARAM_TO_BACKEND[chainName]
  return validChainName ? supportedChainIdFromGQLChain(validChainName) : undefined
}

/**
 * @param chainName parsed in chain name from url query parameter
 * @returns if chainName is a valid chain name supported by the backend, returns the backend chain name, otherwise returns Chain.Ethereum
 */
export function validateUrlChainParam(chainName: string | undefined) {
  const isValidChainName = chainName && URL_CHAIN_PARAM_TO_BACKEND[chainName]
  const isValidBackEndChain =
    isValidChainName && (BACKEND_SUPPORTED_CHAINS as ReadonlyArray<Chain>).includes(isValidChainName)
  return isValidBackEndChain ? URL_CHAIN_PARAM_TO_BACKEND[chainName] : Chain.Celo
}

const CHAIN_NAME_TO_CHAIN_ID: { [key in InterfaceGqlChain]: ChainId } = {
  [Chain.Ethereum]: ChainId.MAINNET,
  [Chain.EthereumGoerli]: ChainId.GOERLI,
  [Chain.EthereumSepolia]: ChainId.SEPOLIA,
  [Chain.Polygon]: ChainId.POLYGON,
  [Chain.Celo]: ChainId.CELO,
  [Chain.Optimism]: ChainId.OPTIMISM,
  [Chain.Arbitrum]: ChainId.ARBITRUM_ONE,
  [Chain.Bnb]: ChainId.BNB,
  [Chain.Avalanche]: ChainId.AVALANCHE,
  [Chain.Base]: ChainId.BASE,
  [Chain.Blast]: ChainId.BLAST,
  [Chain.DBC]: ChainId.DBC,
  [Chain.DBCTEST]: ChainId.DBCTEST,
}

export function isSupportedGQLChain(chain: Chain): chain is InterfaceGqlChain {
  return (UX_SUPPORTED_GQL_CHAINS as ReadonlyArray<Chain>).includes(chain)
}

export function supportedChainIdFromGQLChain(chain: InterfaceGqlChain): ChainId
export function supportedChainIdFromGQLChain(chain: Chain): ChainId | undefined
export function supportedChainIdFromGQLChain(chain: Chain): ChainId | undefined {
  return isSupportedGQLChain(chain) ? CHAIN_NAME_TO_CHAIN_ID[chain] : undefined
}

export function logSentryErrorForUnsupportedChain({
  extras,
  errorMessage,
}: {
  extras?: Record<string, any>
  errorMessage: string
}) {
  Sentry.withScope((scope) => {
    extras &&
      Object.entries(extras).map(([k, v]) => {
        scope.setExtra(k, v)
      })
    Sentry.captureException(new Error(errorMessage))
  })
}

export const BACKEND_SUPPORTED_CHAINS = [
  // Chain.Ethereum,
  // Chain.Arbitrum,
  // Chain.Optimism,
  // Chain.Polygon,
  // Chain.Base,
  // Chain.Bnb,
  // Chain.Celo,
  Chain.DBC,
  // Chain.Blast,
] as const
export const BACKEND_NOT_YET_SUPPORTED_CHAIN_IDS = [ChainId.AVALANCHE] as const

export function isBackendSupportedChain(chain: Chain): chain is InterfaceGqlChain {
  return (BACKEND_SUPPORTED_CHAINS as ReadonlyArray<Chain>).includes(chain)
}

export function getTokenExploreURL({ tab, chain }: { tab: ExploreTab; chain: Chain }) {
  const chainName = chain.toLowerCase()
  return `/explore/${tab}/${chainName}`
}

export function getTokenDetailsURL({
  address,
  chain,
  inputAddress,
}: {
  address?: string | null
  chain: Chain
  inputAddress?: string | null
}) {
  const chainName = chain.toLowerCase()
  const tokenAddress = address ?? NATIVE_CHAIN_ID
  const inputAddressSuffix = inputAddress ? `?inputCurrency=${inputAddress}` : ''
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const rt = `/explore/tokens/${chainName}/${tokenAddress}${inputAddressSuffix}`
  return ''
}

export function getPoolDetailsURL(address: string, chain: Chain) {
  const chainName = chain.toLowerCase()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const rt = `/explore/pools/${chainName}/${address}`
  return ''
}

export function unwrapToken<
  T extends
    | {
        address?: string | null
      }
    | undefined
>(chainId: number, token: T): T {
  if (!token?.address) return token

  const address = token.address.toLowerCase()
  const nativeAddress = WRAPPED_NATIVE_CURRENCY[chainId]?.address.toLowerCase()
  if (address !== nativeAddress) return token

  const nativeToken = nativeOnChain(chainId)
  return {
    ...token,
    ...nativeToken,
    address: NATIVE_CHAIN_ID,
    extensions: undefined, // prevents marking cross-chain wrapped tokens as native
  }
}

type ProtocolMeta = { name: string; color: keyof ThemeColors }
const PROTOCOL_META: { [source in PriceSource]: ProtocolMeta } = {
  [PriceSource.SubgraphV2]: { name: 'v2', color: 'accent3' },
  [PriceSource.SubgraphV3]: { name: 'v3', color: 'accent1' },
  /* [PriceSource.UniswapX]: { name: 'UniswapX', color: purple } */
}

export function getProtocolColor(priceSource: PriceSource, theme: DefaultTheme): string {
  return theme[PROTOCOL_META[priceSource].color]
}

export function getProtocolName(priceSource: PriceSource): string {
  return PROTOCOL_META[priceSource].name
}

export enum OrderDirection {
  Asc = 'asc',
  Desc = 'desc',
}
