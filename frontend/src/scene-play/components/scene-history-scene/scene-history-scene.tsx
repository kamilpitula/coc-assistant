import { Link } from '@tanstack/react-router'
import { createElement, useId, type ReactNode } from 'react'

import { RollRequestCardView } from '@/roll-requests/components/roll-request-card/roll-request-card'
import type { RollRequest } from '@/roll-requests/types/RollRequest'
import { SceneStatusBadge } from '@/scenario-preparation/components/scene-status-badge/scene-status-badge'
import { SceneTimes } from '@/scenario-preparation/components/scene-times/scene-times'
import { RevealDisclosure } from '@/scene-play/components/reveal-disclosure/reveal-disclosure'
import { formatClueTime, joinNames, recipientNames, revealKindLabel } from '@/scene-play/services/revealPresentation'
import { historyItems, withoutCancelledRolls } from '@/scene-play/services/sceneHistoryItems'
import type { KeeperReveal, PlayerReveal } from '@/scene-play/types/Reveal'
import type { KeeperHistoryScene, PlayerHistoryScene } from '@/scene-play/types/SceneHistory'
import { useHeadingTag } from '@/shared/providers/heading-offset/heading-offset-context'

interface SceneHistorySceneProps {
  campaignId: string
  scene: KeeperHistoryScene | PlayerHistoryScene
  /** The Player's Investigator name; null for the Keeper view or a Player without an Approved Investigator. */
  investigatorName: string | null
  /** The Keeper's display name, shown on every Roll Request card. */
  requestedByDisplayName: string
}

/**
 * One played Scene of the Scene History (specs/scene-play/ux.md section 23.11): a section labelled by its h2, the muted
 * meta line, the Investigators present for the Keeper, and each Reveal and Roll Request card in one list, newest first.
 * Cancelled rows are hidden, and a card whose rows are all Cancelled is not listed. A Scene where nothing reached the
 * viewer keeps its title and times with one empty sentence.
 */
export function SceneHistoryScene({ campaignId, scene, investigatorName, requestedByDisplayName }: SceneHistorySceneProps) {
  const headingId = useId()
  const tag = useHeadingTag(2)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      {createElement(tag, { id: headingId, className: 'text-lg font-semibold break-words' }, scene.title)}
      <SceneMetaLine campaignId={campaignId} scene={scene} />
      {'investigatorsPresent' in scene && <InvestigatorsPresent present={scene.investigatorsPresent.map((investigator) => investigator.name)} />}
      {'investigatorsPresent' in scene ? (
        <KeeperItems campaignId={campaignId} scene={scene} requestedByDisplayName={requestedByDisplayName} />
      ) : (
        <PlayerItems campaignId={campaignId} scene={scene} investigatorName={investigatorName} requestedByDisplayName={requestedByDisplayName} />
      )}
    </section>
  )
}

function Dot() {
  return (
    <span aria-hidden="true" className="text-muted-foreground">
      &middot;
    </span>
  )
}

/** "Scenario: {title} . Started {time} . Finished {time}", with the "Active" badge and link while Active. */
function SceneMetaLine({ campaignId, scene }: { campaignId: string; scene: KeeperHistoryScene | PlayerHistoryScene }) {
  const isActive = scene.finishedAt === null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span className="break-words">Scenario: {scene.scenarioTitle}</span>
      <Dot />
      <SceneTimes startedAt={scene.startedAt} finishedAt={scene.finishedAt} />
      {isActive && (
        <>
          <Dot />
          <SceneStatusBadge status="Active" />
          <Link to="/campaigns/$campaignId/active-scene" params={{ campaignId }} className="text-foreground underline">
            Open Active Scene
          </Link>
        </>
      )}
    </div>
  )
}

function InvestigatorsPresent({ present }: { present: (string | null)[] }) {
  return <p className="text-sm text-muted-foreground">Investigators present: {joinNames(present)}</p>
}

function KeeperMetaLine({ reveal }: { reveal: KeeperReveal }) {
  return (
    <p className="text-sm text-muted-foreground">
      {revealKindLabel(reveal)} <span aria-hidden="true">&middot;</span> Revealed{' '}
      <time dateTime={reveal.revealedAt}>{formatClueTime(reveal.revealedAt)}</time> <span aria-hidden="true">&middot;</span> to{' '}
      {recipientNames(reveal)}
    </p>
  )
}

function PlayerMetaLine({ reveal }: { reveal: PlayerReveal }) {
  return (
    <p className="text-sm text-muted-foreground">
      {revealKindLabel(reveal)} <span aria-hidden="true">&middot;</span> Revealed{' '}
      <time dateTime={reveal.revealedAt}>{formatClueTime(reveal.revealedAt)}</time>
    </p>
  )
}

/** The Scene's Reveals and Roll Requests as the Keeper sees them, mixed newest first (SPL-UX-73). */
function KeeperItems({
  campaignId,
  scene,
  requestedByDisplayName,
}: {
  campaignId: string
  scene: KeeperHistoryScene
  requestedByDisplayName: string
}) {
  return (
    <HistoryItems
      campaignId={campaignId}
      reveals={scene.reveals}
      rollRequests={scene.rollRequests}
      requestedByDisplayName={requestedByDisplayName}
      renderMetaLine={(reveal) => <KeeperMetaLine reveal={reveal} />}
      empty={<p className="text-sm text-muted-foreground">Nothing was revealed or rolled in this Scene.</p>}
    />
  )
}

/** The Scene's Reveals and Public Roll Requests as a Player sees them, mixed newest first (SPL-UX-73). */
function PlayerItems({
  campaignId,
  scene,
  investigatorName,
  requestedByDisplayName,
}: {
  campaignId: string
  scene: PlayerHistoryScene
  investigatorName: string | null
  requestedByDisplayName: string
}) {
  return (
    <HistoryItems
      campaignId={campaignId}
      reveals={scene.reveals}
      rollRequests={scene.rollRequests}
      requestedByDisplayName={requestedByDisplayName}
      renderMetaLine={(reveal) => <PlayerMetaLine reveal={reveal} />}
      empty={
        investigatorName ? (
          <p className="text-sm text-muted-foreground">Nothing from this Scene reached {investigatorName}.</p>
        ) : null
      }
    />
  )
}

/**
 * One history list, newest first (SPL-UX-73), parameterized by the Reveal meta line and the empty sentence. Cancelled
 * rows are hidden, and a card whose rows are all Cancelled is not listed.
 */
function HistoryItems<TReveal extends PlayerReveal>({
  campaignId,
  reveals,
  rollRequests,
  requestedByDisplayName,
  renderMetaLine,
  empty,
}: {
  campaignId: string
  reveals: readonly TReveal[]
  rollRequests: RollRequest[]
  requestedByDisplayName: string
  renderMetaLine: (reveal: TReveal) => ReactNode
  empty: ReactNode
}) {
  const items = historyItems(reveals, visibleRequests(rollRequests))
  if (items.length === 0) {
    return <>{empty}</>
  }

  return (
    <>
      {items.map((item) =>
        item.kind === 'reveal' ? (
          <RevealDisclosure key={item.id} campaignId={campaignId} reveal={item.reveal} metaLine={renderMetaLine(item.reveal)} />
        ) : (
          <RollRequestCardView key={item.id} request={item.request} requestedByDisplayName={requestedByDisplayName} />
        ),
      )}
    </>
  )
}

function visibleRequests(rollRequests: RollRequest[]): RollRequest[] {
  return rollRequests.map(withoutCancelledRolls).filter((request): request is RollRequest => request !== null)
}
