import { describe, expect, it } from 'vitest'

import type { ItemSummary } from '@/scenario-preparation/types/Item'

import { describeItemCount, describeSceneCount, filterItems } from './itemFilter'

// specs/scenario-preparation/ux.md sections 60, 61, 64.2; SP-UX-90, SP-UX-91, SP-UX-98.
const diary: ItemSummary = { id: 'k1', name: "Walter Corbitt's diary", sceneCount: 2 }
const key: ItemSummary = { id: 'k2', name: 'The cellar key', sceneCount: 0 }
const receipt: ItemSummary = { id: 'k3', name: 'Caf\u00e9 receipt', sceneCount: 1 }

describe('filterItems', () => {
  it('sorts the Items by name and leaves the loaded list alone', () => {
    const items = [diary, key, receipt]

    expect(filterItems(items, '').map((item) => item.id)).toEqual(['k3', 'k2', 'k1'])
    expect(items.map((item) => item.id)).toEqual(['k1', 'k2', 'k3'])
  })

  it('keeps the Items whose name contains the search, regardless of case and accents', () => {
    expect(filterItems([diary, key, receipt], 'CORBITT').map((item) => item.id)).toEqual(['k1'])
    expect(filterItems([diary, key, receipt], 'cafe').map((item) => item.id)).toEqual(['k3'])
    expect(filterItems([diary, key, receipt], 'zzz')).toEqual([])
  })
})

describe('describeItemCount', () => {
  it('counts the Items with a singular form and says nothing for none (SP-UX-90)', () => {
    expect(describeItemCount([diary])).toBe('1 Item.')
    expect(describeItemCount([diary, key, receipt])).toBe('3 Items.')
    expect(describeItemCount([])).toBe('')
  })
})

describe('describeSceneCount', () => {
  it('says how many Scenes link the Item (SP-UX-91)', () => {
    expect(describeSceneCount(0)).toBe('Not linked to a Scene')
    expect(describeSceneCount(1)).toBe('Linked to 1 Scene')
    expect(describeSceneCount(2)).toBe('Linked to 2 Scenes')
  })
})
