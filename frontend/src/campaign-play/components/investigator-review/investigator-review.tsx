import { Link } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { CharacterSheetView } from '@/campaign-play/components/character-sheet-view/character-sheet-view'
import { DiceResults } from '@/campaign-play/components/dice-results/dice-results'
import { InvestigatorNotFound } from '@/campaign-play/components/investigator-not-found/investigator-not-found'
import { InvestigatorStatusBadge } from '@/campaign-play/components/investigator-status-badge/investigator-status-badge'
import { RequestChangesDialog } from '@/campaign-play/components/request-changes-dialog/request-changes-dialog'
import { WorthCheckingAlert } from '@/campaign-play/components/worth-checking-alert/worth-checking-alert'
import { useApproveInvestigator, useKeeperInvestigator, useRequestChanges } from '@/campaign-play/hooks/useKeeperInvestigators'
import { InvestigatorConflictError } from '@/campaign-play/services/investigatorApi'
import type { KeeperInvestigator } from '@/campaign-play/types/Investigator'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface InvestigatorReviewProps {
  campaignId: string
  investigatorId: string
}

type ActionFailure = 'conflict' | 'other' | null

/** The Keeper's review screen (specs/character-sheet/ux.md section 7.1). */
export function InvestigatorReview({ campaignId, investigatorId }: InvestigatorReviewProps) {
  const investigator = useKeeperInvestigator(campaignId, investigatorId)

  if (investigator.isPending) {
    return <Skeleton aria-busy="true" className="h-64 w-full max-w-3xl" />
  }

  if (investigator.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this Investigator.</p>
        <Button type="button" variant="outline" onClick={() => void investigator.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!investigator.data) {
    return <InvestigatorNotFound campaignId={campaignId} />
  }

  return (
    <Review
      campaignId={campaignId}
      investigatorId={investigatorId}
      loaded={investigator.data}
      onReload={() => void investigator.refetch()}
    />
  )
}

interface ReviewProps {
  campaignId: string
  investigatorId: string
  loaded: KeeperInvestigator
  onReload: () => void
}

function Review({ campaignId, investigatorId, loaded, onReload }: ReviewProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  const approvedMessage = useRef<HTMLParagraphElement>(null)
  const approve = useApproveInvestigator(campaignId, investigatorId)
  const requestChanges = useRequestChanges(campaignId, investigatorId)
  const [reviewed, setReviewed] = useState<KeeperInvestigator | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [failure, setFailure] = useState<ActionFailure>(null)
  const [pending, setPending] = useState<'approve' | 'requestChanges' | null>(null)
  const investigator = reviewed ?? loaded
  const name = investigator.characterSheet.identity.name ?? 'Unnamed Investigator'

  useEffect(() => heading.current?.focus(), [])

  useEffect(() => {
    if (reviewed?.status === 'Approved') {
      approvedMessage.current?.focus()
    }
  }, [reviewed])

  const run = async (action: 'approve' | 'requestChanges', send: () => Promise<KeeperInvestigator>, message: string) => {
    setPending(action)
    setFailure(null)
    try {
      setReviewed(await send())
      setStatusMessage(message)
      return true
    } catch (error) {
      setFailure(error instanceof InvestigatorConflictError ? 'conflict' : 'other')
      return false
    } finally {
      setPending(null)
    }
  }

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">
          {name}
        </h1>
        <p className="text-sm">Player: {investigator.playerName ?? 'Unknown Player'}</p>
        <InvestigatorStatusBadge status={investigator.status} audience="Keeper" />
      </div>

      <p ref={approvedMessage} role="status" tabIndex={-1} className="text-sm empty:hidden focus:outline-none">
        {statusMessage}
      </p>

      <WorthCheckingAlert warnings={investigator.warnings} />

      <CharacterSheetView sheet={investigator.characterSheet} playerName={investigator.playerName}>
        <DiceResults rollRecords={investigator.characterSheet.rollRecords} />
      </CharacterSheetView>

      {failure && <FailureAlert failure={failure} onReload={onReload} />}

      {investigator.status === 'Submitted' && (
        <div className="flex flex-wrap gap-3">
          <RequestChangesDialog
            pending={pending !== null}
            onSend={(comment) => run('requestChanges', () => requestChanges.mutateAsync(comment), 'Sent to the Player.')}
          />
          <Button
            type="button"
            disabled={pending !== null}
            onClick={() => void run('approve', () => approve.mutateAsync(), `${name} is approved and ready for play.`)}
          >
            {pending === 'approve' ? 'Approving...' : 'Approve'}
          </Button>
        </div>
      )}

      <Link to="/campaigns/$campaignId" params={{ campaignId }} className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}>
        Back to Campaign
      </Link>
    </section>
  )
}

function FailureAlert({ failure, onReload }: { failure: Exclude<ActionFailure, null>; onReload: () => void }) {
  return (
    <Alert variant="destructive" role="alert" className="flex flex-col gap-2">
      <CircleAlert aria-hidden="true" />
      {failure === 'conflict' ? (
        <>
          <AlertDescription>This Investigator changed since you opened it.</AlertDescription>
          <Button type="button" variant="outline" className="self-start" onClick={onReload}>
            Reload
          </Button>
        </>
      ) : (
        <AlertDescription>We couldn&apos;t update this Investigator. Try again.</AlertDescription>
      )}
    </Alert>
  )
}
