import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { emptyInputs, occupationCatalog, rules, sheetView, skillCatalog, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'
import type { CharacterSheetInputs } from '@/campaign-play/types/CharacterSheet'

import { OccupationStep } from './occupation-step'

// STR 60, DEX 60, EDU 50 after age effects in the fixture sheet.
const sheet = sheetView()

function renderStep(inputs: CharacterSheetInputs, onAction = vi.fn(), errors: Record<string, string> = {}) {
  render(
    <OccupationStep
      inputs={inputs}
      errors={errors}
      onAction={onAction}
      onBlur={vi.fn()}
      rules={rules}
      sheet={sheet}
      occupationCatalog={occupationCatalog}
      skillCatalog={skillCatalog}
    />,
  )
  return onAction
}

/** specs/character-sheet/ux.md section 6.4 and its Quick fire refinement in 6.5a; docs/game-rules section 7.1. */
describe('OccupationStep', () => {
  it('lists the occupations with their Credit Rating range and points from this Investigator', () => {
    renderStep({ ...emptyInputs, occupation: null })

    const antiquarian = screen.getByRole('radio', { name: /Antiquarian/ })
    expect(antiquarian).toHaveAccessibleName('Antiquarian Credit Rating 30-70 200 occupation points')
    expect(screen.getByRole('radio', { name: /Custom occupation/ })).toBeInTheDocument()
  })

  it('filters the occupations by the search', async () => {
    renderStep({ ...emptyInputs, occupation: null })

    await userEvent.type(screen.getByLabelText('Search occupations'), 'police')

    expect(screen.queryByRole('radio', { name: /Antiquarian/ })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Police Detective/ })).toBeInTheDocument()
  })

  it('selects a catalog occupation', async () => {
    const onAction = renderStep({ ...emptyInputs, occupation: null })

    await userEvent.click(screen.getByRole('radio', { name: /Antiquarian/ }))

    expect(onAction).toHaveBeenCalledWith({ type: 'occupation', catalogId: 'antiquarian', custom: null })
  })

  it('section 7.1: offers the formula choice with the points of each option', async () => {
    const inputs = { ...validInputs, occupation: { catalogId: 'police-detective', custom: null, formulaCharacteristics: [], skillChoices: [] } }
    const onAction = renderStep(inputs)

    expect(screen.getByRole('radio', { name: 'EDU x 2 + DEX x 2 = 220' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'EDU x 2 + STR x 2 = 220' }))

    expect(onAction).toHaveBeenCalledWith({ type: 'formulaCharacteristic', index: 1, value: 'STR' })
  })

  it('hides occupation points under Quick fire', () => {
    renderStep({ ...validInputs, creationMethod: 'QuickFire', occupation: { catalogId: 'police-detective', custom: null, formulaCharacteristics: [], skillChoices: [] } })

    expect(screen.getByRole('radio', { name: /Antiquarian/ })).toHaveAccessibleName('Antiquarian Credit Rating 30-70')
    expect(screen.queryByRole('radio', { name: /EDU x 2/ })).not.toBeInTheDocument()
  })

  it('reveals the custom occupation fields with the Keeper review notice', async () => {
    const custom = { name: null, formulaId: null, skills: [], creditRatingMin: null, creditRatingMax: null }
    const onAction = renderStep({ ...emptyInputs, occupation: { catalogId: null, custom, formulaCharacteristics: [], skillChoices: [] } })

    expect(screen.getByText('Your Keeper will review a custom occupation before approving your Investigator.')).toBeInTheDocument()
    expect(screen.getAllByRole('combobox', { name: /^Occupation skill \d$/ })).toHaveLength(8)
    await userEvent.type(screen.getByLabelText('Name'), 'B')

    expect(onAction).toHaveBeenCalledWith({ type: 'occupation', catalogId: null, custom: { ...custom, name: 'B' } })
  })
})
