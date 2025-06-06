import { BigNumber } from '@ethersproject/bignumber'
import { useWeb3React } from '@web3-react/core'
import { useRomulusDelegateContract } from 'hooks/useContract'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TypedEvent } from 'uniswap/src/abis/types/common'
import fetchEvents from 'utils/fetchEvents'

type VoteCast = [string, BigNumber, number, BigNumber, string] & {
  voter: string
  proposalId: BigNumber
  support: number
  votes: BigNumber
  reason: string
}

type VoteMap = {
  [proposalId: string]: TypedEvent<
    [string, BigNumber, number, BigNumber, string] & {
      voter: string
      proposalId: BigNumber
      support: number
      votes: BigNumber
      reason: string
    }
  >
}

export const useVoteCasts = () => {
  const { account } = useWeb3React()
  const mountRef = useRef(true)
  const romulusContract = useRomulusDelegateContract()
  const [voteEvents, setVoteEvents] = useState<VoteMap | undefined>(undefined)

  const call = useCallback(async () => {
    if (!romulusContract || !mountRef.current) {
      setVoteEvents(undefined)
      return
    }
    const filter = romulusContract.filters.VoteCast(account, null, null, null, null)
    const voteEvents1 = await fetchEvents<TypedEvent<VoteCast>>(romulusContract, filter, -27000, -18000)
    const voteEvents2 = await fetchEvents<TypedEvent<VoteCast>>(romulusContract, filter, -18000, -9000)
    const voteEvents3 = await fetchEvents<TypedEvent<VoteCast>>(romulusContract, filter, -9000, -1)
    const voteEvents = voteEvents1.concat(voteEvents2).concat(voteEvents3)
    setVoteEvents(
      voteEvents.reduce((acc, event) => {
        acc[event.args.proposalId.toString()] = event
        return acc
      }, {} as VoteMap)
    )
  }, [account, romulusContract])

  useEffect(() => {
    call()
  }, [call])

  useEffect(() => {
    return () => {
      mountRef.current = false
    }
  }, [])
  return voteEvents
}
