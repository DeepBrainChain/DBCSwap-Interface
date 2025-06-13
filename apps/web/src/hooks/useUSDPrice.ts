import { NetworkStatus } from '@apollo/client'
import { ChainId, Currency, CurrencyAmount, Price, TradeType, Token } from '@ubeswap/sdk-core'
import { nativeOnChain } from 'constants/tokens'
import { USDT, USDT_ARBITRUM_ONE, USDT_OPTIMISM, USDT_POLYGON, USDT_CELO, USDT_DBC, USDT_BSC, USDT_AVALANCHE } from 'constants/tokens'
import { PollingInterval, chainIdToBackendName, isGqlSupportedChain } from 'graphql/data/util'
import { useMemo } from 'react'
import { ClassicTrade, INTERNAL_ROUTER_PREFERENCE_PRICE, TradeState } from 'state/routing/types'
import { useRoutingAPITrade } from 'state/routing/useRoutingAPITrade'
import { Chain, useTokenSpotPriceQuery } from 'uniswap/src/data/graphql/uniswap-data-api/__generated__/types-and-hooks'
import { getNativeTokenDBAddress } from 'utils/nativeTokens'

import useIsWindowVisible from './useIsWindowVisible'
import useStablecoinPrice from './useStablecoinPrice'

// ETH amounts used when calculating spot price for a given currency.
// The amount is large enough to filter low liquidity pairs.
const ETH_AMOUNT_OUT: { [chainId: number]: CurrencyAmount<Currency> } = {
  [ChainId.MAINNET]: CurrencyAmount.fromRawAmount(nativeOnChain(ChainId.MAINNET), 50e18),
  [ChainId.ARBITRUM_ONE]: CurrencyAmount.fromRawAmount(nativeOnChain(ChainId.ARBITRUM_ONE), 10e18),
  [ChainId.OPTIMISM]: CurrencyAmount.fromRawAmount(nativeOnChain(ChainId.OPTIMISM), 10e18),
  [ChainId.POLYGON]: CurrencyAmount.fromRawAmount(nativeOnChain(ChainId.POLYGON), 10_000e18),
  [ChainId.CELO]: CurrencyAmount.fromRawAmount(nativeOnChain(ChainId.CELO), 10e18),
}

function useETHPrice(currency?: Currency): {
  data?: Price<Currency, Currency>
  isLoading: boolean
} {
  const chainId = currency?.chainId
  const isSupported = currency && isGqlSupportedChain(chainId)

  const amountOut = isSupported ? ETH_AMOUNT_OUT[chainId] : undefined
  const { trade, state } = useRoutingAPITrade(
    !isSupported /* skip */,
    TradeType.EXACT_OUTPUT,
    amountOut,
    currency,
    INTERNAL_ROUTER_PREFERENCE_PRICE
  )

  return useMemo(() => {
    if (!isSupported) {
      return { data: undefined, isLoading: false }
    }

    if (currency?.wrapped.equals(nativeOnChain(chainId).wrapped)) {
      return {
        data: new Price(currency, currency, '1', '1'),
        isLoading: false,
      }
    }

    if (!trade || state === TradeState.LOADING) {
      return { data: undefined, isLoading: state === TradeState.LOADING }
    }

    // if initial quoting fails, we may end up with a DutchOrderTrade
    if (trade && trade instanceof ClassicTrade) {
      const { numerator, denominator } = trade.routes[0].midPrice
      const price = new Price(currency, nativeOnChain(chainId), denominator, numerator)
      return { data: price, isLoading: false }
    }

    return { data: undefined, isLoading: false }
  }, [chainId, currency, isSupported, state, trade])
}

// 获取链对应的USDT代币
function getUSDTToken(chainId?: ChainId): Token | undefined {
  if (!chainId) return undefined
  
  switch (chainId) {
    case ChainId.MAINNET:
      return USDT
    case ChainId.ARBITRUM_ONE:
      return USDT_ARBITRUM_ONE
    case ChainId.OPTIMISM:
      return USDT_OPTIMISM
    case ChainId.POLYGON:
      return USDT_POLYGON
    case ChainId.CELO:
      return USDT_CELO
    case ChainId.DBC:
      return USDT_DBC
    case ChainId.BNB:
      return USDT_BSC
    case ChainId.AVALANCHE:
      return USDT_AVALANCHE
    default:
      return undefined
  }
}

export function useUSDPrice(
  currencyAmount?: CurrencyAmount<Currency>,
  prefetchCurrency?: Currency
): {
  data?: number
  isLoading: boolean
} {
  const currency = currencyAmount?.currency ?? prefetchCurrency
  const chainId = currency?.chainId
  
  // 获取当前链上的USDT代币
  const usdtToken = getUSDTToken(chainId)
  
  // 跳过所有价格请求，如果窗口未聚焦
  const isWindowVisible = useIsWindowVisible()

  // 创建一个CurrencyAmount，用于查询
  const amountToUse = currencyAmount ?? (currency ? CurrencyAmount.fromRawAmount(currency, '1000000') : undefined)
  
  // 使用useRoutingAPITrade获取当前代币兑换USDT的交易
  const { trade, state } = useRoutingAPITrade(
    !amountToUse || !usdtToken || !isWindowVisible, // 如果没有金额或USDT代币或窗口不可见则跳过
    TradeType.EXACT_INPUT,
    amountToUse,
    usdtToken,
    INTERNAL_ROUTER_PREFERENCE_PRICE
  )

  return useMemo(() => {
    if (!currencyAmount || !usdtToken) {
      return { data: undefined, isLoading: false }
    }
    
    // 如果货币是USDT本身，直接返回金额
    if (currency?.wrapped.equals(usdtToken.wrapped)) {
      return {
        data: parseFloat(currencyAmount.toExact()),
        isLoading: false,
      }
    }

    // 如果交易加载中或没有路由
    if (state === TradeState.LOADING) {
      return { data: undefined, isLoading: true }
    }
    
    if (state === TradeState.NO_ROUTE_FOUND) {
      return { data: undefined, isLoading: false }
    }

    // 如果有交易结果且是ClassicTrade类型
    if (trade && trade instanceof ClassicTrade) {
      // 获取输出金额
      const outputAmount = trade.outputAmount
      return { 
        data: parseFloat(outputAmount.toExact()),
        isLoading: false 
      }
    }

    // 回退到使用stablecoinPrice
    const stablecoinPrice = useStablecoinPrice(currency)
    if (stablecoinPrice) {
      return { data: parseFloat(stablecoinPrice.quote(currencyAmount).toSignificant()), isLoading: false }
    }

    return { data: undefined, isLoading: false }
  }, [currencyAmount, currency, usdtToken, trade, state])
}