import { describe, expect, it } from 'vitest'

import { CREATE_MESSAGES, validateCreateNonPlayerEntityForm } from './nonPlayerEntityForm'

// specs/scenario-preparation/ux.md section 24; SP-UX-31.

describe('validateCreateNonPlayerEntityForm', () => {
  it('accepts a Human NPC with a trimmed name and a whole age', () => {
    expect(validateCreateNonPlayerEntityForm({ type: 'HumanNpc', name: '  Mr. Knott ', age: ' 62 ' })).toEqual({
      success: true,
      data: { type: 'HumanNpc', name: 'Mr. Knott', age: 62 },
    })
  })

  it('accepts the edges of the age range', () => {
    expect(validateCreateNonPlayerEntityForm({ type: 'HumanNpc', name: 'A', age: '0' })).toMatchObject({ success: true })
    expect(validateCreateNonPlayerEntityForm({ type: 'HumanNpc', name: 'A', age: '150' })).toMatchObject({ success: true })
  })

  it('reports Type, Name, and Age together when all are missing for a Human NPC', () => {
    expect(validateCreateNonPlayerEntityForm({ type: null, name: '', age: '' })).toEqual({
      success: false,
      errors: { type: CREATE_MESSAGES.type, name: CREATE_MESSAGES.nameRequired },
    })
    expect(validateCreateNonPlayerEntityForm({ type: 'HumanNpc', name: ' ', age: '' })).toEqual({
      success: false,
      errors: { name: CREATE_MESSAGES.nameRequired, age: CREATE_MESSAGES.ageRequired },
    })
  })

  it('refuses a name over 200 characters and accepts 200', () => {
    expect(validateCreateNonPlayerEntityForm({ type: 'HumanNpc', name: 'x'.repeat(201), age: '30' })).toMatchObject({
      errors: { name: 'Name must be 200 characters or fewer.' },
    })
    expect(validateCreateNonPlayerEntityForm({ type: 'HumanNpc', name: 'x'.repeat(200), age: '30' })).toMatchObject({ success: true })
  })

  it.each(['151', '-1', '6x', '6.5', 'abc'])('refuses the age "%s"', (age) => {
    expect(validateCreateNonPlayerEntityForm({ type: 'HumanNpc', name: 'A', age })).toEqual({
      success: false,
      errors: { age: CREATE_MESSAGES.ageInvalid },
    })
  })

  it('ignores Age for a Mythos Creature and sends none', () => {
    expect(validateCreateNonPlayerEntityForm({ type: 'MythosCreature', name: 'Ghoul', age: 'junk' })).toEqual({
      success: true,
      data: { type: 'MythosCreature', name: 'Ghoul', age: null },
    })
  })
})
