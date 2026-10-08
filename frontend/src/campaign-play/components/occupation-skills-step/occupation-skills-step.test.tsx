import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { antiquarianInputs, occupationCatalog, rules, sheetView, skill, skillCatalog, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'
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

function valueRows() {
  return within(screen.getByRole('table', { name: 'Occupation skills' })).getAllByRole('row').slice(1)
}

function rowNames() {
  return valueRows().map((row) => within(row).getAllByRole('cell')[0].firstChild?.textContent)
}

const quickFire = (values: { skill: string; specialization?: string | null; value: number | null }[], extraSkill: string | null = null): CharacterSheetInputs => ({
  ...validInputs,
  creationMethod: 'QuickFire',
  skills: [],
  quickFire: {
    values: values.map(({ skill: name, specialization = null, value }) => ({ skill: name, specialization, value })),
    personalInterests: [],
    extraSkill: extraSkill ? skill(extraSkill) : null,
  },
})

/** specs/character-sheet/ux.md sections 6.5 and 6.5a (option A) and UX-22 to UX-25; docs/game-rules sections 7.2 and 18. */
describe('OccupationSkillsStep', () => {
  it('UX-22: puts the choices first, then the values, in two headed sections', () => {
    renderStep(validInputs)

    expect(screen.getByRole('heading', { level: 2, name: '1. Make your skill choices' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '2. Assign values' })).toBeInTheDocument()
  })

  it('offers a choice control for each open slot', async () => {
    const onAction = renderStep(validInputs)

    expect(screen.getByRole('combobox', { name: 'Art/Craft specialization' })).toHaveValue('Painting')
    await userEvent.click(screen.getByRole('combobox', { name: 'Choose 1 interpersonal skill' }))
    await userEvent.click(screen.getByRole('option', { name: 'Persuade' }))

    expect(onAction).toHaveBeenCalledWith({ type: 'skillChoice', slot: 5, picks: [skill('Persuade')] })
  })

  it('UX-22: lists Credit Rating first, then the occupation skill slots in catalog order', async () => {
    const onAction = renderStep(validInputs)

    expect(rowNames()).toEqual([
      'Credit Rating',
      'Appraise',
      'Art/Craft (Painting)',
      'History',
      'Library Use',
      'Language (Other): Latin',
      'Charm',
      'Spot Hidden',
      'Firearms (Handgun)',
    ])
    expect(valueRows()[0]).toHaveTextContent('Must be between 30 and 70')
    expect(screen.getByLabelText('Library Use, occupation points')).toHaveValue(50)
    await userEvent.type(screen.getByLabelText('History, occupation points'), '4')

    expect(onAction).toHaveBeenCalledWith({ type: 'skillPoints', skill: skill('History'), column: 'occupationPoints', value: 4 })
  })

  it('UX-22: disables the row of a slot with no skill chosen yet and says why', () => {
    renderStep({ ...validInputs, occupation: { ...antiquarianInputs, skillChoices: antiquarianInputs.skillChoices.map((picks, slot) => (slot === 5 ? [] : picks)) } })

    const row = valueRows()[6]
    expect(row).toHaveTextContent('Choose 1 interpersonal skill')
    expect(row).toHaveTextContent('Choose this skill above first')
    expect(within(row).getByRole('spinbutton')).toBeDisabled()
  })

  it('shows the occupation points left from the budget and the points entered', () => {
    renderStep(validInputs)

    expect(screen.getByText('Occupation points left: 120 of 200')).toBeInTheDocument()
  })

  it('UX-7: shows an overspent budget as an error on the step', () => {
    renderStep(validInputs, vi.fn(), { occupationPoints: "You've spent 200 occupation points. You have 160." })

    expect(screen.getByText("You've spent 200 occupation points. You have 160.")).toBeInTheDocument()
  })

  it('section 18: assigns Quick fire values, with Credit Rating at its value and the freed value reserved for the extra skill', async () => {
    const onAction = vi.fn()
    renderStep(quickFire([{ skill: 'Credit Rating', value: 30 }, { skill: 'Appraise', value: 70 }]), onAction)

    expect(screen.getByText('Must be 30 for this occupation')).toBeInTheDocument()
    expect(screen.getByText('Values left to assign: 60, 60, 50, 50, 50, 40, 40')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox', { name: 'History, Quick fire value' }))
    await userEvent.click(screen.getByRole('option', { name: '60' }))

    expect(onAction).toHaveBeenCalledWith({ type: 'quickFireValue', skill: skill('History'), value: 60 })
    expect(screen.queryByText(/Occupation points left/)).not.toBeInTheDocument()
  })

  it('UX-23: offers "No value", which clears a Quick fire value', async () => {
    const onAction = vi.fn()
    renderStep(quickFire([{ skill: 'Credit Rating', value: 30 }, { skill: 'Appraise', value: 70 }]), onAction)

    await userEvent.click(screen.getByRole('combobox', { name: 'Appraise, Quick fire value' }))
    await userEvent.click(screen.getByRole('option', { name: 'No value' }))

    expect(onAction).toHaveBeenCalledWith({ type: 'quickFireValue', skill: skill('Appraise'), value: null })
  })

  it('UX-25: makes the extra skill for the freed value the last row of the table', async () => {
    const onAction = vi.fn()
    renderStep(quickFire([{ skill: 'Credit Rating', value: 30 }], 'Drive Auto'), onAction)

    const extra = valueRows().at(-1)!
    expect(extra).toHaveTextContent('Extra skill (freed 40)')
    expect(within(extra).getByRole('combobox', { name: 'Extra skill for the freed 40' })).toHaveTextContent('Drive Auto')
    expect(within(extra).getAllByRole('cell')[3]).toHaveTextContent('40')
    await userEvent.click(within(extra).getByRole('combobox', { name: 'Extra skill for the freed 40' }))
    await userEvent.click(screen.getByRole('option', { name: 'Listen' }))

    expect(onAction).toHaveBeenCalledWith({ type: 'quickFireExtraSkill', skill: skill('Listen') })
  })

  it('UX-24: lists a Quick fire value left on a former occupation skill with its error and "Remove value"', async () => {
    const onAction = vi.fn()
    const error = 'Swim is no longer one of your occupation skills. Remove its value to use it elsewhere.'
    renderStep(quickFire([{ skill: 'Credit Rating', value: 30 }, { skill: 'Swim', value: 60 }], 'Drive Auto'), onAction, {
      'quickFire.values[1].skill': error,
    })

    const group = screen.getByRole('region', { name: 'No longer occupation skills' })
    expect(within(group).getByText('Swim')).toBeInTheDocument()
    expect(within(group).getByText('60')).toBeInTheDocument()
    const remove = within(group).getByRole('button', { name: 'Remove value from Swim' })
    expect(remove).toHaveAccessibleDescription(error)
    expect(remove).toHaveAttribute('id', 'field-quickFire-values-1-skill')
    expect(screen.queryByRole('combobox', { name: 'Swim, Quick fire value' })).not.toBeInTheDocument()
    await userEvent.click(remove)

    expect(onAction).toHaveBeenCalledWith({ type: 'quickFireValue', skill: skill('Swim'), value: null })
  })

  it('UX-24: lists occupation points left on a former occupation skill with "Remove value"', async () => {
    const onAction = vi.fn()
    const inputs: CharacterSheetInputs = {
      ...validInputs,
      skills: [...validInputs.skills, { ...skill('Swim'), occupationPoints: 20, personalInterestPoints: null }],
    }
    renderStep(inputs, onAction, { 'skills[3].occupationPoints': 'Swim is no longer one of your occupation skills.' })

    const remove = within(screen.getByRole('region', { name: 'No longer occupation skills' })).getByRole('button', { name: 'Remove value from Swim' })
    expect(remove).toHaveAttribute('id', 'field-skills-3-occupationPoints')
    await userEvent.click(remove)

    expect(onAction).toHaveBeenCalledWith({ type: 'skillPoints', skill: skill('Swim'), column: 'occupationPoints', value: null })
  })

  it('shows no "No longer occupation skills" group when nothing is left over', () => {
    renderStep(validInputs)

    expect(screen.queryByRole('region', { name: 'No longer occupation skills' })).not.toBeInTheDocument()
  })
})
