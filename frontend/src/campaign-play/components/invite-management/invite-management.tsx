import { useId } from 'react'

import {
  useCampaignInvite,
  useIssueInvite,
  useReplaceInvite,
  useRevokeInvite,
} from '@/campaign-play/hooks/useCampaignInvite'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

interface InviteManagementProps {
  campaignId: string
}

function joinLink(token: string): string {
  return `${window.location.origin}/campaigns/join/${token}`
}

/** Lets a Keeper issue, share, replace, and revoke their Campaign's active Invite link. */
export function InviteManagement({ campaignId }: InviteManagementProps) {
  const linkFieldId = useId()
  const invite = useCampaignInvite(campaignId)
  const issue = useIssueInvite(campaignId)
  const replace = useReplaceInvite(campaignId)
  const revoke = useRevokeInvite(campaignId)

  const busy = issue.isPending || replace.isPending || revoke.isPending
  const anyError = invite.isError || issue.isError || replace.isError || revoke.isError

  return (
    <section className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">Campaign Invite</h1>

      {invite.isPending && (
        <p role="status" className="text-sm">
          Loading the Campaign Invite…
        </p>
      )}

      {!invite.isPending && invite.data && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor={linkFieldId} className="text-sm font-medium">
              Share this join link with your Players
            </label>
            <Input id={linkFieldId} readOnly value={joinLink(invite.data.token)} />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" disabled={busy} onClick={() => replace.mutate()}>
              {replace.isPending ? 'Replacing…' : 'Replace link'}
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => revoke.mutate()}>
              {revoke.isPending ? 'Revoking…' : 'Revoke link'}
            </Button>
          </div>
        </div>
      )}

      {!invite.isPending && !invite.data && !invite.isError && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            This Campaign has no active Invite. Issue one to let Players join.
          </p>
          <Button type="button" disabled={busy} onClick={() => issue.mutate()}>
            {issue.isPending ? 'Issuing…' : 'Issue invite link'}
          </Button>
        </div>
      )}

      {anyError && (
        <p role="alert" className="text-sm text-destructive">
          Something went wrong managing the Campaign Invite. Please try again.
        </p>
      )}
    </section>
  )
}
