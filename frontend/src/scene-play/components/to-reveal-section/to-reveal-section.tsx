import { useId } from 'react'

import { useApprovedInvestigatorNames } from '@/campaign-play/hooks/useApprovedInvestigatorNames'
import { MaterialEntry, MaterialEntryList } from '@/scenario-preparation/components/material-entry/material-entry'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { holderStatusOf } from '@/scenario-preparation/services/itemHolderStatus'
import type { GiveItemContext, GiveItemRequest } from '@/scene-play/components/give-item-dialog/give-item-dialog'
import { MaterialLoadState } from '@/scene-play/components/material-load-state/material-load-state'
import { RevealTrigger } from '@/scene-play/components/reveal-trigger/reveal-trigger'
import { type RevealOpenContext, type RevealTarget } from '@/scene-play/hooks/useRevealFlow'
import { recipientsOfSubject, UNNAMED_INVESTIGATOR } from '@/scene-play/services/revealPresentation'
import {
  revealTargetOf,
  subjectIdOf,
  toRevealStatus,
  toRevealSubjects,
  type ToRevealSubject,
} from '@/scene-play/services/subTabGrouping'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { ItemLink } from '@/scenario-preparation/types/Item'
import { Button } from '@/shared/components/ui/button'

interface ToRevealSectionProps {
  campaignId: string
  scene: KeeperActiveScene
  /** Opens the layout-level reveal dialog for the entry's target, with the completion and focus context (21.7). */
  onReveal: (target: RevealTarget, context: RevealOpenContext) => void
  /** Opens the layout-level give dialog for the Item, with the focus context (22.3). */
  onGive: (request: GiveItemRequest, context: GiveItemContext) => void
}

/**
 * The "To reveal" sub-tab body (specs/scene-play/ux.md sections 21.4 and 22.1): Player-facing Handouts in stored order,
 * then Non-Player Entity links in link order, then linked Items in link order each followed by its Player-facing
 * Handouts, each while it has not reached every Investigator present. Each entry keeps its material-entry title into
 * its side panel, its reveal status line, and a "Reveal..." trigger; an Item entry joins "Held by {name}" to its status
 * once the holder names resolve and adds a "Give..." action. Keeper-facing Handouts live under "Keeper reference"
 * instead and never appear here.
 */
