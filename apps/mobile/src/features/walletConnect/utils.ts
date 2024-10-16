import { WalletKitTypes } from '@reown/walletkit'
import { PairingTypes, ProposalTypes, SessionTypes, SignClientTypes } from '@walletconnect/types'
import { utils } from 'ethers'
import { wcWeb3Wallet } from 'src/features/walletConnect/saga'
import { SignRequest, TransactionRequest } from 'src/features/walletConnect/walletConnectSlice'
import { toSupportedChainId } from 'uniswap/src/features/chains/utils'
import { UniverseChainId } from 'uniswap/src/types/chains'
import { EthMethod, EthSignMethod } from 'uniswap/src/types/walletConnect'
import { logger } from 'utilities/src/logger/logger'

/**
 * Construct WalletConnect 2.0 session namespaces to complete a new pairing. Used when approving a new pairing request.
 * Assumes each namespace has been validated and is supported by the app with `validateProposalNamespaces()`.
 *
 * @param {Address} account address of account to complete WalletConnect pairing request
 * @param {ProposalTypes.RequiredNamespaces} proposalNamespaces validated proposal namespaces that specify all supported chains, methods, events for the session
 * @return {SessionTypes.Namespaces} session namespaces specifying which accounts, chains, methods, events to complete the pairing
 */
export const getSessionNamespaces = (
  account: Address,
  proposalNamespaces: ProposalTypes.RequiredNamespaces,
): SessionTypes.Namespaces => {
  // Below inspired from https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/views/SessionProposalModal.tsx#L63
  const namespaces: SessionTypes.Namespaces = {}

  Object.entries(proposalNamespaces).forEach(([key, namespace]) => {
    const { chains, events, methods } = namespace
    namespaces[key] = {
      accounts: chains ? chains.map((chain) => `${chain}:${account}`) : [`${key}:${account}`],
      events,
      methods,
      chains,
    }
  })

  return namespaces
}

/**
 * Convert list of chains from a WalletConnect namespace to a list of supported ChainIds
 * @param {string[]} chains list of chain strings as received from WalletConnect (ex. "eip155:1")
 * @returns {UniverseChainId[]} list of supported ChainIds
 */
export const getSupportedWalletConnectChains = (chains?: string[]): UniverseChainId[] | undefined => {
  if (!chains) {
    return undefined
  }

  return chains.map((chain) => getChainIdFromEIP155String(chain)).filter((c): c is UniverseChainId => Boolean(c))
}

/**
 * Convert chain from `eip155:[CHAIN_ID]` format to supported ChainId.
 * Returns null if chain doesn't match correct `eip155:` format or is an unsupported chain.
 */
export const getChainIdFromEIP155String = (chain: string): UniverseChainId | null => {
  const chainStr = chain.startsWith('eip155:') ? chain.split(':')[1] : undefined
  return toSupportedChainId(chainStr)
}

/**
 * Convert account from `eip155:[CHAIN_ID]:[ADDRESS]` format to account address.
 * Returns null if string doesn't match correct `eip155:chainId:address` forma.
 */
export const getAccountAddressFromEIP155String = (account: string): Address | null => {
  const address = account.startsWith('eip155:') ? account.split(':')[2] : undefined
  if (!address) {
    return null
  }
  return address
}

/**
 * Formats SignRequest object from WalletConnect 2.0 request parameters
 *
 * @param {EthSignMethod} method type of method to sign
 * @param {string} topic id for the WalletConnect session
 * @param {number} internalId id for the WalletConnect signature request
 * @param {ChainId} chainId chain the signature is being requested on
 * @param {SignClientTypes.Metadata} dapp metadata for the dapp requesting the signature
 * @param {WalletKitTypes.SessionRequest['params']['request']['params']} requestParams parameters of the request
 * @returns {{Address, SignRequest}} address of the account receiving the request and formatted SignRequest object
 */
