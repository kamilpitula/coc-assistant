import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { occupationCatalog, rules, sheetView, skill, skillCatalog, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'
import type { CharacterSheetInputs } from '@/campaign-play/types/CharacterSheet'

import { PersonalInterestsStep } from './personal-interests-step'

function renderStep(inputs: CharacterSheetInputs, onAction = vi.fn(), errors: Record<string, string> = {}) {
  render(
    <PersonalInterestsStep
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

/** specs/character-sheet/ux.md sections 6.6 and 6.5a; docs/game-rules sections 8 and 18; project_ruleset.md 4.6. */
describe('PersonalInterestsStep', () => {
  it('section 8: takes personal interest points on any skill and shows the points left', async () => {
    const onAction = renderStep(validInputs)

    expect(screen.getByText('Personal interest points left: 60 of 120')).toBeInTheDocument()
    expect(screen.getByLabelText('Drive Auto, personal interest points')).toHaveValue(60)
    await userEvent.type(screen.getByLabelText('Charm, personal interest points'), '5')

    expect(onAction).toHaveBeenCalledWith({ type: 'skillPoints', skill: skill('Charm'), column: 'personalInterestPoints', value: 5 })
  })

  it('section 8: keeps Cthulhu Mythos out of reach, and Credit Rating takes occupation points only', () => {
    renderStep(validInputs)

    const mythos = screen.getByRole('row', { name: /Cthulhu Mythos/ })
    expect(within(mythos).getByRole('spinbutton')).toBeDisabled()
    expect(mythos).toHaveTextContent('Not available at creation')
    expect(screen.queryByRole('row', { name: /Credit Rating/ })).not.toBeInTheDocument()
  })

  it('filters to the skills with points', async () => {
    renderStep(validInputs)

    await userEvent.click(screen.getByRole('radio', { name: 'Skills with points' }))

    const rows = within(screen.getByRole('table', { name: 'Personal interests' })).getAllByRole('row').slice(1)
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual(['Library Use', 'Drive Auto'])
  })

  it('starts another specialization by moving focus to the skill family Select', async () => {
    renderStep(validInputs)

    await userEvent.click(screen.getByRole('button', { name: 'Add another specialization' }))

    expect(screen.getByRole('combobox', { name: 'Skill to specialize' })).toHaveFocus()
  })

  it('section 18: Quick fire chooses personal interests with Checkboxes and counts them', async () => {
    const onAction = vi.fn()
    const inputs: CharacterSheetInputs = { ...validInputs, creationMethod: 'QuickFire', skills: [], quickFire: { values: [], personalInterests: [skill('Listen')] } }
    renderStep(inputs, onAction)

    expect(screen.getByText('Personal interests chosen: 1 of 4')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Listen, +20' })).toBeChecked()
    expect(screen.queryByRole('checkbox', { name: 'Library Use, +20' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Drive Auto, +20' }))

    expect(onAction).toHaveBeenCalledWith({ type: 'quickFireInterest', skill: skill('Drive Auto'), chosen: true })
  })

  it('section 18: does not offer the extra skill that takes the freed value as a personal interest', () => {
    const inputs: CharacterSheetInputs = {
      ...validInputs,
      creationMethod: 'QuickFire',
      skills: [],
      quickFire: { values: [], personalInterests: [], extraSkill: skill('Drive Auto') },
    }
    renderStep(inputs)

    expect(screen.queryByRole('checkbox', { name: 'Drive Auto, +20' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Listen, +20' })).toBeInTheDocument()
  })

  // Charm was ticked as a personal interest, then picked as an occupation skill (the Antiquarian's interpersonal slot).
  it('UX-26: lists a stored personal interest that can no longer be one, with its error and a way to remove it', async () => {
    const onAction = vi.fn()
    const error = "Choose a skill that isn't an occupation skill, Credit Rating, Cthulhu Mythos, or already chosen."
    const inputs: CharacterSheetInputs = {
      ...validInputs,
      creationMethod: 'QuickFire',
      skills: [],
      quickFire: { values: [], personalInterests: [skill('Listen'), skill('Charm')], extraSkill: null },
    }
    renderStep(inputs, onAction, { 'quickFire.personalInterests[1]': error })

    expect(screen.getByText('Personal interests chosen: 2 of 4')).toBeInTheDocument()
    const group = screen.getByRole('region', { name: 'No longer personal interests' })
    const remove = within(group).getByRole('button', { name: 'Remove Charm from your personal interests' })
    expect(remove).toHaveAttribute('id', 'field-quickFire-personalInterests-1')
    expect(remove).toHaveAccessibleDescription(error)
    await userEvent.click(remove)

    expect(onAction).toHaveBeenCalledWith({ type: 'quickFireInterest', skill: skill('Charm'), chosen: false })
  })

  it('UX-26: lists a personal interest chosen twice once as a Checkbox and again under "No longer personal interests"', () => {
    const inputs: CharacterSheetInputs = {
      ...validInputs,
      creationMethod: 'QuickFire',
      skills: [],
      quickFire: { values: [], personalInterests: [skill('Listen'), skill('Listen')], extraSkill: null },
    }
    renderStep(inputs)

    expect(screen.getByRole('checkbox', { name: 'Listen, +20' })).toBeChecked()
    expect(within(screen.getByRole('region', { name: 'No longer personal interests' })).getByRole('button')).toHaveAttribute(
      'id',
      'field-quickFire-personalInterests-1',
    )
  })

  it('UX-26: lists personal interest points on Credit Rating or Cthulhu Mythos with a way to remove them', async () => {
    const onAction = vi.fn()
    const inputs: CharacterSheetInputs = {
      ...validInputs,
      skills: [
        { ...skill('Credit Rating'), occupationPoints: 30, personalInterestPoints: 10 },
        { ...skill('Cthulhu Mythos'), occupationPoints: null, personalInterestPoints: 5 },
      ],
    }
    renderStep(inputs, onAction, { 'skills[0].personalInterestPoints': 'Credit Rating can only take occupation points.' })

    const group = screen.getByRole('region', { name: 'No longer personal interests' })
    const creditRating = within(group).getByRole('button', { name: 'Remove personal interest points from Credit Rating' })
    expect(creditRating).toHaveAttribute('id', 'field-skills-0-personalInterestPoints')
    expect(creditRating).toHaveAccessibleDescription('Credit Rating can only take occupation points.')
    await userEvent.click(within(group).getByRole('button', { name: 'Remove personal interest points from Cthulhu Mythos' }))

    expect(onAction).toHaveBeenCalledWith({ type: 'skillPoints', skill: skill('Cthulhu Mythos'), column: 'personalInterestPoints', value: null })
  })

  it('shows no "No longer personal interests" group when every choice is still allowed', () => {
    renderStep(validInputs)

    expect(screen.queryByRole('region', { name: 'No longer personal interests' })).not.toBeInTheDocument()
  })
})
