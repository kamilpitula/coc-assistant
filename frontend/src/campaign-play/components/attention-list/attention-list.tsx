import { Link, useNavigate } from '@tanstack/react-router'
import { CircleAlert, Info } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { formatCreationMethods } from '@/campaign-play/components/creation-methods-fieldset/creationMethodLabels'
import { InvitePlayersDialog } from '@/campaign-play/components/invite-dialog/invite-dialog'
import { useKeeperAttention } from '@/campaign-play/hooks/useKeeperAttention'
import { useCreateInvestigator, useMyCharacterSheet, useMyInvestigator } from '@/campaign-play/hooks/useMyInvestigator'
import {
  playerAttentionItem,
  type KeeperAttentionItem,
  type PlayerAttentionItem,
} from '@/campaign-play/services/attentionItems'
import { SUPPORTED_CREATION_METHODS } from '@/campaign-play/services/supportedCreationMethods'
import { resumeStep, stepNumber, WIZARD_STEPS } from '@/campaign-play/services/wizardProgress'
import type { CampaignView, PlayerCampaign } from '@/campaign-play/types/Campaign'
import type { MyCharacterSheet } from '@/campaign-play/types/Investigator'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'

const ACTION_CLASS = buttonVariants({ size: 'sm' })

interface AttentionListProps {
  campaign: CampaignView
}

/**
 * "Needs your attention": what calls for the viewer's action (specs/campaign-overview/ux.md section 4). Not rendered,
 * heading included, when there is nothing.
 */
export function AttentionList({ campaign }: AttentionListProps) {
  return campaign.role === 'Keeper' ? <KeeperAttention campaignId={campaign.id} /> : <PlayerAttention campaign={campaign} />
}

function KeeperAttention({ campaignId }: { campaignId: string }) {
  const attention = useKeeperAttention(campaignId)

  if (attention.isPending) {
    return <AttentionLoading />
  }

  if (attention.isError) {
    return <AttentionError onRetry={attention.retry} />
  }

  if (attention.items.length === 0) {
    return null
  }

  return (
    <AttentionSection>
      {attention.items.map((item) => (
        <KeeperItem key={item.kind === 'review' ? item.investigatorId : item.kind} campaignId={campaignId} item={item} />
      ))}
    </AttentionSection>
  )
}

function KeeperItem({ campaignId, item }: { campaignId: string; item: KeeperAttentionItem }) {
  if (item.kind === 'invitePlayers') {
    return (
      <AttentionItem sentence="No Players have joined yet.">
        <InvitePlayersDialog campaignId={campaignId} />
      </AttentionItem>
    )
  }

  if (item.kind === 'createScenario') {
    return (
      <AttentionItem sentence="This Campaign has no Scenario yet.">
        <Link to="/campaigns/$campaignId/scenarios/new" params={{ campaignId }} className={ACTION_CLASS}>
          Create Scenario
        </Link>
      </AttentionItem>
    )
  }

  return (
    <AttentionItem sentence={`${item.investigatorName} by ${item.playerName} is ready for review`}>
      <Link
        to="/campaigns/$campaignId/investigators/$investigatorId"
        params={{ campaignId, investigatorId: item.investigatorId }}
        className={ACTION_CLASS}
      >
        Review <span className="sr-only">{item.investigatorName}</span>
      </Link>
    </AttentionItem>
  )
}

function PlayerAttention({ campaign }: { campaign: PlayerCampaign }) {
  const investigator = useMyInvestigator(campaign.id)
  const isDraft = investigator.data?.status === 'Draft'
  const sheet = useMyCharacterSheet(campaign.id, isDraft)

  if (investigator.isPending || (isDraft && sheet.isPending)) {
    return <AttentionLoading />
  }

  if (investigator.isError || (isDraft && sheet.isError)) {
    return (
      <AttentionError
        onRetry={() => {
          void investigator.refetch()
          if (isDraft) {
            void sheet.refetch()
          }
        }}
      />
    )
  }

  const item = playerAttentionItem(campaign, investigator.data ?? null)
  if (item === null) {
    return null
  }

  return (
    <AttentionSection>
      <PlayerItem campaign={campaign} item={item} sheet={sheet.data ?? null} />
    </AttentionSection>
  )
}

interface PlayerItemProps {
  campaign: PlayerCampaign
  item: PlayerAttentionItem
  sheet: MyCharacterSheet | null
}

