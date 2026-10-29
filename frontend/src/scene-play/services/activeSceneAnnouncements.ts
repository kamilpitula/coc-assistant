import type { ActiveScene } from '@/scene-play/types/ActiveScene'

const isPresent = (scene: ActiveScene): boolean => scene.kind === 'present-player'

function changeWithinScene(previous: ActiveScene, next: ActiveScene): string | null {
  if (isPresent(previous) === isPresent(next)) {
    return null
  }

  return isPresent(next) ? `You're now taking part in ${next.title}.` : `You're no longer taking part in ${next.title}.`
}

/**
 * The text a Player hears when the Active Scene changes after the first load (specs/scene-play/ux.md section 4.4), or null
 * when nothing is to be announced. The Keeper is the only actor, so the Keeper's view never announces.
 */
export function announcementFor(previous: ActiveScene | null, next: ActiveScene | null): string | null {
  if (previous?.kind === 'keeper' || next?.kind === 'keeper') {
    return null
  }
  if (!previous) {
    return next ? `${next.title} started.` : null
  }
  if (!next) {
    return `${previous.title} finished.`
  }

  return previous.title === next.title ? changeWithinScene(previous, next) : `${next.title} started.`
}
