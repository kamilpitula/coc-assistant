import type { HandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { sceneHandoutContext } from '@/scenario-preparation/services/handoutOwnerContext'
import type { HandoutOwnerContext } from '@/scenario-preparation/types/HandoutOwnerContext'
import type { Scene, SceneStatus } from '@/scenario-preparation/types/Scene'

/** The Scene that owns the Handouts in the Handout tests. */
export const sceneOwner: HandoutOwner = { type: 'scene', campaignId: 'c1', scenarioId: 's1', sceneId: 'a1' }

/** The Item that owns the Handouts in the Handout tests. */
export const itemOwner: HandoutOwner = { type: 'item', campaignId: 'c1', itemId: 'k1' }

/** "The Corbitt House" in the given status, as the Handout screens see it once it has loaded. */
export function corbittHouse(status: SceneStatus): Scene {
  return {
    id: 'a1',
    title: 'The Corbitt House',
    location: '',
    keeperNotes: null,
    status,
    startedAt: status === 'Prepared' ? null : '2026-10-12T19:40:00Z',
    finishedAt: status === 'Finished' ? '2026-10-12T21:05:00Z' : null,
    nonPlayerEntityLinks: [],
    itemLinks: [],
    handouts: [],
  }
}

/** What the Handout screens may do with the Handouts of "The Corbitt House" in the given status. */
export function sceneContext(status: SceneStatus, refetchOwner: () => void = () => undefined): HandoutOwnerContext {
  return sceneHandoutContext(corbittHouse(status), refetchOwner)
}
