import { describe, expect, it } from 'vitest'

import type { ItemScene } from '@/scenario-preparation/types/Item'

import { isItemInPlay, ITEM_HANDOUT_DELETE_REFUSED, ITEM_HANDOUT_LOCKED, itemDeleteRefusal, itemInPlayReason } from './itemInPlay'

// Design record PBI-SP-008, D5: a Scene that links the Item is Active or Finished, or an Investigator holds it.
const sceneIn = (status: ItemScene['status']): ItemScene => ({ scenarioId: 's1', scenarioTitle: 'The Haunting', id: `a-${status}`, title: 'The Corbitt House', status })

describe('itemInPlayReason', () => {
  it('is null for an Item linked to no Scene', () => {
    expect(itemInPlayReason({ scenes: [], holder: null })).toBeNull()
    expect(isItemInPlay({ scenes: [], holder: null })).toBe(false)
  })

  it('is null for an Item linked only to Prepared Scenes', () => {
    expect(itemInPlayReason({ scenes: [sceneIn('Prepared'), sceneIn('Prepared')], holder: null })).toBeNull()
  })

  it.each(['Active', 'Finished'] as const)('is "played" for an Item linked to an %s Scene, whatever the other Scenes are', (status) => {
    expect(itemInPlayReason({ scenes: [sceneIn('Prepared'), sceneIn(status)], holder: null })).toBe('played')
    expect(isItemInPlay({ scenes: [sceneIn(status)], holder: null })).toBe(true)
  })

  it('is "held" for an Item an Investigator holds', () => {
    expect(itemInPlayReason({ scenes: [], holder: { investigatorId: 'i1' } })).toBe('held')
  })

  it('names the played Scene first when the Item is both played and held', () => {
    expect(itemInPlayReason({ scenes: [sceneIn('Active')], holder: { investigatorId: 'i1' } })).toBe('played')
  })
})

describe('copy', () => {
  it('says why an Item can not be deleted without the words "in play" (SP-UX-95, SP-UX-103)', () => {
    expect(itemDeleteRefusal("Walter Corbitt's diary", 'played')).toBe("Walter Corbitt's diary is part of a Scene that has been played, so it can't be deleted.")
    expect(itemDeleteRefusal("Walter Corbitt's diary", 'held')).toBe("Walter Corbitt's diary is held by an Investigator, so it can't be deleted.")
  })

  it('says why the Handouts of an Item can not be deleted (SP-UX-100)', () => {
    expect(ITEM_HANDOUT_LOCKED.played).toBe("This Item is part of a Scene that has been played, so its Handouts can't be deleted.")
    expect(ITEM_HANDOUT_LOCKED.held).toBe("This Item is held by an Investigator, so its Handouts can't be deleted.")
    expect(ITEM_HANDOUT_DELETE_REFUSED).toBe("This Item is now part of a Scene that has been played, so this Handout can't be deleted.")
  })
})
