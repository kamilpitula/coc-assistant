import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { RollStatus } from '@/campaign-play/hooks/useWizardMoves'
import {
  bracket17,
  bracket25,
  bracket45,
  emptySheetView,
  rules,
  sheetView,
  validInputs,
} from '@/campaign-play/test-support/characterSheetFixtures'
import type { CharacterSheetInputs, CharacterSheetView, EduImprovementCheckView } from '@/campaign-play/types/CharacterSheet'

import { AgeEffectsStep } from './age-effects-step'

const at45: CharacterSheetInputs = {
  ...validInputs,
  identity: { ...validInputs.identity, age: 45 },
  ageEffects: { deductions: { STR: 3 } },
}

function base(overrides: { rollStatus?: RollStatus } = {}) {
  return {
    onAction: vi.fn(),
    onBlur: vi.fn(),
    roll: {
      status: overrides.rollStatus ?? ({ state: 'idle' } as RollStatus),
      onRoll: vi.fn(),
      onRetry: vi.fn(),
    },
  }
}

/** A saved sheet at 45 with the given EDU checks, as the roll responses return them. */
function eduSheet(checks: EduImprovementCheckView[]): CharacterSheetView {
  return sheetView({
    identity: { ...validInputs.identity, age: 45 },
    ageEffects: { bracket: bracket45, deductions: {}, eduImprovementChecks: checks },
  })
}

const rolled45 = eduSheet([
  { check: 70, gain: 5, eduBefore: 50, eduAfter: 55 },
  { check: 20, gain: null, eduBefore: 55, eduAfter: 55 },
])

/** specs/character-sheet/ux.md section 6.3; values come from the age bracket the API returns. */
describe('AgeEffectsStep', () => {
  it('explains the bracket in an intro line built from the rule data', () => {
    render(<AgeEffectsStep inputs={at45} errors={{}} rules={rules} bracket={bracket45} sheet={rolled45} {...base()} />)

    expect(
      screen.getByText('At age 45 you lose 5 points from STR, CON or DEX, APP is reduced by 5, and you make 2 EDU checks.'),
    ).toBeInTheDocument()
  })

  it('leaves out the parts a bracket does not have', () => {
    const at25 = { ...validInputs }
    const sheet25 = sheetView({
      ageEffects: { bracket: bracket25, deductions: {}, eduImprovementChecks: [{ check: 30, gain: null, eduBefore: 50, eduAfter: 50 }] },
    })
    const { rerender } = render(<AgeEffectsStep inputs={at25} errors={{}} rules={rules} bracket={bracket25} sheet={sheet25} {...base()} />)
    expect(screen.getByText('At age 25 you make 1 EDU check.')).toBeInTheDocument()

    const at17 = { ...validInputs, identity: { ...validInputs.identity, age: 17 }, ageEffects: { deductions: {} } }
    const sheet17 = sheetView({
      identity: { ...validInputs.identity, age: 17 },
      ageEffects: { bracket: bracket17, deductions: {}, eduImprovementChecks: [] },
    })
    rerender(<AgeEffectsStep inputs={at17} errors={{}} rules={rules} bracket={bracket17} sheet={sheet17} {...base()} />)
    expect(screen.getByText('At age 17 you lose 5 points from STR or SIZ.')).toBeInTheDocument()
  })

  it('splits the deduction across the eligible characteristics only, with the adjusted values and what is left', () => {
    render(<AgeEffectsStep inputs={at45} errors={{}} rules={rules} bracket={bracket45} sheet={rolled45} {...base()} />)

    const group = screen.getByRole('group', { name: 'Deduction split' })
    expect(within(group).getByLabelText('Deduct from STR')).toHaveValue(3)
    expect(within(group).getByLabelText('Deduct from CON')).toBeInTheDocument()
    expect(within(group).queryByLabelText('Deduct from SIZ')).not.toBeInTheDocument()
    expect(within(group).getByText('STR 60 -> 57')).toBeInTheDocument()
    expect(screen.getByText('Still to deduct: 2')).toBeInTheDocument()
  })

  it('reports deduction changes', async () => {
    const props = base()
    render(<AgeEffectsStep inputs={at45} errors={{}} rules={rules} bracket={bracket45} sheet={rolled45} {...props} onAction={props.onAction} />)

    await userEvent.type(screen.getByLabelText('Deduct from DEX'), '2')

    expect(props.onAction).toHaveBeenCalledWith({ type: 'deduction', code: 'DEX', value: 2 })
  })

  it('asks for a valid age first when there is no bracket yet', () => {
    render(<AgeEffectsStep inputs={validInputs} errors={{}} rules={rules} bracket={null} sheet={emptySheetView()} {...base()} />)

    expect(screen.getByText('Your age effects appear once a valid age is saved on the Identity step.')).toBeInTheDocument()
  })
})

