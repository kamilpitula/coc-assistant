import { Link } from '@tanstack/react-router'
import { createElement, useId } from 'react'

import { SceneStatusBadge } from '@/scenario-preparation/components/scene-status-badge/scene-status-badge'
import { SceneTimes } from '@/scenario-preparation/components/scene-times/scene-times'
import { RevealDisclosure } from '@/scene-play/components/reveal-disclosure/reveal-disclosure'
import { formatClueTime, joinNames, recipientNames, revealKindLabel } from '@/scene-play/services/revealPresentation'
import type { KeeperReveal, PlayerReveal } from '@/scene-play/types/Reveal'
import type { KeeperHistoryScene, PlayerHistoryScene } from '@/scene-play/types/SceneHistory'
import { useHeadingTag } from '@/shared/providers/heading-offset/heading-offset-context'

interface SceneHistorySceneProps {
  campaignId: string
  scene: KeeperHistoryScene | PlayerHistoryScene
  /** The Player's Investigator name; null for the Keeper view or a Player without an Approved Investigator. */
  investigatorName: string | null
}

/**
 * One played Scene of the Scene History (specs/scene-play/ux.md section 23.2): a section labelled by its h2, the muted
 * meta line, the Investigators present for the Keeper, and each Reveal closed until "Show". A Scene where nothing
 * reached the viewer keeps its title and times with one empty sentence.
 */
export function SceneHistoryScene({ campaignId, scene, investigatorName }: SceneHistorySceneProps) {
  const headingId = useId()
  const tag = useHeadingTag(2)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      {createElement(tag, { id: headingId, className: 'text-lg font-semibold break-words' }, scene.title)}
      <SceneMetaLine campaignId={campaignId} scene={scene} />
      {'investigatorsPresent' in scene && <InvestigatorsPresent present={scene.investigatorsPresent.map((investigator) => investigator.name)} />}
      {'investigatorsPresent' in scene ? (
        <KeeperReveals campaignId={campaignId} reveals={scene.reveals} />
      ) : (
        <PlayerReveals campaignId={campaignId} reveals={scene.reveals} investigatorName={investigatorName} />
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

function KeeperReveals({ campaignId, reveals }: { campaignId: string; reveals: KeeperReveal[] }) {
  if (reveals.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing was revealed in this Scene.</p>
  }

  return (
    <>
      {reveals.map((reveal) => (
        <RevealDisclosure key={reveal.revealId} campaignId={campaignId} reveal={reveal} metaLine={<KeeperMetaLine reveal={reveal} />} />
      ))}
    </>
  )
}

function PlayerReveals({ campaignId, reveals, investigatorName }: { campaignId: string; reveals: PlayerReveal[]; investigatorName: string | null }) {
  if (reveals.length === 0) {
    return investigatorName ? <p className="text-sm text-muted-foreground">Nothing from this Scene reached {investigatorName}.</p> : null
  }

  return (
    <>
      {reveals.map((reveal) => (
        <RevealDisclosure key={reveal.revealId} campaignId={campaignId} reveal={reveal} metaLine={<PlayerMetaLine reveal={reveal} />} />
      ))}
    </>
  )
}
