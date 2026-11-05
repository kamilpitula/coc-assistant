import { useId } from 'react'

import { MaterialEntry, MaterialEntryList } from '@/scenario-preparation/components/material-entry/material-entry'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { HANDOUT_KIND_LABELS, HANDOUT_VISIBILITY_LABELS, type HandoutSummary } from '@/scenario-preparation/types/Handout'
import type { NonPlayerEntityLink } from '@/scenario-preparation/types/Scene'
import { KeeperNotesSection } from '@/scene-play/components/keeper-notes-section/keeper-notes-section'
import { RevealDialog } from '@/scene-play/components/reveal-dialog/reveal-dialog'
import { useRevealFlow, type RevealTarget } from '@/scene-play/hooks/useRevealFlow'
import { joinNames, recipientsOfSubject } from '@/scene-play/services/revealPresentation'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface SceneMaterialSectionProps {
  campaignId: string
  scene: KeeperActiveScene
  /** The page's status message after a Reveal: "{title} revealed to {names}.". */
  onRevealed: (message: string) => void
  /** The Scene was finished meanwhile and the reveal dialog was closed. */
  onSceneFinished: () => void
  /** A 400 refusal: the page refetches the Active Scene. */
  onRefetch: () => void
}

/**
 * The Keeper's Keeper notes, Handouts, and Non-Player Entities on the Active Scene page, from the existing Keeper Scene read, with
 * "Reveal..." on what is Player-facing (specs/scene-play/ux.md sections 12 and 13; PBI-SPL-002 D4). Each Handout and Non-Player Entity is
 * a material entry whose title opens its side panel; the profile and description live in the panel (PBI-SPL-005 design record D4).
 * While that read loads these sections show a Skeleton; if it fails they say so with "Try again", and the rest of the page is unaffected.
 */
export function SceneMaterialSection({ campaignId, scene, onRevealed, onSceneFinished, onRefetch }: SceneMaterialSectionProps) {
  const material = useScene(campaignId, scene.scenarioId, scene.sceneId, true)
  const flow = useRevealFlow(campaignId, scene.investigatorsPresent, { onRevealed, onSceneFinished, onRefetch })

  if (material.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this Scene&apos;s material.</p>
        <Button type="button" variant="outline" onClick={() => void material.refetch()}>
          Try again
        </Button>
      </div>
    )
  }
  if (!material.data) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  const { keeperNotes, handouts, nonPlayerEntityLinks } = material.data
  const alreadyRevealedIds = flow.target ? new Set(recipientsOfSubject(scene.reveals, flow.target.subjectId, scene.investigatorsPresent).map((recipient) => recipient.id)) : new Set<string>()

  return (
    <>
      <KeeperNotesSection notes={keeperNotes} />
      <HandoutsSection scene={scene} handouts={handouts} onReveal={flow.open} />
      <NonPlayerEntitiesSection scene={scene} links={nonPlayerEntityLinks} onReveal={flow.open} />
      <RevealDialog
        open={flow.target !== null}
        title={flow.target?.title ?? ''}
        summary={flow.target?.summary ?? ''}
        investigators={scene.investigatorsPresent}
        alreadyRevealedIds={alreadyRevealedIds}
        pending={flow.pending}
        refusal={flow.refusal ? { message: flow.refusal } : null}
        onConfirm={flow.confirm}
        onCancel={flow.cancel}
        onCloseAutoFocus={flow.returnFocus}
      />
    </>
  )
}

/** "Revealed to {names}" for a subject, only once it has been revealed in this Scene. */
function RevealedTo({ reveals, subjectId, scene }: { reveals: KeeperReveal[]; subjectId: string; scene: KeeperActiveScene }) {
  const recipients = recipientsOfSubject(reveals, subjectId, scene.investigatorsPresent)
  return recipients.length === 0 ? null : <p className="text-sm break-words text-muted-foreground">Revealed to {joinNames(recipients.map((recipient) => recipient.name))}</p>
}

interface SectionProps {
  scene: KeeperActiveScene
  onReveal: (target: RevealTarget) => void
}

function HandoutsSection({ scene, handouts, onReveal }: SectionProps & { handouts: HandoutSummary[] }) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg font-semibold">
        Handouts
      </h2>
      <p className="text-sm text-muted-foreground">Player-facing Handouts reach only the Investigators you choose. Keeper-facing Handouts are never revealed.</p>
      {handouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No Handouts in this Scene.</p>
      ) : (
        <MaterialEntryList as="ol">
          {handouts.map((handout) => (
            <MaterialEntry
              key={handout.id}
              subject={{ type: 'handout', handout }}
              titleId={`handout-link-${handout.id}`}
              status={<RevealedTo reveals={scene.reveals} subjectId={handout.id} scene={scene} />}
              action={
                handout.visibility === 'PlayerFacing' ? (
                  <RevealAction
                    triggerId={`reveal-trigger-${handout.id}`}
                    title={handout.title}
                    onReveal={() =>
                      onReveal({
                        subjectType: 'Handout',
                        subjectId: handout.id,
                        title: handout.title,
                        summary: `${HANDOUT_KIND_LABELS[handout.kind]} \u00b7 ${HANDOUT_VISIBILITY_LABELS[handout.visibility]}`,
                        triggerId: `reveal-trigger-${handout.id}`,
                      })
                    }
                  />
                ) : undefined
              }
            />
          ))}
        </MaterialEntryList>
      )}
    </section>
  )
}

function NonPlayerEntitiesSection({ scene, links, onReveal }: SectionProps & { links: NonPlayerEntityLink[] }) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg font-semibold">
        Non-Player Entities
      </h2>
      <p className="text-sm text-muted-foreground">Only the Player-facing name and description reach Players, and only when you reveal them.</p>
      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No Non-Player Entities in this Scene.</p>
      ) : (
        <MaterialEntryList as="ul">
          {links.map((link) => (
            <MaterialEntry
              key={link.id}
              subject={{ type: 'entity', link }}
              titleId={`entity-link-${link.id}`}
              status={<RevealedTo reveals={scene.reveals} subjectId={link.id} scene={scene} />}
              action={
                <RevealAction
                  triggerId={`reveal-trigger-${link.id}`}
                  title={link.playerFacingName}
                  onReveal={() =>
                    onReveal({
                      subjectType: 'NonPlayerEntity',
                      subjectId: link.id,
                      title: link.playerFacingName,
                      summary: 'Non-Player Entity',
                      triggerId: `reveal-trigger-${link.id}`,
                    })
                  }
                />
              }
            />
          ))}
        </MaterialEntryList>
      )}
    </section>
  )
}

function RevealAction({ triggerId, title, onReveal }: { triggerId: string; title: string; onReveal: () => void }) {
  return (
    <Button id={triggerId} type="button" variant="outline" size="sm" aria-label={`Reveal ${title}`} onClick={onReveal}>
      Reveal...
    </Button>
  )
}
