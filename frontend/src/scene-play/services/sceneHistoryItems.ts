import type { RollRequest } from '@/roll-requests/types/RollRequest'

/**
 * A Roll Request with its Cancelled rows removed, or null when no rows are left (specs/roll-requests/ux.md RR-UX-24).
 * The Scene History host filters before rendering; the card view renders whatever rows it is given.
 */
export function withoutCancelledRolls(request: RollRequest): RollRequest | null {
  const kept = request.requestedRolls.filter((roll) => roll.status !== 'Cancelled')
  return kept.length === 0 ? null : { ...request, requestedRolls: kept }
}

/** One entry of a Scene's combined newest-first list (specs/scene-play/ux.md SPL-UX-73). */
export type SceneHistoryItem<TReveal> =
  | { kind: 'reveal'; occurredAt: string; id: string; reveal: TReveal }
  | { kind: 'rollRequest'; occurredAt: string; id: string; request: RollRequest }

/**
 * A Scene's Reveals and Roll Requests in one list, newest first: Reveals by Revealed time, Roll Requests by request
 * time. On equal times the Reveal comes first, then items order by id (specs/scene-play/ux.md SPL-UX-73).
 */
export function historyItems<TReveal extends { revealedAt: string; revealId: string }>(
  reveals: readonly TReveal[],
  rollRequests: readonly RollRequest[],
): SceneHistoryItem<TReveal>[] {
  return [
    ...reveals.map((reveal): SceneHistoryItem<TReveal> => ({ kind: 'reveal', occurredAt: reveal.revealedAt, id: reveal.revealId, reveal })),
    ...rollRequests.map((request): SceneHistoryItem<TReveal> => ({ kind: 'rollRequest', occurredAt: request.createdAt, id: request.id, request })),
  ].sort(compareItems)
}

function compareItems<TReveal>(a: SceneHistoryItem<TReveal>, b: SceneHistoryItem<TReveal>): number {
  return (
    b.occurredAt.localeCompare(a.occurredAt) ||
    (a.kind === b.kind ? 0 : a.kind === 'reveal' ? -1 : 1) ||
    a.id.localeCompare(b.id)
  )
}
