import { Link, useNavigate } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import type { ReactNode } from 'react'

import { formatCreationMethods } from '@/campaign-play/components/creation-methods-fieldset/creationMethodLabels'
import { InvestigatorStatusBadge } from '@/campaign-play/components/investigator-status-badge/investigator-status-badge'
import { useCreateInvestigator, useMyCharacterSheet, useMyInvestigator } from '@/campaign-play/hooks/useMyInvestigator'
import { SUPPORTED_CREATION_METHODS, supportedMethodsAllowedBy } from '@/campaign-play/services/supportedCreationMethods'
import { resumeStep, stepNumber, WIZARD_STEPS } from '@/campaign-play/services/wizardProgress'
import type { PlayerCampaign } from '@/campaign-play/types/Campaign'
import type { InvestigatorSummary } from '@/campaign-play/types/Investigator'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'

const HEADING_ID = 'your-investigator-heading'

interface YourInvestigatorCardProps {
  campaign: PlayerCampaign
}

/** The Player's Investigator in this Campaign, with one primary action (specs/character-sheet/ux.md section 3.2). */
export function YourInvestigatorCard({ campaign }: YourInvestigatorCardProps) {
  const investigator = useMyInvestigator(campaign.id)

  if (investigator.isPending) {
    return (
      <CardFrame busy>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-9 w-40" />
      </CardFrame>
    )
  }

  if (investigator.isError) {
    return (
      <CardFrame>
        <p className="text-sm">We couldn&apos;t load your Investigator.</p>
        <Button type="button" variant="outline" className="self-start" onClick={() => void investigator.refetch()}>
          Try again
        </Button>
      </CardFrame>
    )
  }

  if (!investigator.data) {
    return <NoInvestigator campaign={campaign} />
  }

  return <CardFrame>{<InvestigatorDetails campaignId={campaign.id} investigator={investigator.data} />}</CardFrame>
}

function CardFrame({ children, busy = false }: { children: ReactNode; busy?: boolean }) {
  return (
    <Card role="region" aria-labelledby={HEADING_ID} aria-busy={busy || undefined} className="max-w-xl">
      <CardHeader>
        <h2 id={HEADING_ID} className="text-xl font-semibold">
          Your Investigator
        </h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  )
}

function NoInvestigator({ campaign }: { campaign: PlayerCampaign }) {
  const create = useCreateInvestigator(campaign.id)
  const navigate = useNavigate()

  if (supportedMethodsAllowedBy(campaign.allowedCreationMethods).length === 0) {
    return (
      <CardFrame>
        <p className="flex gap-2 text-sm">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            You can&apos;t create your Investigator yet. This Campaign allows{' '}
            {formatCreationMethods(campaign.allowedCreationMethods)}, which aren&apos;t available yet. Ask your Keeper to
            also allow {formatCreationMethods(SUPPORTED_CREATION_METHODS)}.
          </span>
        </p>
      </CardFrame>
    )
  }

  const handleCreate = () =>
    create.mutate(undefined, {
      onSuccess: () =>
        void navigate({
          to: '/campaigns/$campaignId/investigator/$step',
          params: { campaignId: campaign.id, step: 'identity' },
        }),
    })

  return (
    <CardFrame>
      <p className="text-sm">Create the Investigator you&apos;ll play in this Campaign.</p>
      <Button type="button" className="self-start" disabled={create.isPending} onClick={handleCreate}>
        {create.isPending ? 'Creating…' : 'Create Investigator'}
      </Button>
      {create.isError && (
        <p role="alert" className="text-sm text-destructive">
          We couldn&apos;t create your Investigator. Try again.
        </p>
      )}
    </CardFrame>
  )
}

interface InvestigatorDetailsProps {
  campaignId: string
  investigator: InvestigatorSummary
}

function InvestigatorDetails({ campaignId, investigator }: InvestigatorDetailsProps) {
  const linkClass = buttonVariants({ className: 'self-start' })
  return (
    <>
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{investigator.name ?? 'Unnamed Investigator'}</span>
        <InvestigatorStatusBadge status={investigator.status} audience="Player" />
      </p>
      {investigator.status === 'Draft' && <DraftProgress campaignId={campaignId} />}
      {investigator.status === 'ChangesRequested' && (
        <Alert>
          <AlertTitle level={3}>Your Keeper asked for changes</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{investigator.changeRequestComment}</AlertDescription>
        </Alert>
      )}
      {investigator.status === 'ChangesRequested' ? (
        <Link to="/campaigns/$campaignId/investigator/$step" params={{ campaignId, step: 'sheet' }} className={linkClass}>
          Edit Investigator
        </Link>
      ) : (
        <Link to="/campaigns/$campaignId/investigator" params={{ campaignId }} className={linkClass}>
          {investigator.status === 'Draft' ? 'Continue' : 'View'}
        </Link>
      )}
    </>
  )
}

function DraftProgress({ campaignId }: { campaignId: string }) {
  const sheet = useMyCharacterSheet(campaignId)
  if (!sheet.data) {
    return null
  }

  const step = resumeStep(sheet.data.characterSheet, sheet.data.validationErrors)
  return (
    <p className="text-sm text-muted-foreground">
      Step {stepNumber(step)} of {WIZARD_STEPS.length}
    </p>
  )
}