export function ToRevealSection({ campaignId, scene, onReveal, onGive }: ToRevealSectionProps) {
  const headingId = useId()
  const material = useScene(campaignId, scene.scenarioId, scene.sceneId, true)
  const holderNames = useApprovedInvestigatorNames(campaignId)

  if (material.isError || !material.data) {
    return <MaterialLoadState isError={material.isError} onRetry={() => void material.refetch()} />
  }

  const subjects = toRevealSubjects(
    material.data.handouts,
    material.data.nonPlayerEntityLinks,
    material.data.itemLinks,
    scene.reveals,
    scene.investigatorsPresent,
  )
  const entries = subjects.map((subject) => ({ subject, subjectId: subjectIdOf(subject), titleId: titleIdOf(subject) }))
  const handouts = entries.filter((entry) => entry.subject.type === 'handout')
  const entities = entries.filter((entry) => entry.subject.type === 'entity')
  const items = entries.filter((entry) => entry.subject.type === 'item' || entry.subject.type === 'itemHandout')

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
          {handouts.length > 0 && (
            <SubjectGroup title="Handouts" group={handouts} entries={entries} headingId={headingId} holderNames={holderNames.names} scene={scene} onReveal={onReveal} onGive={onGive} />
          )}
          {entities.length > 0 && (
            <SubjectGroup title="Non-Player Entities" group={entities} entries={entries} headingId={headingId} holderNames={holderNames.names} scene={scene} onReveal={onReveal} onGive={onGive} />
          )}
          {items.length > 0 && (
            <SubjectGroup title="Items" group={items} entries={entries} headingId={headingId} holderNames={holderNames.names} scene={scene} onReveal={onReveal} onGive={onGive} />
          )}
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

function titleIdOf(subject: ToRevealSubject): string {
  switch (subject.type) {
    case 'handout':
    case 'itemHandout':
      return `handout-link-${subject.handout.id}`
    case 'entity':
      return `entity-link-${subject.link.id}`
    case 'item':
      return `item-link-${subject.link.item.id}`
  }
}

/** The holder line of an Item entry, or null while no one holds it or the names have not resolved (22.1). */
function holderPartOf(link: ItemLink, names: Map<string, string> | undefined): string | null {
  if (link.item.holder === null || names === undefined) {
    return null
  }
  return holderStatusOf(link.item.holder, names.get(link.item.holder.investigatorId) ?? null)
}

interface SubjectRowProps {
  entry: SubjectEntry
  /** Every entry in list order, so the focus fallback spans the type groups (21.7). */
  entries: SubjectEntry[]
  headingId: string
  holderNames: Map<string, string> | undefined
  scene: KeeperActiveScene
  onReveal: (target: RevealTarget, context: RevealOpenContext) => void
  onGive: (request: GiveItemRequest, context: GiveItemContext) => void
}

/** One revealable entry: its reveal status joined to the Item holder line, a "Reveal..." trigger, and "Give..." for Items. */
function SubjectRow({ entry, entries, headingId, holderNames, scene, onReveal, onGive }: SubjectRowProps) {
  const fallbackIds = fallbackIdsFor(entries, entry, headingId)
  const statusText = statusTextFor(entry, scene, holderNames)
  const title = entryTitleOf(entry.subject)
  const alreadyRevealedIds = recipientsOfSubject(scene.reveals, entry.subjectId, scene.investigatorsPresent).map(
    (recipient) => recipient.id,
  )
  const revealTriggerId = `reveal-trigger-${entry.subjectId}`
  const itemLink = entry.subject.type === 'item' ? entry.subject.link : null

  return (
    <MaterialEntry
      subject={entry.subject}
      titleId={entry.titleId}
      headingLevel={4}
      status={statusText === '' ? undefined : <p className="text-sm break-words text-muted-foreground">{statusText}</p>}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <RevealTrigger
            triggerId={revealTriggerId}
            title={title}
            onReveal={() => onReveal(revealTargetOf(entry.subject, revealTriggerId), { alreadyRevealedIds, fallbackIds })}
          />
          {itemLink === null ? null : (
            <Button
              id={`give-trigger-${entry.subjectId}`}
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Give ${itemLink.item.name}`}
              onClick={() => {
                const holder = itemLink.item.holder
                return onGive(
                  {
                    itemId: entry.subjectId,
                    itemName: itemLink.item.name,
                    holder:
                      holder === null
                        ? null
                        : { id: holder.investigatorId, name: holderNames?.get(holder.investigatorId) ?? UNNAMED_INVESTIGATOR },
                    triggerId: `give-trigger-${entry.subjectId}`,
                  },
                  { fallbackIds },
                )
              }}
            >
              Give...
            </Button>
          )}
        </div>
      }
    />
  )
}

/** The focus fallback for an entry: the neighbouring titles, then the section heading (21.7). */
function fallbackIdsFor(entries: SubjectEntry[], entry: SubjectEntry, headingId: string): string[] {
  const index = entries.indexOf(entry)
  const next = entries[index + 1]?.titleId
  const previous = entries[index - 1]?.titleId
  return [...(next === undefined ? [] : [next]), ...(previous === undefined ? [] : [previous]), headingId]
}

/** The reveal status joined to the Item holder line, once the holder names resolve (22.1). */
function statusTextFor(entry: SubjectEntry, scene: KeeperActiveScene, holderNames: Map<string, string> | undefined): string {
  const revealStatus = toRevealStatus(entry.subjectId, scene.reveals, scene.investigatorsPresent)
  const itemLink = entry.subject.type === 'item' ? entry.subject.link : null
  const statusParts = itemLink === null ? [revealStatus] : [revealStatus, holderPartOf(itemLink, holderNames)]
  return statusParts.filter((part) => part !== null).join(' . ')
}

function entryTitleOf(subject: ToRevealSubject): string {
  switch (subject.type) {
    case 'handout':
    case 'itemHandout':
      return subject.handout.title
    case 'entity':
      return subject.link.playerFacingName
    case 'item':
      return subject.link.item.name
  }
}

function SubjectGroup({
  title,
  group,
  entries,
  headingId,
  holderNames,
  scene,
  onReveal,
  onGive,
}: {
  title: string
  group: SubjectEntry[]
  /** Every entry in list order, so the focus fallback spans the type groups (21.7). */
  entries: SubjectEntry[]
  headingId: string
  holderNames: Map<string, string> | undefined
  scene: KeeperActiveScene
  onReveal: (target: RevealTarget, context: RevealOpenContext) => void
  onGive: (request: GiveItemRequest, context: GiveItemContext) => void
}) {
  const groupId = useId()

  return (
    <section aria-labelledby={groupId} className="flex flex-col gap-3">
      <h3 id={groupId} className="text-base font-semibold">
        {title}
      </h3>
      <MaterialEntryList as="ul">
        {group.map((entry) => (
          <SubjectRow
            key={entry.subjectId}
            entry={entry}
            entries={entries}
            headingId={headingId}
            holderNames={holderNames}
            scene={scene}
            onReveal={onReveal}
            onGive={onGive}
          />
        ))}
      </MaterialEntryList>
    </section>
  )
}