/** specs/character-sheet/ux.md section 6.3 "EDU improvement checks rolled by the app" (UX-37; PBI-DICE-003). */
describe('AgeEffectsStep EDU checks', () => {
  it('UX-37: shows one group per required check with its result line and no inputs', () => {
    render(<AgeEffectsStep inputs={at45} errors={{}} rules={rules} bracket={bracket45} sheet={rolled45} {...base()} />)

    const first = screen.getByRole('group', { name: 'EDU check 1 of 2' })
    expect(within(first).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(first).getByText('EDU 50 -> 55')).toBeInTheDocument()

    const second = screen.getByRole('group', { name: 'EDU check 2 of 2' })
    expect(within(second).getByText('No improvement')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Roll EDU check/ })).not.toBeInTheDocument()
  })

  it('UX-37: only the next unrolled check has the action', () => {
    const props = base()
    const sheet = eduSheet([{ check: 70, gain: 5, eduBefore: 50, eduAfter: 55 }])
    render(<AgeEffectsStep inputs={at45} errors={{}} rules={rules} bracket={bracket45} sheet={sheet} {...props} roll={props.roll} />)

    expect(within(screen.getByRole('group', { name: 'EDU check 1 of 2' })).getByText('EDU 50 -> 55')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Roll EDU check 2' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Roll EDU check 1' })).not.toBeInTheDocument()
  })

  it('UX-37: later groups name the check to roll first', () => {
    render(<AgeEffectsStep inputs={at45} errors={{}} rules={rules} bracket={bracket45} sheet={eduSheet([])} {...base()} />)

    expect(screen.getByRole('button', { name: 'Roll EDU check 1' })).toBeInTheDocument()
    expect(screen.getByText('Roll EDU check 1 first.')).toBeInTheDocument()
  })

  it('UX-39: while granted, the EDU action reads "Roll EDU check {n} again"', async () => {
    const props = base()
    const sheet = sheetView({
      identity: { ...validInputs.identity, age: 45 },
      ageEffects: { bracket: bracket45, deductions: {}, eduImprovementChecks: [] },
      rerollGrants: ['EduImprovementChecks'],
    })
    render(<AgeEffectsStep inputs={at45} errors={{}} rules={rules} bracket={bracket45} sheet={sheet} {...props} roll={props.roll} />)

    await userEvent.click(screen.getByRole('button', { name: 'Roll EDU check 1 again' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Roll EDU check 1 again?' })
    expect(dialog).toHaveTextContent('Only your Keeper can allow a re-roll.')
  })

  it('UX-37: confirms once before rolling, naming the EDU, the age range, and the EDU lock', async () => {
    const props = base()
    render(<AgeEffectsStep inputs={at45} errors={{}} rules={rules} bracket={bracket45} sheet={eduSheet([])} {...props} roll={props.roll} />)

    await userEvent.click(screen.getByRole('button', { name: 'Roll EDU check 1' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Roll EDU check 1?' })
    expect(dialog).toHaveTextContent(
      "The app rolls D100 against your EDU of 50, and 1D10 more if it improves. You can't roll it again. Afterwards your age must stay between 40 and 49 and your EDU can't change.",
    )
    await userEvent.click(screen.getByRole('button', { name: 'Roll now' }))

    expect(props.roll.onRoll).toHaveBeenCalledTimes(1)
  })

  it('leaves the EDU clause out under Standard rolling', async () => {
    const props = base()
    const inputs = { ...at45, creationMethod: 'StandardRolling' as const }
    const sheet = sheetView({
      identity: { ...validInputs.identity, age: 45 },
      creationMethod: 'StandardRolling',
      ageEffects: { bracket: bracket45, deductions: {}, eduImprovementChecks: [] },
      characteristicRolls: { STR: 12, CON: 12, DEX: 12, APP: 10, POW: 12, SIZ: 6, INT: 6, EDU: 4 },
    })
    render(<AgeEffectsStep inputs={inputs} errors={{}} rules={rules} bracket={bracket45} sheet={sheet} {...props} roll={props.roll} />)

    await userEvent.click(screen.getByRole('button', { name: 'Roll EDU check 1' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Roll EDU check 1?' })
    expect(dialog).toHaveTextContent('Afterwards your age must stay between 40 and 49.')
    expect(dialog.textContent).not.toContain("your EDU can't change")
  })

  it('UX-37: after rolling, announces the check and focuses its group', () => {
    render(
      <AgeEffectsStep
        inputs={at45}
        errors={{}}
        rules={rules}
        bracket={bracket45}
        sheet={rolled45}
        {...base({ rollStatus: { state: 'rolled', group: 'eduImprovementCheck' } })}
      />,
    )

    expect(screen.getByText('EDU check 2 rolled.')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'EDU check 2 of 2' })).toHaveFocus()
  })

  it('names the sent check when the reloaded sheet has not arrived yet', async () => {
    const props = base()
    const sheet = eduSheet([{ check: 70, gain: 5, eduBefore: 50, eduAfter: 55 }])
    const { rerender } = render(
      <AgeEffectsStep inputs={at45} errors={{}} rules={rules} bracket={bracket45} sheet={sheet} {...props} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Roll EDU check 2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Roll now' }))

    rerender(
      <AgeEffectsStep
        inputs={at45}
        errors={{}}
        rules={rules}
        bracket={bracket45}
        sheet={sheet}
        {...props}
        roll={{ ...props.roll, status: { state: 'rolled', group: 'eduImprovementCheck' } }}
      />,
    )

    expect(screen.getByText('EDU check 2 rolled.')).toBeInTheDocument()
  })

  it('says the EDU check was already rolled after a 409 that found results', () => {
    render(
      <AgeEffectsStep
        inputs={at45}
        errors={{}}
        rules={rules}
        bracket={bracket45}
        sheet={rolled45}
        {...base({ rollStatus: { state: 'alreadyRolled', group: 'eduImprovementCheck' } })}
      />,
    )

    expect(screen.getByText('Your EDU check was already rolled.')).toBeInTheDocument()
  })

  it('retries a failed save and a failed roll', async () => {
    const saveFailed = base({ rollStatus: { state: 'saveFailed', group: 'eduImprovementCheck' } })
    const sheet = eduSheet([])
    const { rerender } = render(
      <AgeEffectsStep inputs={at45} errors={{}} rules={rules} bracket={bracket45} sheet={sheet} {...saveFailed} roll={saveFailed.roll} />,
    )

    expect(screen.getByText("We couldn't save your Investigator. Your changes are still here - try again.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(saveFailed.roll.onRoll).toHaveBeenCalledTimes(1)

    const rollFailed = base({ rollStatus: { state: 'rollFailed', group: 'eduImprovementCheck' } })
    rerender(
      <AgeEffectsStep inputs={at45} errors={{}} rules={rules} bracket={bracket45} sheet={sheet} {...rollFailed} roll={rollFailed.roll} />,
    )

    expect(screen.getByText("We couldn't roll your EDU check. Try again.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(rollFailed.roll.onRetry).toHaveBeenCalledTimes(1)
  })

  it('reloads instead of retrying after a conflict', () => {
    const { rerender } = render(
      <AgeEffectsStep
        inputs={at45}
        errors={{}}
        rules={rules}
        bracket={bracket45}
        sheet={eduSheet([])}
        {...base({ rollStatus: { state: 'saveConflict', group: 'eduImprovementCheck' } })}
      />,
    )

    expect(screen.getByText('Your Investigator changed elsewhere, so we reloaded it.')).toBeInTheDocument()

    rerender(
      <AgeEffectsStep
        inputs={at45}
        errors={{}}
        rules={rules}
        bracket={bracket45}
        sheet={eduSheet([])}
        {...base({ rollStatus: { state: 'rollConflict', group: 'eduImprovementCheck' } })}
      />,
    )

    expect(screen.getByText("We couldn't roll your EDU check. Reload the page and try again.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('disables the roll action while the roll is pending', () => {
    render(
      <AgeEffectsStep
        inputs={at45}
        errors={{}}
        rules={rules}
        bracket={bracket45}
        sheet={eduSheet([])}
        {...base({ rollStatus: { state: 'pending', group: 'eduImprovementCheck' } })}
      />,
    )

    expect(screen.getByRole('button', { name: 'Roll EDU check 1' })).toBeDisabled()
  })

  it('asks for a valid EDU instead of offering the action when EDU is unusable', () => {
    const inputs = { ...at45, characteristics: { ...at45.characteristics, EDU: 95 } }
    render(<AgeEffectsStep inputs={inputs} errors={{}} rules={rules} bracket={bracket45} sheet={eduSheet([])} {...base()} />)

    expect(screen.getByText('Enter a valid age and your EDU to roll EDU checks.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Roll EDU check/ })).not.toBeInTheDocument()
  })

  it('G2: marks a typed-in check as entered by you with its result line', () => {
    const sheet = sheetView({
      ageEffects: {
        bracket: bracket25,
        deductions: {},
        eduImprovementChecks: [{ check: 30, gain: null, eduBefore: 50, eduAfter: 50 }],
      },
    })
    render(<AgeEffectsStep inputs={validInputs} errors={{}} rules={rules} bracket={bracket25} sheet={sheet} {...base()} />)

    const group = screen.getByRole('group', { name: 'EDU check 1 of 1' })
    expect(within(group).getByText('D100 30 (entered by you)')).toBeInTheDocument()
    expect(within(group).getByText('No improvement')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Roll EDU check/ })).not.toBeInTheDocument()
  })

  it('shows a typed-in check missing its gain with its error and no action', () => {
    const sheet = sheetView({
      ageEffects: {
        bracket: bracket25,
        deductions: {},
        eduImprovementChecks: [{ check: 70, gain: null, eduBefore: 50, eduAfter: 50 }],
      },
    })
    render(
      <AgeEffectsStep
        inputs={validInputs}
        errors={{ 'ageEffects.eduImprovementChecks[0].gain': 'EDU check 1 is missing its 1D10 gain. Ask your Keeper.' }}
        rules={rules}
        bracket={bracket25}
        sheet={sheet}
        {...base()}
      />,
    )

    const group = screen.getByRole('group', { name: 'EDU check 1 of 1' })
    expect(within(group).getByText('D100 70 (entered by you)')).toBeInTheDocument()
    expect(within(group).getByText('EDU check 1 is missing its 1D10 gain. Ask your Keeper.')).toBeInTheDocument()
    expect(within(group).queryByText('No improvement')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Roll EDU check/ })).not.toBeInTheDocument()
  })
})
