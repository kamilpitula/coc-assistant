import type { HandoutSummary } from '@/scenario-preparation/types/Handout'
import { HANDOUT_KIND_LABELS, HANDOUT_VISIBILITY_LABELS } from '@/scenario-preparation/types/Handout'
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
 * (PBI-SPL-005 design record D2). From PBI-SPL-003 Items join this union.
 */
export type ToRevealSubject = { type: 'handout'; handout: HandoutSummary } | { type: 'entity'; link: NonPlayerEntityLink }

/**
 * What "To reveal" lists (specs/scene-play/ux.md section 21.4): Player-facing Handouts in stored order, then
 * Non-Player Entity links in link order, each while it has not reached every Investigator present.
 */
export function toRevealSubjects(
  handouts: HandoutSummary[],
  links: NonPlayerEntityLink[],
  reveals: KeeperReveal[],
  investigatorsPresent: InvestigatorPresent[],
): ToRevealSubject[] {
  return [
    ...handouts.filter((handout) => handout.visibility === 'PlayerFacing').map((handout) => ({ type: 'handout' as const, handout })),
    ...links.map((link) => ({ type: 'entity' as const, link })),
  ].filter((subject) => !isRevealedToEveryonePresent(subjectIdOf(subject), reveals, investigatorsPresent))
}

/** What "Keeper reference" lists (specs/scene-play/ux.md section 21.5): Keeper-facing Handouts, then every link. */
export function keeperReferenceSubjects(
  handouts: HandoutSummary[],
  links: NonPlayerEntityLink[],
): {
  handouts: HandoutSummary[]
  links: NonPlayerEntityLink[]
} {
  return { handouts: handouts.filter((handout) => handout.visibility === 'KeeperFacing'), links: [...links] }
}

function subjectIdOf(subject: ToRevealSubject): string {
  return subject.type === 'handout' ? subject.handout.id : subject.link.id
}

/**
 * The reveal dialog target of a subject: the Handout's kind and visibility summary, or the entity's name with the
 * Non-Player Entity summary (specs/scene-play/ux.md section 21.7). The caller names the trigger button's id.
 */
export function revealTargetOf(subject: ToRevealSubject, triggerId: string): RevealTarget {
  if (subject.type === 'handout') {
    const { handout } = subject
    return {
      subjectType: 'Handout',
      subjectId: handout.id,
      title: handout.title,
      summary: `${HANDOUT_KIND_LABELS[handout.kind]} . ${HANDOUT_VISIBILITY_LABELS[handout.visibility]}`,
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
