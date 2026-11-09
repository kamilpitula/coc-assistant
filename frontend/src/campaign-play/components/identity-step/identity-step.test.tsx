import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { emptyInputs, emptySheetView, sheetView, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'

import { IdentityStep } from './identity-step'

/** specs/character-sheet/ux.md section 6.1; A11Y-3 and A11Y-10. */
describe('IdentityStep', () => {
  it('asks for the identity fields and shows the Player name read-only', () => {
    render(<IdentityStep inputs={validInputs} errors={{}} playerName="Ada Lovelace" sheet={emptySheetView()} onAction={vi.fn()} onBlur={vi.fn()} />)

    expect(screen.getByLabelText('Investigator name')).toHaveValue('Harvey Walters')
    expect(screen.getByLabelText('Age')).toHaveAccessibleDescription(
      "Age affects your characteristics. You'll see how in a later step.",
    )
    expect(screen.getByLabelText('Gender')).toBeInTheDocument()
    expect(screen.getByLabelText('Residence')).toHaveValue('Boston')
    expect(screen.getByLabelText('Birthplace')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /player name/i })).not.toBeInTheDocument()
  })

  it('reports each change as an identity action', async () => {
    const onAction = vi.fn()
    render(<IdentityStep inputs={emptyInputs} errors={{}} playerName="Ada Lovelace" sheet={emptySheetView()} onAction={onAction} onBlur={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Age'), '4')

    expect(onAction).toHaveBeenLastCalledWith({ type: 'identity', field: 'age', value: 4 })
  })

  it('attaches errors to their fields', () => {
    render(
      <IdentityStep
        inputs={emptyInputs}
        errors={{ 'identity.name': "Enter your Investigator's name." }}
        playerName="Ada Lovelace"
        sheet={emptySheetView()}
        onAction={vi.fn()}
        onBlur={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Investigator name')).toHaveAccessibleDescription("Enter your Investigator's name.")
  })

  it('UX-38: tells the locked age range and what fixed it', () => {
    const both = sheetView({ locks: { creationMethod: false, ageBracket: true, edu: false } })
    const { rerender } = render(
      <IdentityStep inputs={validInputs} errors={{}} playerName="Ada Lovelace" sheet={both} onAction={vi.fn()} onBlur={vi.fn()} />,
    )

    expect(screen.getByLabelText('Age')).toHaveAccessibleDescription(
      'Your age must stay between 20 and 39 because you rolled Luck and EDU checks.',
    )

    const luckOnly = sheetView({
      locks: { creationMethod: false, ageBracket: true, edu: false },
      ageEffects: { bracket: sheetView().ageEffects.bracket, deductions: {}, eduImprovementChecks: [] },
      rollRecords: [
        { purpose: 'Luck', dice: '3D6', faces: [3, 3, 5], result: 11, source: 'Server', rolledByDisplayName: 'Ada Lovelace', rolledAt: '2026-11-08T14:30:00+00:00' },
      ],
    })
    rerender(
      <IdentityStep inputs={validInputs} errors={{}} playerName="Ada Lovelace" sheet={luckOnly} onAction={vi.fn()} onBlur={vi.fn()} />,
    )
    expect(screen.getByLabelText('Age')).toHaveAccessibleDescription(
      'Your age must stay between 20 and 39 because you rolled Luck.',
    )

    rerender(
      <IdentityStep inputs={validInputs} errors={{}} playerName="Ada Lovelace" sheet={emptySheetView()} onAction={vi.fn()} onBlur={vi.fn()} />,
    )
    expect(screen.getByLabelText('Age')).toHaveAccessibleDescription(
      "Age affects your characteristics. You'll see how in a later step.",
    )
  })
})
