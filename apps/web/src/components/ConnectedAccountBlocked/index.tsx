import Column from 'components/Column'
import { BlockedIcon } from 'components/TokenSafety/TokenSafetyIcon'
import { Trans } from 'i18n'
import styled, { useTheme } from 'styled-components'
import { CopyHelper, ExternalLink, ThemedText } from 'theme/components'

import Modal from '../Modal'

const ContentWrapper = styled(Column)`
  align-items: center;
  margin: 32px;
  text-align: center;
  font-size: 12px;
`
interface ConnectedAccountBlockedProps {
  account?: string | null
  isOpen: boolean
}

export default function ConnectedAccountBlocked(props: ConnectedAccountBlockedProps) {
  const theme = useTheme()
  return (
    <Modal isOpen={props.isOpen} onDismiss={Function.prototype()}>
      <ContentWrapper>
        <BlockedIcon size="22px" />
        <ThemedText.DeprecatedLargeHeader lineHeight={2} marginBottom={1} marginTop={1}>
          <Trans>Blocked address</Trans>
        </ThemedText.DeprecatedLargeHeader>
        <ThemedText.DeprecatedDarkGray fontSize={12} marginBottom={12}>
          {props.account}
        </ThemedText.DeprecatedDarkGray>
        <ThemedText.DeprecatedMain fontSize={14} marginBottom={12}>
          <Trans>This address is blocked on the DBCSwap interface because it is associated with one or more</Trans>{' '}
          <ExternalLink href="https://help.uniswap.org/en/articles/6149816">
            <Trans>blocked activities</Trans>
          </ExternalLink>
          .
        </ThemedText.DeprecatedMain>
        <ThemedText.DeprecatedMain fontSize={12}>
          <Trans>If you believe this is an error, please send an email including your address to </Trans>{' '}
        </ThemedText.DeprecatedMain>

        <CopyHelper
          toCopy="compliance@uniswap.org"
          fontSize={14}
          iconSize={16}
          color={theme.accent1}
          iconPosition="right"
        >
          compliance@uniswap.org
        </CopyHelper>
      </ContentWrapper>
    </Modal>
  )
}