export const parseSignRequest = (
  method: EthSignMethod,
  topic: string,
  internalId: number,
  chainId: UniverseChainId,
  dapp: SignClientTypes.Metadata,
  requestParams: WalletKitTypes.SessionRequest['params']['request']['params'],
): { account: Address; request: SignRequest } => {
  const { address, rawMessage, message } = getAddressAndMessageToSign(method, requestParams)
  return {
    account: address,
    request: {
      type: method,
      sessionId: topic,
      internalId: String(internalId),
      rawMessage,
      message,
      account: address,
      chainId,
      dapp: {
        name: dapp.name,
        url: dapp.url,
        icon: dapp.icons[0] ?? null,
        source: 'walletconnect',
      },
    },
  }
}

/**
 * Formats TransactionRequest object from WalletConnect 2.0 request parameters.
 * Only supports `eth_sendTransaction` request, `eth_signTransaction` is intentionally
 * unsupported since it is difficult to support to nonce calculation and tracking.
 *
 * @param {EthMethod.EthSendTransaction} method type of method to sign (only support `eth_signTransaction`)
 * @param {string} topic id for the WalletConnect session
 * @param {number} internalId id for the WalletConnect transaction request
 * @param {UniverseChainId} chainId chain the signature is being requested on
 * @param {SignClientTypes.Metadata} dapp metadata for the dapp requesting the transaction
 * @param {WalletKitTypes.SessionRequest['params']['request']['params']} requestParams parameters of the request
 * @returns {{Address, TransactionRequest}} address of the account receiving the request and formatted TransactionRequest object
 */
export const parseTransactionRequest = (
  method: EthMethod.EthSendTransaction,
  topic: string,
  internalId: number,
  chainId: UniverseChainId,
  dapp: SignClientTypes.Metadata,
  requestParams: WalletKitTypes.SessionRequest['params']['request']['params'],
): { account: Address; request: TransactionRequest } => {
  // Omit gasPrice and nonce in tx sent from dapp since it is calculated later
  const { from, to, data, gasLimit, value } = requestParams[0]

  return {
    account: from,
    request: {
      type: method,
      sessionId: topic,
      internalId: String(internalId),
      transaction: {
        to,
        from,
        value,
        data,
        gasLimit,
      },
      account: from,
      chainId,
      dapp: {
        name: dapp.name,
        url: dapp.url,
        icon: dapp.icons[0] ?? null,
        source: 'walletconnect',
      },
    },
  }
}

export function isHexString(value: string): boolean {
  // Check if it starts with '0x' and has an even length after the prefix
  return /^0x[0-9a-fA-F]+$/.test(value)
}

export function decodeMessage(value: string): string {
  if (isHexString(value)) {
    try {
      return utils.toUtf8String(value)
    } catch (error) {
      logger.error(error, {
        tags: { file: 'walletConnect/util.ts', function: 'decodeMessage' },
      })

      return value
    }
  } else {
    return value
  }
}

/**
 * Gets the address receiving the request, raw message, decoded message to sign based on the EthSignMethod.
 * `personal_sign` params are ordered as [message, account]
 * `eth_sign` params are ordered as [account, message]
 * `signTypedData` params are ordered as [account, message]
 * See https://docs.walletconnect.com/2.0/advanced/rpc-reference/ethereum-rpc#personal_sign
 */
// eslint-disable-next-line consistent-return
export function getAddressAndMessageToSign(
  ethMethod: EthSignMethod,
  params: WalletKitTypes.SessionRequest['params']['request']['params'],
): { address: string; rawMessage: string; message: string | null } {
  switch (ethMethod) {
    case EthMethod.PersonalSign:
      return { address: params[1], rawMessage: params[0], message: decodeMessage(params[0]) }
    case EthMethod.EthSign:
      return { address: params[0], rawMessage: params[1], message: utils.toUtf8String(params[1]) }
    case EthMethod.SignTypedData:
    case EthMethod.SignTypedDataV4:
      return { address: params[0], rawMessage: params[1], message: null }
  }
}

export async function pairWithWalletConnectURI(uri: string): Promise<void | PairingTypes.Struct> {
  try {
    return await wcWeb3Wallet.pair({ uri })
  } catch (error) {
    logger.error(error, {
      tags: { file: 'walletConnectV2/utils', function: 'pairWithWalletConnectURI' },
    })

    return Promise.reject(error instanceof Error ? error.message : '')
  }
}