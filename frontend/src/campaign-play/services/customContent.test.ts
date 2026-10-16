import { describe, expect, it } from 'vitest'

import { sheetView } from '@/campaign-play/test-support/characterSheetFixtures'

import { customContentNotes } from './customContent'

const weapon = { name: 'Knife', skill: null, damage: null, attacks: null, range: null, ammo: null, malfunction: null, isCustom: true }

/** specs/character-sheet/ux.md section 7.1: custom content the Keeper judges, listed under "Worth checking". */
describe('customContentNotes', () => {
  it('lists nothing for a catalog occupation without weapons', () => {
    expect(customContentNotes(sheetView())).toEqual([])
  })

  it('UX-30: names the custom occupation and counts the custom weapons', () => {
    const occupation = { ...sheetView().occupation!, catalogId: null, name: 'Bootlegger', isCustom: true }

    expect(customContentNotes(sheetView({ occupation, weapons: [weapon, weapon] }))).toEqual(['Custom occupation: Bootlegger', '2 custom weapons'])
    expect(customContentNotes(sheetView({ weapons: [weapon] }))).toEqual(['1 custom weapon'])
  })
})
