import { describe, expect, it } from 'vitest'

import { SCENARIO_FIELD_MESSAGES, validateScenarioForm } from './scenarioForm'

// specs/scenario-preparation/ux.md sections 4 and 6; SP-UX-5.
describe('validateScenarioForm', () => {
  it('trims both fields and accepts them', () => {
    expect(validateScenarioForm({ title: '  The Haunting ', keeperNotes: ' Cellar key. ' })).toEqual({
      success: true,
      data: { title: 'The Haunting', keeperNotes: 'Cellar key.' },
    })
  })

  it('accepts empty Keeper notes', () => {
    expect(validateScenarioForm({ title: 'The Haunting', keeperNotes: '' })).toEqual({
      success: true,
      data: { title: 'The Haunting', keeperNotes: '' },
    })
  })

  it.each(['', '   \t'])('asks for a title when it is empty or whitespace (%j)', (title) => {
    expect(validateScenarioForm({ title, keeperNotes: '' })).toEqual({ success: false, errors: { title: 'Enter a title.' } })
  })

  it('accepts a 200-character title and refuses 201', () => {
    expect(validateScenarioForm({ title: 'a'.repeat(200), keeperNotes: '' }).success).toBe(true)
    expect(validateScenarioForm({ title: 'a'.repeat(201), keeperNotes: '' })).toEqual({
      success: false,
      errors: { title: 'Title must be 200 characters or fewer.' },
    })
  })

  it('accepts 10,000 characters of Keeper notes and refuses 10,001', () => {
    expect(validateScenarioForm({ title: 'T', keeperNotes: 'n'.repeat(10_000) }).success).toBe(true)
    expect(validateScenarioForm({ title: 'T', keeperNotes: 'n'.repeat(10_001) })).toEqual({
      success: false,
      errors: { keeperNotes: 'Keeper notes must be 10,000 characters or fewer.' },
    })
  })

  it('reports every invalid field at once', () => {
    expect(validateScenarioForm({ title: '', keeperNotes: 'n'.repeat(10_001) })).toEqual({
      success: false,
      errors: { title: 'Enter a title.', keeperNotes: 'Keeper notes must be 10,000 characters or fewer.' },
    })
  })

  it('exposes the messages the server errors map to', () => {
    expect(SCENARIO_FIELD_MESSAGES.title).toBe('Enter a title.')
    expect(SCENARIO_FIELD_MESSAGES.keeperNotes).toBe('Keeper notes must be 10,000 characters or fewer.')
  })
})
