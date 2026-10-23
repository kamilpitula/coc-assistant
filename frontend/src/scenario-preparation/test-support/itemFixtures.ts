import type { Item, ItemScene } from '@/scenario-preparation/types/Item'
import type { SceneStatus } from '@/scenario-preparation/types/Scene'

/** "The Corbitt House" of the Scenario "The Haunting", linking an Item, in the given status. */
export function itemScene(status: SceneStatus): ItemScene {
  return { scenarioId: 's1', scenarioTitle: 'The Haunting', id: 'a1', title: 'The Corbitt House', status }
}

/** "Walter Corbitt's diary", linked to no Scene, with no Handouts and no Keeper notes. */
export const diary: Item = {
  id: 'k1',
  name: "Walter Corbitt's diary",
  playerFacingDescription: { root: { type: 'root', children: [] } },
  keeperNotes: null,
  holder: null,
  handouts: [],
  scenes: [],
}

/** The diary linked to one Scene in the given status. */
export function diaryLinkedTo(status: SceneStatus): Item {
  return { ...diary, scenes: [itemScene(status)] }
}
