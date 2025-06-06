import { useWeb3React } from '@web3-react/core'
import { t } from 'i18n'
import { ArrowUpCircle } from 'react-feather'
import styled, { useTheme } from 'styled-components'
import { ExplorerDataType, getExplorerLink } from 'utils/getExplorerLink'

import { CloseIcon, CustomLightSpinner, ExternalLink, ThemedText } from 'theme/components'
import Circle from '../../assets/images/blue-loader.svg'
import { AutoColumn, ColumnCenter } from '../Column'
import { RowBetween } from '../Row'

const ConfirmOrLoadingWrapper = styled.div`
  width: 100%;
  padding: 24px;
`

const ConfirmedIcon = styled(ColumnCenter)`
  padding: 60px 0;
`

export function LoadingView({ children, onDismiss }: { children: any; onDismiss: () => void }) {
  return (
    <ConfirmOrLoadingWrapper>
      <RowBetween>
        <div />
        <CloseIcon onClick={onDismiss} />
      </RowBetween>
      <ConfirmedIcon>
        <CustomLightSpinner src={Circle} alt="loader" size="90px" />
      </ConfirmedIcon>
      <AutoColumn gap="100px" justify="center">
        {children}
        <ThemedText.DeprecatedSubHeader>{t('Confirm this transaction in your wallet')}</ThemedText.DeprecatedSubHeader>
      </AutoColumn>
    </ConfirmOrLoadingWrapper>
  )
}

export function SubmittedView({
  children,
  onDismiss,
  hash,
}: {
  children: any
  onDismiss: () => void
  hash: string | undefined
}) {
  const theme = useTheme()
  const { chainId } = useWeb3React()
  const explorerLink = chainId && hash ? getExplorerLink(chainId, hash, ExplorerDataType.TRANSACTION) : ''

  return (
    <ConfirmOrLoadingWrapper>
      <RowBetween>
        <div />
        <CloseIcon onClick={onDismiss} />
      </RowBetween>
      <ConfirmedIcon>
        <ArrowUpCircle strokeWidth={0.5} size={90} color={theme.primary1} />
      </ConfirmedIcon>
      <AutoColumn gap="100px" justify="center">
        {children}
        {chainId && hash && (
          <ExternalLink href={explorerLink} style={{ marginLeft: '4px' }}>
            <ThemedText.DeprecatedSubHeader>{t('View transaction on DBC Explorer')}</ThemedText.DeprecatedSubHeader>
          </ExternalLink>
        )}
      </AutoColumn>
    </ConfirmOrLoadingWrapper>
  )
}
