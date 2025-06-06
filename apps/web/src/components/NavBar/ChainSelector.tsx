import { ChainId } from '@ubeswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import { showTestnetsAtom } from 'components/AccountDrawer/TestnetsToggle'
import { ChainLogo } from 'components/Logo/ChainLogo'
import { getConnection } from 'connection'
import { ConnectionType } from 'connection/types'
import { WalletConnectV2 } from 'connection/WalletConnectV2'
import { getChainInfo } from 'constants/chainInfo'
import { getChainPriority, TESTNET_CHAIN_IDS } from 'constants/chains'
import useSelectChain from 'hooks/useSelectChain'
import useSyncChainQuery from 'hooks/useSyncChainQuery'
import { t } from 'i18n'
import { useAtomValue } from 'jotai/utils'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { AlertTriangle } from 'react-feather'
import { css, useTheme } from 'styled-components'
import { getSupportedChainIdsFromWalletConnectSession } from 'utils/getSupportedChainIdsFromWalletConnectSession'

import { DropdownSelector, StyledMenuContent } from 'components/DropdownSelector'
import ChainSelectorRow from './ChainSelectorRow'

const NETWORK_SELECTOR_CHAINS = [ChainId.DBC, ChainId.BNB]

const StyledDropdownButton = css`
  display: flex;
  flex-direction: row;
  padding: 10px 8px;
  background: none;
  gap: 4px;
  border: none;
  & ${StyledMenuContent} {
    gap: 4px;
  }
`

const styledMobileMenuCss = css`
  @media screen and (max-width: ${({ theme }) => theme.breakpoint.xs}px) {
    bottom: 50px;
  }
`

function useWalletSupportedChains(): ChainId[] {
  const { connector } = useWeb3React()
  const connectionType = getConnection(connector).type

  switch (connectionType) {
    case ConnectionType.WALLET_CONNECT_V2:
    case ConnectionType.UNISWAP_WALLET_V2:
      return getSupportedChainIdsFromWalletConnectSession((connector as WalletConnectV2).provider?.session)
    default:
      return NETWORK_SELECTOR_CHAINS
  }
}

export const ChainSelector = ({ leftAlign }: { leftAlign?: boolean }) => {
  const { chainId } = useWeb3React()
  const [isOpen, setIsOpen] = useState<boolean>(false)

  const theme = useTheme()

  const showTestnets = useAtomValue(showTestnetsAtom)
  const walletSupportsChain = useWalletSupportedChains()

  const [supportedChains, unsupportedChains] = useMemo(() => {
    const { supported, unsupported } = NETWORK_SELECTOR_CHAINS.filter((chain: number) => {
      return showTestnets || !TESTNET_CHAIN_IDS.includes(chain)
    })
      .sort((a, b) => getChainPriority(a) - getChainPriority(b))
      .reduce(
        (acc, chain) => {
          if (walletSupportsChain.includes(chain)) {
            acc.supported.push(chain)
          } else {
            acc.unsupported.push(chain)
          }
          return acc
        },
        { supported: [], unsupported: [] } as Record<string, ChainId[]>
      )
    return [supported, unsupported]
  }, [showTestnets, walletSupportsChain])

  const info = getChainInfo(chainId)

  const selectChain = useSelectChain()
  useSyncChainQuery()

  const [pendingChainId, setPendingChainId] = useState<ChainId | undefined>(undefined)

  const onSelectChain = useCallback(
    async (targetChainId: ChainId) => {
      setPendingChainId(targetChainId)
      await selectChain(targetChainId)
      setPendingChainId(undefined)
      setIsOpen(false)
    },
    [selectChain, setIsOpen]
  )

  useEffect(() => {
    // console.log('chainId', chainId, NETWORK_SELECTOR_CHAINS)
    if (chainId && !NETWORK_SELECTOR_CHAINS.includes(chainId)) {
      onSelectChain(NETWORK_SELECTOR_CHAINS[0])
    }
  }, [chainId, onSelectChain])

  const isSupported = !!info

  const styledMenuCss = css`
    ${leftAlign ? 'left: 0;' : 'right: 0;'}
    ${styledMobileMenuCss};
  `

  // 仅在下拉菜单中显示DBC链，过滤掉BNB链
  const filteredSupportedChains = supportedChains.filter(chain => chain === ChainId.DBC)
  const filteredUnsupportedChains = unsupportedChains.filter(chain => chain === ChainId.DBC)

  // 安全的chainId，用于ChainLogo组件
  const safeChainId = chainId ?? ChainId.DBC

  return (
    <DropdownSelector
      isOpen={isOpen}
      toggleOpen={() => setIsOpen(!isOpen)}
      menuLabel={
        !isSupported ? (
          <AlertTriangle size={20} color={theme.neutral2} />
        ) : (
          <ChainLogo chainId={safeChainId as ChainId} size={20} style={{ borderRadius: '3px' }} testId="chain-selector-logo" />
        )
      }
      tooltipText={isSupported ? undefined : t`Your wallet's current network is unsupported.`}
      dataTestId="chain-selector"
      optionsContainerTestId="chain-selector-options"
      internalMenuItems={
        <>
          {filteredSupportedChains.map((selectorChain) => (
            <ChainSelectorRow
              disabled={!walletSupportsChain.includes(selectorChain)}
              onSelectChain={onSelectChain}
              targetChain={selectorChain}
              key={selectorChain}
              isPending={selectorChain === pendingChainId}
            />
          ))}
          {filteredUnsupportedChains.map((selectorChain) => (
            <ChainSelectorRow
              disabled
              onSelectChain={() => undefined}
              targetChain={selectorChain}
              key={selectorChain}
              isPending={false}
            />
          ))}
        </>
      }
      buttonCss={StyledDropdownButton}
      menuFlyoutCss={styledMenuCss}
    />
  )
}
