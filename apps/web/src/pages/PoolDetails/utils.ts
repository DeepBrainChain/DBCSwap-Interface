import { PoolData } from 'graphql/data/pools/usePoolData'
import { t } from 'i18n'

export const getPoolDetailPageTitle = (poolData?: PoolData) => {
  const token0Symbol = poolData?.token0.symbol
  const token1Symbol = poolData?.token1.symbol
  const baseTitle = t`Buy, sell, and trade on DBCSwap`
  if (!token0Symbol || !token1Symbol) {
    return baseTitle
  }

  return `${token0Symbol}/${token1Symbol}: ${baseTitle}`
}