function PlayerItem({ campaign, item, sheet }: PlayerItemProps) {
  switch (item.kind) {
    case 'create':
      return <CreateItem campaignId={campaign.id} />
    case 'creationUnavailable':
      return <AttentionItem icon="info" sentence={creationUnavailableText(campaign)} />
    case 'continue':
      return (
        <AttentionItem sentence={`Continue ${item.investigatorName ?? 'your Investigator'}: ${draftProgress(sheet)}`}>
          <Link to="/campaigns/$campaignId/investigator" params={{ campaignId: campaign.id }} className={ACTION_CLASS}>
            Continue
          </Link>
        </AttentionItem>
      )
    case 'changesRequested':
      return <ChangesRequestedItem campaignId={campaign.id} investigatorName={item.investigatorName} comment={item.comment} />
  }
}

/** The existing refusal text of specs/character-sheet/ux.md section 3.2. */
function creationUnavailableText(campaign: PlayerCampaign): string {
  const allowed = campaign.allowedCreationMethods
  return (
    `You can't create your Investigator yet. This Campaign allows ${formatCreationMethods(allowed)}, which ` +
    `${allowed.length === 1 ? "isn't" : "aren't"} available yet. Ask your Keeper to also allow ` +
    `${formatCreationMethods(SUPPORTED_CREATION_METHODS)}.`
  )
}

/** "step N of M", where M is the number of wizard steps (decision D1). */
function draftProgress(sheet: MyCharacterSheet | null): string {
  const step = sheet ? stepNumber(resumeStep(sheet.characterSheet, sheet.validationErrors)) : 1
  return `step ${step} of ${WIZARD_STEPS.length}`
}

function CreateItem({ campaignId }: { campaignId: string }) {
  const create = useCreateInvestigator(campaignId)
  const navigate = useNavigate()

  const handleCreate = () =>
    create.mutate(undefined, {
      onSuccess: () =>
        void navigate({ to: '/campaigns/$campaignId/investigator/$step', params: { campaignId, step: 'identity' } }),
    })

  return (
    <AttentionItem
      sentence="Create the Investigator you'll play in this Campaign."
      detail={
        create.isError && (
          <p role="alert" className="text-sm text-destructive">
            We couldn&apos;t create your Investigator. Try again.
          </p>
        )
      }
    >
      <Button type="button" size="sm" disabled={create.isPending} onClick={handleCreate}>
        {create.isPending ? 'Creating…' : 'Create Investigator'}
      </Button>
    </AttentionItem>
  )
}

interface ChangesRequestedItemProps {
  campaignId: string
  investigatorName: string | null
  comment: string | null
}

function ChangesRequestedItem({ campaignId, investigatorName, comment }: ChangesRequestedItemProps) {
  return (
    <AttentionItem
      sentence={`Your Keeper asked for changes to ${investigatorName ?? 'your Investigator'}.`}
      detail={
        comment && <blockquote className="border-l-2 pl-3 text-sm whitespace-pre-line">{comment}</blockquote>
      }
    >
      <Link
        to="/campaigns/$campaignId/investigator/$step"
        params={{ campaignId, step: 'sheet' }}
        className={ACTION_CLASS}
      >
        Edit Investigator
      </Link>
    </AttentionItem>
  )
}

function AttentionSection({ children, busy = false }: { children: ReactNode; busy?: boolean }) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg font-semibold">
        Needs your attention
      </h2>
      <Card aria-busy={busy || undefined}>
        <ul className="divide-y">{children}</ul>
      </Card>
    </section>
  )
}

interface AttentionItemProps {
  sentence: string
  icon?: 'alert' | 'info'
  detail?: ReactNode
  children?: ReactNode
}

/** One item: an icon, the sentence (with optional detail), and its action, which wraps under it below 640px. */
function AttentionItem({ sentence, icon = 'alert', detail, children }: AttentionItemProps) {
  const Icon = icon === 'info' ? Info : CircleAlert

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="flex gap-2 text-sm">
          <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="break-words">{sentence}</span>
        </p>
        {detail}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </li>
  )
}

function AttentionLoading() {
  return (
    <AttentionSection busy>
      <li className="px-4 py-3">
        <Skeleton className="h-5 w-full max-w-sm" />
      </li>
    </AttentionSection>
  )
}

function AttentionError({ onRetry }: { onRetry: () => void }) {
  return (
    <AttentionSection>
      <AttentionItem sentence="We couldn't check what needs your attention.">
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </AttentionItem>
    </AttentionSection>
  )
}
