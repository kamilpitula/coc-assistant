import { Link } from '@tanstack/react-router'
import { useId, useState } from 'react'

import { HandoutBadges } from '@/scenario-preparation/components/handout-badges/handout-badges'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { NON_PLAYER_ENTITY_PROFILE_PATHS, NON_PLAYER_ENTITY_TYPE_LABELS } from '@/scenario-preparation/types/NonPlayerEntity'
import { HANDOUT_KIND_LABELS, HANDOUT_VISIBILITY_LABELS, type HandoutSummary } from '@/scenario-preparation/types/Handout'
import type { NonPlayerEntityLink } from '@/scenario-preparation/types/Scene'
import { HandoutPreview } from '@/scene-play/components/handout-preview/handout-preview'
import { KeeperNotesSection } from '@/scene-play/components/keeper-notes-section/keeper-notes-section'
import { RevealDialog } from '@/scene-play/components/reveal-dialog/reveal-dialog'
import { useRevealFlow, type RevealTarget } from '@/scene-play/hooks/useRevealFlow'
import { joinNames, recipientsOfSubject } from '@/scene-play/services/revealPresentation'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'
import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'
import { Button } from '@/shared/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { isEmptyRichText } from '@/shared/services/richText'

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
 * "Reveal..." on what is Player-facing (specs/scene-play/ux.md sections 12 and 13; PBI-SPL-002 D4). While that read loads these
 * sections show a Skeleton; if it fails they say so with "Try again", and the rest of the page is unaffected.
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
      <HandoutsSection campaignId={campaignId} scene={scene} handouts={handouts} onReveal={flow.open} />
      <NonPlayerEntitiesSection campaignId={campaignId} scene={scene} links={nonPlayerEntityLinks} onReveal={flow.open} />
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
  campaignId: string
  scene: KeeperActiveScene
  onReveal: (target: RevealTarget) => void
}

function HandoutsSection({ campaignId, scene, handouts, onReveal }: SectionProps & { handouts: HandoutSummary[] }) {
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
        <ol className="flex flex-col gap-4">
          {handouts.map((handout) => (
            <HandoutItem key={handout.id} campaignId={campaignId} scene={scene} handout={handout} onReveal={onReveal} />
          ))}
        </ol>
      )}
    </section>
  )
}

function HandoutItem({ campaignId, scene, handout, onReveal }: SectionProps & { handout: HandoutSummary }) {
  const [open, setOpen] = useState(false)
  const triggerId = `reveal-trigger-${handout.id}`

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <li className="flex flex-col gap-2 border-t pt-3">
        <h3 className="text-base font-semibold break-words">{handout.title}</h3>
        <HandoutBadges kind={handout.kind} visibility={handout.visibility} />
        <RevealedTo reveals={scene.reveals} subjectId={handout.id} scene={scene} />
        <div className="flex flex-wrap items-center gap-3">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" size="sm" aria-label={`${open ? 'Hide' : 'Show'} content of ${handout.title}`}>
              {open ? 'Hide content' : 'Show content'}
            </Button>
          </CollapsibleTrigger>
          {handout.visibility === 'PlayerFacing' && (
            <Button
              id={triggerId}
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Reveal ${handout.title}`}
              onClick={() =>
                onReveal({
                  subjectType: 'Handout',
                  subjectId: handout.id,
                  title: handout.title,
                  summary: `${HANDOUT_KIND_LABELS[handout.kind]} \u00b7 ${HANDOUT_VISIBILITY_LABELS[handout.visibility]}`,
                  triggerId,
                })
              }
            >
              Reveal...
            </Button>
          )}
        </div>
        <CollapsibleContent>
          <HandoutPreview owner={{ type: 'scene', campaignId, scenarioId: scene.scenarioId, sceneId: scene.sceneId }} handoutId={handout.id} />
        </CollapsibleContent>
      </li>
    </Collapsible>
  )
}

function NonPlayerEntitiesSection({ campaignId, scene, links, onReveal }: SectionProps & { links: NonPlayerEntityLink[] }) {
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
        <ul className="flex flex-col gap-4">
          {links.map((link) => (
            <LinkItem key={link.id} campaignId={campaignId} scene={scene} link={link} onReveal={onReveal} />
          ))}
        </ul>
      )}
    </section>
  )
}

function LinkItem({ campaignId, scene, link, onReveal }: SectionProps & { link: NonPlayerEntityLink }) {
  const profilePath = NON_PLAYER_ENTITY_PROFILE_PATHS[link.nonPlayerEntity.type]
  const hasDescription = link.playerFacingDescription !== null && !isEmptyRichText(link.playerFacingDescription)
  const triggerId = `reveal-trigger-${link.id}`

  return (
    <li className="flex flex-col gap-2 border-t pt-3">
      <h3 className="text-base font-semibold break-words">{link.playerFacingName}</h3>
      <p className="text-sm break-words text-muted-foreground">
        {NON_PLAYER_ENTITY_TYPE_LABELS[link.nonPlayerEntity.type]}:{' '}
        <Link
          to={profilePath.to}
          params={{ campaignId, [profilePath.idParam]: link.nonPlayerEntity.id } as never}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {link.nonPlayerEntity.name}
        </Link>
      </p>
      {hasDescription ? (
        <RichTextView document={link.playerFacingDescription!} headingOffset={1} />
      ) : (
        <p className="text-sm text-muted-foreground">No Player-facing description yet.</p>
      )}
      <RevealedTo reveals={scene.reveals} subjectId={link.id} scene={scene} />
      <div>
        <Button
          id={triggerId}
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Reveal ${link.playerFacingName}`}
          onClick={() =>
            onReveal({
              subjectType: 'NonPlayerEntity',
              subjectId: link.id,
              title: link.playerFacingName,
              summary: 'Non-Player Entity',
              triggerId,
            })
          }
        >
          Reveal...
        </Button>
      </div>
    </li>
  )
}
