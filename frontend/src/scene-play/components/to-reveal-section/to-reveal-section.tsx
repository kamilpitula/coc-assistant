import { useId } from 'react'

import { MaterialEntry, MaterialEntryList } from '@/scenario-preparation/components/material-entry/material-entry'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { MaterialLoadState } from '@/scene-play/components/material-load-state/material-load-state'
import { RevealTrigger } from '@/scene-play/components/reveal-trigger/reveal-trigger'
import { type RevealOpenContext, type RevealTarget } from '@/scene-play/hooks/useRevealFlow'
import { recipientsOfSubject } from '@/scene-play/services/revealPresentation'
import { revealTargetOf, toRevealStatus, toRevealSubjects, type ToRevealSubject } from '@/scene-play/services/subTabGrouping'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'

interface ToRevealSectionProps {
  campaignId: string
  scene: KeeperActiveScene
  /** Opens the layout-level reveal dialog for the entry's target, with the completion and focus context (21.7). */
  onReveal: (target: RevealTarget, context: RevealOpenContext) => void
}

/**
 * The "To reveal" sub-tab body (specs/scene-play/ux.md section 21.4): Player-facing Handouts in stored order, then
 * Non-Player Entity links in link order, each while it has not reached every Investigator present. Each entry keeps
 * its material-entry title into its side panel, its reveal status line, and a "Reveal..." trigger. Keeper-facing
 * Handouts live under "Keeper reference" instead and never appear here.
 */
export function ToRevealSection({ campaignId, scene, onReveal }: ToRevealSectionProps) {
  const headingId = useId()
  const material = useScene(campaignId, scene.scenarioId, scene.sceneId, true)

  if (material.isError || !material.data) {
    return <MaterialLoadState isError={material.isError} onRetry={() => void material.refetch()} />
  }

  const subjects = toRevealSubjects(material.data.handouts, material.data.nonPlayerEntityLinks, scene.reveals, scene.investigatorsPresent)
  const entries = subjects.map((subject) => {
    const subjectId = subject.type === 'handout' ? subject.handout.id : subject.link.id
    return { subject, subjectId, titleId: `${subject.type === 'handout' ? 'handout' : 'entity'}-link-${subjectId}` }
  })
  const handouts = entries.filter((entry) => entry.subject.type === 'handout')
  const entities = entries.filter((entry) => entry.subject.type === 'entity')

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={headingId} tabIndex={-1} className="text-lg font-semibold outline-none">
          To reveal
        </h2>
        <p className="text-sm text-muted-foreground">Player-facing material that hasn&apos;t reached every Investigator present.</p>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Everything Player-facing has reached every Investigator present.</p>
      ) : (
        <>
          {handouts.length > 0 && <SubjectGroup title="Handouts" group={handouts} entries={entries} headingId={headingId} scene={scene} onReveal={onReveal} />}
          {entities.length > 0 && <SubjectGroup title="Non-Player Entities" group={entities} entries={entries} headingId={headingId} scene={scene} onReveal={onReveal} />}
        </>
      )}
    </section>
  )
}

interface SubjectEntry {
  subject: ToRevealSubject
  subjectId: string
  titleId: string
}

function SubjectGroup({
  title,
  group,
  entries,
  headingId,
  scene,
  onReveal,
}: {
  title: string
  group: SubjectEntry[]
  /** Every entry in list order, so the focus fallback spans the type groups (21.7). */
  entries: SubjectEntry[]
  headingId: string
  scene: KeeperActiveScene
  onReveal: (target: RevealTarget, context: RevealOpenContext) => void
}) {
  const groupId = useId()

  return (
    <section aria-labelledby={groupId} className="flex flex-col gap-3">
      <h3 id={groupId} className="text-base font-semibold">
        {title}
      </h3>
      <MaterialEntryList as="ul">
        {group.map((entry) => {
          const index = entries.indexOf(entry)
          const next = entries[index + 1]?.titleId
          const previous = entries[index - 1]?.titleId
          const status = toRevealStatus(entry.subjectId, scene.reveals, scene.investigatorsPresent)
          const alreadyRevealedIds = recipientsOfSubject(scene.reveals, entry.subjectId, scene.investigatorsPresent).map((recipient) => recipient.id)
          const title = entry.subject.type === 'handout' ? entry.subject.handout.title : entry.subject.link.playerFacingName
          return (
            <MaterialEntry
              key={entry.subjectId}
              subject={entry.subject}
              titleId={entry.titleId}
              headingLevel={4}
              status={
                status === null ? undefined : <p className="text-sm break-words text-muted-foreground">{status}</p>
              }
              action={
                <RevealTrigger
                  triggerId={`reveal-trigger-${entry.subjectId}`}
                  title={title}
                  onReveal={() =>
                    onReveal(revealTargetOf(entry.subject, `reveal-trigger-${entry.subjectId}`), {
                      alreadyRevealedIds,
                      fallbackIds: [...(next === undefined ? [] : [next]), ...(previous === undefined ? [] : [previous]), headingId],
                    })
                  }
                />
              }
            />
          )
        })}
      </MaterialEntryList>
    </section>
  )
}
