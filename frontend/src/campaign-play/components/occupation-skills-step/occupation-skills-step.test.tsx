import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { occupationCatalog, rules, sheetView, skill, skillCatalog, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'
import type { CharacterSheetInputs } from '@/campaign-play/types/CharacterSheet'

import { OccupationSkillsStep } from './occupation-skills-step'

function renderStep(inputs: CharacterSheetInputs, onAction = vi.fn(), errors: Record<string, string> = {}) {
  render(
    <OccupationSkillsStep
      inputs={inputs}
      errors={errors}
      onAction={onAction}
      onBlur={vi.fn()}
      rules={rules}
      sheet={sheetView()}
      occupationCatalog={occupationCatalog}
      skillCatalog={skillCatalog}
    />,
  )
  return onAction
}

/** specs/character-sheet/ux.md sections 6.5 and 6.5a; docs/game-rules sections 7.2 and 18; UX-7. */
describe('OccupationSkillsStep', () => {
  it('offers a choice control for each open slot', async () => {
    const onAction = renderStep(validInputs)

    expect(screen.getByRole('combobox', { name: 'Art/Craft specialization' })).toHaveValue('Painting')
    await userEvent.click(screen.getByRole('combobox', { name: 'Choose 1 interpersonal skill' }))
    await userEvent.click(screen.getByRole('option', { name: 'Persuade' }))

    expect(onAction).toHaveBeenCalledWith({ type: 'skillChoice', slot: 5, picks: [skill('Persuade')] })
  })

  it('lists Credit Rating first with its range, then the occupation skills with their points', async () => {
    const onAction = renderStep(validInputs)

    const rows = within(screen.getByRole('table', { name: 'Occupation skills' })).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Credit RatingMust be between 30 and 70')
    expect(rows).toHaveLength(9)
    expect(screen.getByLabelText('Library Use, occupation points')).toHaveValue(50)
    await userEvent.type(screen.getByLabelText('History, occupation points'), '4')

    expect(onAction).toHaveBeenCalledWith({ type: 'skillPoints', skill: skill('History'), column: 'occupationPoints', value: 4 })
  })

  it('shows the occupation points left from the budget and the points entered', () => {
    renderStep(validInputs)

    expect(screen.getByText('Occupation points left: 120 of 200')).toBeInTheDocument()
  })

  it('UX-7: shows an overspent budget as an error on the step', () => {
    renderStep(validInputs, vi.fn(), { occupationPoints: "You've spent 200 occupation points. You have 160." })

    expect(screen.getByText("You've spent 200 occupation points. You have 160.")).toBeInTheDocument()
  })

  it('section 18: assigns Quick fire values, with Credit Rating at its value and the freed value going to one more skill', async () => {
    const onAction = vi.fn()
    const inputs: CharacterSheetInputs = {
      ...validInputs,
      creationMethod: 'QuickFire',
      skills: [],
      quickFire: { values: [{ ...skill('Credit Rating'), value: 30 }, { ...skill('Appraise'), value: 70 }], personalInterests: [] },
    }
    renderStep(inputs, onAction)

    expect(screen.getByText('Must be 30 for this occupation')).toBeInTheDocument()
    expect(screen.getByText('Values left to assign: 60, 60, 50, 50, 50, 40, 40, 40')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Extra skill for the freed 40' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox', { name: 'History, Quick fire value' }))
    await userEvent.click(screen.getByRole('option', { name: '60' }))

    expect(onAction).toHaveBeenCalledWith({ type: 'quickFireValue', skill: skill('History'), value: 60 })
    expect(screen.queryByText(/Occupation points left/)).not.toBeInTheDocument()
  })

  // The Player assigned 60 to Swim through the any slot, then picked Persuade there instead: Swim is no longer an
  // occupation skill but keeps its value (spec.md: later inputs are kept and surfaced, never discarded).
  it('section 18: shows a Quick fire value left on a skill that is no longer an occupation skill, with its error', () => {
    const inputs: CharacterSheetInputs = {
      ...validInputs,
      creationMethod: 'QuickFire',
      skills: [],
      quickFire: {
        values: [{ ...skill('Credit Rating'), value: 30 }, { ...skill('Drive Auto'), value: 40 }, { ...skill('Swim'), value: 60 }],
        personalInterests: [],
      },
    }
    renderStep(inputs, vi.fn(), { 'quickFire.values[2].skill': "Swim isn't one of your occupation skills." })

    const swim = screen.getByRole('combobox', { name: 'Swim, Quick fire value' })
    expect(swim).toHaveTextContent('60')
    expect(swim).toHaveAccessibleDescription("Swim isn't one of your occupation skills.")
    expect(swim).toHaveAttribute('id', 'field-quickFire-values-2-skill')
    expect(screen.queryByRole('combobox', { name: 'Drive Auto, Quick fire value' })).not.toBeInTheDocument()
  })

  it('section 7.2: shows occupation points left on a skill that is no longer an occupation skill, with its error', () => {
    const inputs: CharacterSheetInputs = {
      ...validInputs,
      skills: [...validInputs.skills, { ...skill('Swim'), occupationPoints: 20, personalInterestPoints: null }],
    }
    renderStep(inputs, vi.fn(), { 'skills[3].occupationPoints': "Swim isn't one of your occupation skills." })

    const swim = screen.getByLabelText('Swim, occupation points')
    expect(swim).toHaveValue(20)
    expect(swim).toHaveAccessibleDescription("Swim isn't one of your occupation skills.")
  })
})
