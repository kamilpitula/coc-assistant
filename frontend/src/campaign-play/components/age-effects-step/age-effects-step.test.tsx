import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { bracket17, bracket25, bracket45, rules, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'
import type { CharacterSheetInputs } from '@/campaign-play/types/CharacterSheet'

import { AgeEffectsStep } from './age-effects-step'

const at45: CharacterSheetInputs = {
  ...validInputs,
  identity: { ...validInputs.identity, age: 45 },
  ageEffects: { deductions: { STR: 3 }, eduImprovementChecks: [{ check: 70, gain: 5 }, { check: 20, gain: null }] },
}

const noop = { onAction: vi.fn(), onBlur: vi.fn() }

/** specs/character-sheet/ux.md section 6.3; values come from the age bracket the API returns. */
describe('AgeEffectsStep', () => {
  it('explains the bracket in an intro line built from the rule data', () => {
    render(<AgeEffectsStep inputs={at45} errors={{}} rules={rules} bracket={bracket45} {...noop} />)

    expect(
      screen.getByText('At age 45 you lose 5 points from STR, CON or DEX, APP is reduced by 5, and you make 2 EDU checks.'),
    ).toBeInTheDocument()
  })

  it('leaves out the parts a bracket does not have', () => {
    const at25 = { ...validInputs }
    const { rerender } = render(<AgeEffectsStep inputs={at25} errors={{}} rules={rules} bracket={bracket25} {...noop} />)
    expect(screen.getByText('At age 25 you make 1 EDU check.')).toBeInTheDocument()

    const at17 = { ...validInputs, identity: { ...validInputs.identity, age: 17 }, ageEffects: { deductions: {}, eduImprovementChecks: [] } }
    rerender(<AgeEffectsStep inputs={at17} errors={{}} rules={rules} bracket={bracket17} {...noop} />)
    expect(screen.getByText('At age 17 you lose 5 points from STR or SIZ.')).toBeInTheDocument()
  })

  it('splits the deduction across the eligible characteristics only, with the adjusted values and what is left', () => {
    render(<AgeEffectsStep inputs={at45} errors={{}} rules={rules} bracket={bracket45} {...noop} />)

    const group = screen.getByRole('group', { name: 'Deduction split' })
    expect(within(group).getByLabelText('Deduct from STR')).toHaveValue(3)
    expect(within(group).getByLabelText('Deduct from CON')).toBeInTheDocument()
    expect(within(group).queryByLabelText('Deduct from SIZ')).not.toBeInTheDocument()
    expect(within(group).getByText('STR 60 -> 57')).toBeInTheDocument()
    expect(screen.getByText('Still to deduct: 2')).toBeInTheDocument()
  })

  it('shows one group per EDU check, with the gain only when the roll is above EDU', () => {
    render(<AgeEffectsStep inputs={at45} errors={{}} rules={rules} bracket={bracket45} {...noop} />)

    const first = screen.getByRole('group', { name: 'EDU check 1 of 2' })
    expect(within(first).getByLabelText('D100 roll')).toHaveValue(70)
    expect(within(first).getByLabelText('1D10 gain')).toHaveValue(5)
    expect(within(first).getByText('EDU 50 -> 55')).toBeInTheDocument()

    const second = screen.getByRole('group', { name: 'EDU check 2 of 2' })
    expect(within(second).queryByLabelText('1D10 gain')).not.toBeInTheDocument()
    expect(within(second).getByText('No improvement')).toBeInTheDocument()
  })

  it('reports deduction and EDU check changes', async () => {
    const onAction = vi.fn()
    render(<AgeEffectsStep inputs={at45} errors={{}} rules={rules} bracket={bracket45} onAction={onAction} onBlur={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Deduct from DEX'), '2')
    await userEvent.type(within(screen.getByRole('group', { name: 'EDU check 2 of 2' })).getByLabelText('D100 roll'), '1')

    expect(onAction).toHaveBeenCalledWith({ type: 'deduction', code: 'DEX', value: 2 })
    expect(onAction).toHaveBeenCalledWith({ type: 'eduCheck', index: 1, part: 'check', value: 201 })
  })

  it('asks for a valid age first when there is no bracket yet', () => {
    render(<AgeEffectsStep inputs={validInputs} errors={{}} rules={rules} bracket={null} {...noop} />)

    expect(screen.getByText('Your age effects appear once a valid age is saved on the Identity step.')).toBeInTheDocument()
  })
})
