import { useJoinCampaign } from '@/campaign-play/hooks/useJoinCampaign'
import type { JoinOutcome } from '@/campaign-play/types/JoinResult'
import { Button } from '@/shared/components/ui/button'

interface JoinCampaignProps {
  token: string
}

const rejectionMessages: Partial<Record<JoinOutcome, string>> = {
  LimitReached: 'This Campaign is full. Ask the Keeper for a spot.',
  InvalidInvite: 'This invite link is no longer valid. Ask the Keeper for a new one.',
  KeeperCannotJoin: 'You are the Keeper of this Campaign, so you cannot join as a Player.',
}

/** Lets a signed-in Account join a Campaign through an Invite token and reports the outcome. */
export function JoinCampaign({ token }: JoinCampaignProps) {
  const join = useJoinCampaign()
  const outcome = join.data?.outcome

  return (
    <section className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">Join a Campaign</h1>

      <Button type="button" disabled={join.isPending} onClick={() => join.mutate(token)}>
        {join.isPending ? 'Joining…' : 'Join this Campaign'}
      </Button>

      {(outcome === 'Joined' || outcome === 'AlreadyMember') && (
        <p role="status" className="text-sm">
          {outcome === 'Joined'
            ? 'You have joined the Campaign as a Player.'
            : 'You are already a Player in this Campaign.'}
        </p>
      )}

      {outcome && rejectionMessages[outcome] && (
        <p role="alert" className="text-sm text-destructive">
          {rejectionMessages[outcome]}
        </p>
      )}

      {join.isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not join the Campaign. Please try again.
        </p>
      )}
    </section>
  )
}
