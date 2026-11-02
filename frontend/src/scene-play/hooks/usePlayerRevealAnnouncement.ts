import { useRevealAnnouncement, type RevealAnnouncement } from '@/scene-play/hooks/useReveals'
import type { ActiveScene } from '@/scene-play/types/ActiveScene'

/**
 * Announces the Reveals that reach a present Player's Investigator after the first load (specs/scene-play/ux.md section 14). The
 * Keeper, an absent Player, and a page with no Active Scene announce nothing.
 */
export function usePlayerRevealAnnouncement(scene: ActiveScene | null | undefined, isKeeper: boolean, isFetchedAfterMount: boolean): RevealAnnouncement {
  const present = !isKeeper && scene?.kind === 'present-player' ? scene : null

  return useRevealAnnouncement(present?.reveals, present?.investigatorsPresent.find((investigator) => investigator.isYours)?.name ?? null, isFetchedAfterMount)
}
