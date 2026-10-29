import { HANDOUT_KIND_LABELS } from '@/scenario-preparation/types/Handout'
import type { InvestigatorPresent } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal, PlayerReveal } from '@/scene-play/types/Reveal'

export const UNNAMED_INVESTIGATOR = 'Unnamed Investigator'

/** "A", "A and B", or "A, B, and C" (specs/scene-play/ux.md section 17). A missing name is "Unnamed Investigator". */
export function joinNames(names: (string | null)[]): string {
  const shown = names.map((name) => name ?? UNNAMED_INVESTIGATOR)
  if (shown.length <= 2) {
    return shown.join(' and ')
  }
  return `${shown.slice(0, -1).join(', ')}, and ${shown[shown.length - 1]}`
}

/** What a Reveal shows: its Handout kind as the Keeper knows it, or "Non-Player Entity" (section 14). */
export function revealKindLabel(reveal: PlayerReveal): string {
  return reveal.handoutKind ? HANDOUT_KIND_LABELS[reveal.handoutKind] : 'Non-Player Entity'
}

/**
 * The Investigators that received a subject in this Scene: the union of the recipients of its Reveals, present ones first in
 * roster order (the order of the Investigators present), then any who are no longer present.
 */
export function recipientsOfSubject(reveals: KeeperReveal[], subjectId: string, present: InvestigatorPresent[]): InvestigatorPresent[] {
  const received = new Map<string, InvestigatorPresent>()
  for (const reveal of reveals.filter((candidate) => candidate.subjectId === subjectId)) {
    for (const recipient of reveal.recipients) {
      received.set(recipient.id, recipient)
    }
  }

  const presentIds = new Set(present.map((investigator) => investigator.id))
  return [...present.filter((investigator) => received.has(investigator.id)), ...[...received.values()].filter((recipient) => !presentIds.has(recipient.id))]
}

/** The names of the Investigators a Reveal reached, in the order the Keeper lists them. */
export function recipientNames(reveal: KeeperReveal): string {
  return joinNames(reveal.recipients.map((recipient) => recipient.name))
}

/**
 * What the Player hears when a refetch after the first load finds Reveals it did not have: "New for {name}: {title}." for one,
 * "{n} new for {name}." for several, and null when there are none (specs/scene-play/ux.md section 14).
 */
export function newRevealAnnouncement(previousIds: ReadonlySet<string>, reveals: PlayerReveal[], investigatorName: string | null): string | null {
  const fresh = reveals.filter((reveal) => !previousIds.has(reveal.revealId))
  const name = investigatorName ?? UNNAMED_INVESTIGATOR
  if (fresh.length === 0) {
    return null
  }
  return fresh.length === 1 ? `New for ${name}: ${fresh[0].title}.` : `${fresh.length} new for ${name}.`
}

/** The time of a Reveal as "19:52" (section 14). */
export function formatRevealTime(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(iso))
}

/** The date and time of a Clue as "28 Oct 2026, 19:52" (section 15). */
export function formatClueTime(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}
