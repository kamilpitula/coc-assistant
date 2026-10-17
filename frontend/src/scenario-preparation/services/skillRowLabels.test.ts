import { describe, expect, it } from 'vitest'

import type { SkillCatalog } from '@/campaign-play/types/RuleData'

import { combatFamilyOf, describeSkill, skillRowLabel, skillRowName, specializationsOf } from './skillRowLabels'

// specs/scenario-preparation/ux.md section 25.4; SP-UX-44, SP-A11Y-27.

const catalog = {
  era: '1920s',
  skills: [],
  closedFamilies: [
    { skill: 'Fighting', specializations: [{ specialization: 'Brawl', base: { kind: 'fixed', value: 25 } }] },
    { skill: 'Firearms', specializations: [{ specialization: 'Handgun', base: { kind: 'fixed', value: 20 } }] },
  ],
  openFamilies: [],
  specializationSuggestions: {},
} as SkillCatalog

describe('combatFamilyOf', () => {
  it('knows Fighting and Firearms in any letter case and nothing else', () => {
    expect(combatFamilyOf('Fighting')).toBe('Fighting')
    expect(combatFamilyOf(' firearms ')).toBe('Firearms')
    expect(combatFamilyOf('Spot Hidden')).toBeNull()
    expect(combatFamilyOf('')).toBeNull()
  })
})

describe('specializationsOf', () => {
  it('lists the family from the catalog and is null while the catalog is unavailable', () => {
    expect(specializationsOf('Fighting', catalog)).toEqual(['Brawl'])
    expect(specializationsOf('Firearms', catalog)).toEqual(['Handgun'])
    expect(specializationsOf('Firearms', undefined)).toBeNull()
  })
})

describe('skill row names', () => {
  it('writes the name with its specialization, or "skill n" while unnamed', () => {
    expect(skillRowName({ name: 'Firearms', specialization: 'Handgun' })).toBe('Firearms (Handgun)')
    expect(skillRowName({ name: 'Spot Hidden', specialization: ' ' })).toBe('Spot Hidden')
    expect(skillRowName({ name: ' ', specialization: '' })).toBeNull()
    expect(skillRowLabel({ name: '', specialization: '' }, 2)).toBe('skill 3')
    expect(skillRowLabel({ name: 'Listen', specialization: '' }, 0)).toBe('Listen')
  })
})

describe('describeSkill', () => {
  it('writes a specialization in brackets', () => {
    expect(describeSkill({ name: 'Firearms', specialization: 'Handgun' })).toBe('Firearms (Handgun)')
    expect(describeSkill({ name: 'Listen', specialization: null })).toBe('Listen')
  })
})
