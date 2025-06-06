import { getValidUrlChainName } from 'graphql/data/util'
import { t } from 'i18n'
import { capitalize } from 'tsafe/capitalize'

import { ExploreTab } from './Explore'

export const getExploreTitle = (path?: string) => {
  const parts = path?.split('/').filter((part) => part !== '')
  const tabsToFind: string[] = [ExploreTab.Pools, ExploreTab.Tokens, ExploreTab.Transactions]
  const tab = parts?.find((part) => tabsToFind.includes(part)) ?? ExploreTab.Tokens

  const network = parts?.find((part) => getValidUrlChainName(part)) ?? 'ethereum'

  return t(`Explore top {{tab}} on {{network}} on DBCSwap`, {
    tab,
    network: capitalize(network),
  })
}
