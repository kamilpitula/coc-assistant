import type { HandoutSummary } from '@/scenario-preparation/types/Handout'
import { HANDOUT_KIND_LABELS, HANDOUT_VISIBILITY_LABELS } from '@/scenario-preparation/types/Handout'
import type { ItemLink } from '@/scenario-preparation/types/Item'
import type { NonPlayerEntityLink } from '@/scenario-preparation/types/Scene'
import { joinNames, recipientsOfSubject } from '@/scene-play/services/revealPresentation'
import type { RevealTarget } from '@/scene-play/hooks/useRevealFlow'
import type { InvestigatorPresent } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'

/**
 * Whether a subject has left "To reveal": its Reveals reach every Investigator present (specs/scene-play/ux.md section
 * 21.4). Recipients are unioned across the subject's Reveals, so an Investigator added later brings the subject back
 * until they receive it, and removing one can complete it.
 */
export function isRevealedToEveryonePresent(
  subjectId: string,
  reveals: KeeperReveal[],
  investigatorsPresent: InvestigatorPresent[],
): boolean {
  const receivedIds = new Set(recipientsOfSubject(reveals, subjectId, investigatorsPresent).map((recipient) => recipient.id))
  return investigatorsPresent.every((investigator) => receivedIds.has(investigator.id))
}

/**
 * A Player-facing subject listed under "To reveal": its own record, in the shape a material entry takes without a page
 * (PBI-SPL-005 design record D2). From PBI-SPL-003 Items join this union: an Item names its link, and an Item Handout names
 * its link and itself, so it shows "Item: {name}" and reveals like a Handout (specs/scene-play/ux.md section 22.1).
 */
export type ToRevealSubject =
  | { type: 'handout'; handout: HandoutSummary }
  | { type: 'entity'; link: NonPlayerEntityLink }
  | { type: 'item'; link: ItemLink }
  | { type: 'itemHandout'; link: ItemLink; handout: HandoutSummary }

/**
 * What "To reveal" lists (specs/scene-play/ux.md sections 21.4 and 22.1): Player-facing Handouts in stored order, then
 * Non-Player Entity links in link order, then linked Items in link order with each Item's Player-facing Handouts in stored
 * order after it, each while it has not reached every Investigator present. A give's Reveal counts as a Reveal of the Item
 * to its holder.
 */
export function toRevealSubjects(
  handouts: HandoutSummary[],
  links: NonPlayerEntityLink[],
  itemLinks: ItemLink[],
  reveals: KeeperReveal[],
  investigatorsPresent: InvestigatorPresent[],
): ToRevealSubject[] {
  return [
    ...handouts.filter((handout) => handout.visibility === 'PlayerFacing').map((handout) => ({ type: 'handout' as const, handout })),
    ...links.map((link) => ({ type: 'entity' as const, link })),
    ...itemLinks.flatMap((link): ToRevealSubject[] => [
      { type: 'item', link },
      ...link.item.handouts
        .filter((handout) => handout.visibility === 'PlayerFacing')
        .map((handout): ToRevealSubject => ({ type: 'itemHandout', link, handout })),
    ]),
  ].filter((subject) => !isRevealedToEveryonePresent(subjectIdOf(subject), reveals, investigatorsPresent))
}

/** What "Keeper reference" lists (specs/scene-play/ux.md sections 21.5 and 22.2): Keeper-facing Handouts, then every link, then every linked Item. */
export function keeperReferenceSubjects(
  handouts: HandoutSummary[],
  links: NonPlayerEntityLink[],
  itemLinks: ItemLink[],
): {
  handouts: HandoutSummary[]
  links: NonPlayerEntityLink[]
  items: ItemLink[]
} {
  return { handouts: handouts.filter((handout) => handout.visibility === 'KeeperFacing'), links: [...links], items: [...itemLinks] }
}

/**
 * What "Revealed" lists (specs/scene-play/ux.md section 21.6): this Scene's Reveals, newest first, but only of subjects
 * that reached every Investigator present. A partly revealed subject stays on "To reveal" until the last one receives
 * it (SPL-UX-43); adding an Investigator present moves its subject back off until they receive it (SPL-UX-44).
 */
export function revealsToEveryonePresent(reveals: KeeperReveal[], investigatorsPresent: InvestigatorPresent[]): KeeperReveal[] {
  return reveals.filter((reveal) => isRevealedToEveryonePresent(reveal.subjectId, reveals, investigatorsPresent))
}

/** The Reveal identity of a subject: the Item's id for an Item, the Handout's id for an Item Handout. */
// subjectIdOf stays an exhaustive switch while revealTargetOf groups the two Handout-shaped variants on purpose: same dialog target, different ids. This is a documented DRY exception.
export function subjectIdOf(subject: ToRevealSubject): string {
  switch (subject.type) {
    case 'handout':
      return subject.handout.id
    case 'entity':
      return subject.link.id
    case 'item':
      return subject.link.item.id
    case 'itemHandout':
      return subject.handout.id
  }
}

/**
 * The reveal dialog target of a subject: the Handout's kind and visibility summary, the entity's name with the
 * Non-Player Entity summary, the Item's name with the Item summary, or an Item Handout like a Handout (specs/scene-play/ux.md
 * sections 21.7 and 22.1). The caller names the trigger button's id.
 */
export function revealTargetOf(subject: ToRevealSubject, triggerId: string): RevealTarget {
  if (subject.type === 'handout' || subject.type === 'itemHandout') {
    const { handout } = subject
    return {
      subjectType: 'Handout',
      subjectId: handout.id,
      title: handout.title,
      summary: `${HANDOUT_KIND_LABELS[handout.kind]} . ${HANDOUT_VISIBILITY_LABELS[handout.visibility]}`,
      triggerId,
    }
  }
  if (subject.type === 'item') {
    return {
      subjectType: 'Item',
      subjectId: subject.link.item.id,
      title: subject.link.item.name,
      summary: 'Item',
      triggerId,
    }
  }
  return {
    subjectType: 'NonPlayerEntity',
    subjectId: subject.link.id,
    title: subject.link.playerFacingName,
    summary: 'Non-Player Entity',
    triggerId,
  }
}

/**
 * The "To reveal" status line of a subject: "Revealed to {names} . not yet: {names}", shown once anyone has received
 * it (specs/scene-play/ux.md section 21.4). Null while nobody has.
 */
export function toRevealStatus(
  subjectId: string,
  reveals: KeeperReveal[],
  investigatorsPresent: InvestigatorPresent[],
): string | null {
  const received = recipientsOfSubject(reveals, subjectId, investigatorsPresent)
  if (received.length === 0) {
    return null
  }
  const receivedIds = new Set(received.map((recipient) => recipient.id))
  const missing = investigatorsPresent.filter((investigator) => !receivedIds.has(investigator.id))
  const line = `Revealed to ${joinNames(received.map((recipient) => recipient.name))}`
  return missing.length === 0 ? line : `${line} . not yet: ${joinNames(missing.map((investigator) => investigator.name))}`
}
