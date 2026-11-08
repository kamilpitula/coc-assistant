import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { RollStatus } from '@/campaign-play/hooks/useWizardMoves'
import {
  bracket17,
  bracket25,
  emptyInputs,
  emptySheetView,
  problem,
  rules,
  sheetView,
  validInputs,
} from '@/campaign-play/test-support/characterSheetFixtures'
import {
  CHARACTERISTIC_CODES,
  type CharacterSheetView,
  type ValidationError,
} from '@/campaign-play/types/CharacterSheet'

import { CharacteristicsStep } from './characteristics-step'

function base(overrides: { rollStatus?: RollStatus } = {}) {
  return {
    onAction: vi.fn(),
    onBlur: vi.fn(),
    allowedMethods: ['PointBuy' as const],
    rules,
    bracket: bracket25,
    warnings: [] as ValidationError[],
    sheet: sheetView(),
    status: 'Draft' as const,
    roll: {
      status: overrides.rollStatus ?? ({ state: 'idle' } as RollStatus),
      onRoll: vi.fn(),
      onRetry: vi.fn(),
    },
  }
}

const standardInputs = { ...emptyInputs, creationMethod: 'StandardRolling' as const }
const standardSheet = { ...emptySheetView(), creationMethod: 'StandardRolling' as const }
const rolledInputs = { ...standardInputs, characteristics: { ...validInputs.characteristics } }
const rolledSheet = sheetView({ creationMethod: 'StandardRolling', characteristicRolls: {}, locks: { creationMethod: true } })

/** specs/character-sheet/ux.md section 6.2 (Point buy with its Luck rows); UX-9, UX-10, UX-20. */
describe('CharacteristicsStep', () => {
  it('UX-10: names the only available method as text, without a choice', () => {
    render(<CharacteristicsStep inputs={validInputs} errors={{}} {...base()} />)

    expect(screen.getByText('Creation method: Point buy')).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('offers the eight characteristics with the points used', () => {
    render(<CharacteristicsStep inputs={validInputs} errors={{}} {...base()} />)

    for (const code of ['STR', 'CON', 'DEX', 'APP', 'POW', 'SIZ', 'INT', 'EDU']) {
      expect(screen.getByLabelText(code)).toBeInTheDocument()
    }
    expect(screen.getByText('Points used: 460 of 460')).toBeInTheDocument()
  })

  it('UX-20: takes Luck as a 3D6 roll outside the points, with one row at age 25', () => {
    render(<CharacteristicsStep inputs={validInputs} errors={{}} {...base()} />)

    expect(screen.getByRole('heading', { name: 'Luck' })).toBeInTheDocument()
    expect(screen.getByText("Luck isn't bought with points. Roll 3D6 at the table and enter the total.")).toBeInTheDocument()
    expect(screen.getByLabelText('Luck, 3D6 total')).toHaveValue(11)
    expect(screen.getByText('= 55')).toBeInTheDocument()
    expect(screen.queryByLabelText('Luck, second roll, 3D6 total')).not.toBeInTheDocument()
  })

  it('UX-20: adds the second Luck row and the kept value in the two-roll age bracket', () => {
    const inputs = { ...validInputs, identity: { ...validInputs.identity, age: 17 }, luckRolls: [11, 13] }
    render(<CharacteristicsStep inputs={inputs} errors={{}} {...base()} bracket={bracket17} />)

    expect(screen.getByLabelText('Luck, second roll, 3D6 total')).toHaveValue(13)
    expect(screen.getByText('Your age lets you roll Luck twice and keep the higher result.')).toBeInTheDocument()
    expect(screen.getByText('Luck kept: 65')).toBeInTheDocument()
  })

  it('reports characteristic and Luck changes', async () => {
    const props = base()
    render(<CharacteristicsStep inputs={emptyInputs} errors={{}} {...props} onAction={props.onAction} />)

    await userEvent.type(screen.getByLabelText('STR'), '6')
    await userEvent.type(screen.getByLabelText('Luck, 3D6 total'), '9')

    expect(props.onAction).toHaveBeenCalledWith({ type: 'characteristic', code: 'STR', value: 6 })
    expect(props.onAction).toHaveBeenCalledWith({ type: 'luckRoll', index: 0, value: 9 })
  })

  it('lists warnings under "Worth checking" without announcing them as an alert', () => {
    const warning = problem('PointBuyBelowRecommendation', 'characteristics.INT', 'INT is below the recommended 40. Check with your Keeper.', 'Warning')
    render(<CharacteristicsStep inputs={validInputs} errors={{}} {...base()} warnings={[warning]} />)

    const heading = screen.getByRole('heading', { name: 'Worth checking' })
    expect(heading.parentElement!).toHaveTextContent(warning.message)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the total error on the characteristics group', () => {
    render(
      <CharacteristicsStep
        inputs={validInputs}
        errors={{ characteristics: 'Your characteristics must add up to 460. They add up to 450.' }}
        {...base()}
      />,
    )

    expect(screen.getByRole('group', { name: 'Characteristics' })).toHaveAccessibleDescription(
      'Your characteristics must add up to 460. They add up to 450.',
    )
  })

  it("offers the Campaign's methods and switches at once while nothing is entered", async () => {
    const props = base()
    const inputs = { ...emptyInputs, creationMethod: null }
    render(
      <CharacteristicsStep
        inputs={inputs}
        errors={{}}
        {...props}
        allowedMethods={['StandardRolling', 'PointBuy', 'QuickFire']}
        onAction={props.onAction}
      />,
    )

    await userEvent.click(screen.getByRole('radio', { name: 'Standard rolling' }))

    expect(props.onAction).toHaveBeenCalledWith({ type: 'creationMethod', method: 'StandardRolling' })
  })

  it('Quick fire assigns pool values with eight Selects and lists the values left', async () => {
    const props = base()
    const inputs = { ...emptyInputs, creationMethod: 'QuickFire' as const, characteristics: { STR: 80, CON: 50 } }
    render(
      <CharacteristicsStep inputs={inputs} errors={{}} {...props} allowedMethods={['QuickFire']} onAction={props.onAction} />,
    )

    expect(screen.getByText('Values left to assign: 70, 60, 60, 50, 50, 40')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox', { name: 'DEX' }))
    expect(screen.queryByRole('option', { name: '80' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: '70' }))

    expect(props.onAction).toHaveBeenCalledWith({ type: 'characteristic', code: 'DEX', value: 70 })
  })
})

/** specs/character-sheet/ux.md section 6.8 "Roll characteristics" (UX-31, UX-33, UX-35; PBI-DICE-002). */
describe('CharacteristicsStep Standard rolling', () => {
  it('UX-31: with nothing rolled, explains the app roll and confirms once before rolling', async () => {
    const props = base()
    render(
      <CharacteristicsStep
        inputs={standardInputs}
        errors={{}}
        {...props}
        sheet={standardSheet}
        allowedMethods={['StandardRolling']}
        roll={props.roll}
      />,
    )

    expect(
      screen.getByText('The app rolls each characteristic for you: STR, CON, DEX, APP, POW (3D6); SIZ, INT, EDU (2D6).'),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Roll characteristics' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Roll characteristics?' })
    expect(dialog).toHaveTextContent(
      "The app rolls STR, CON, DEX, APP, POW (3D6); SIZ, INT, EDU (2D6) once. You can't roll them again, and you can't change your creation method afterwards.",
    )
    await userEvent.click(screen.getByRole('button', { name: 'Roll now' }))

    expect(props.roll.onRoll).toHaveBeenCalledTimes(1)
  })

  it('UX-33: lists legacy typed-in values and rolls only the remaining characteristics', async () => {
    const props = base()
    const legacySheet: CharacterSheetView = {
      ...sheetView({ creationMethod: 'StandardRolling', characteristicRolls: { STR: 11 } }),
      characteristics: Object.fromEntries(
        CHARACTERISTIC_CODES.map((code) => [
          code,
          code === 'STR'
            ? { assigned: 55, value: 55, hard: 27, extreme: 11 }
            : { assigned: null, value: null, hard: null, extreme: null },
        ]),
      ) as CharacterSheetView['characteristics'],
    }
    render(
      <CharacteristicsStep
        inputs={{ ...standardInputs, characteristics: { STR: 55 } }}
        errors={{}}
        {...props}
        sheet={legacySheet}
        allowedMethods={['StandardRolling']}
        roll={props.roll}
      />,
    )

    expect(screen.getByText('STR 55 (entered by you)')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Roll the remaining characteristics' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Roll the remaining characteristics?' })
    expect(dialog).toHaveTextContent('CON, DEX, APP, POW (3D6); SIZ, INT, EDU (2D6)')
    expect(dialog.textContent).not.toContain('STR')
  })

  it('UX-31: with everything rolled, lists the values without typed inputs', () => {
    render(
      <CharacteristicsStep
        inputs={rolledInputs}
        errors={{}}
        {...base()}
        sheet={rolledSheet}
        allowedMethods={['StandardRolling']}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Your characteristics' })).toBeInTheDocument()
    expect(screen.getByText('STR 60')).toBeInTheDocument()
    expect(screen.queryByText(/entered by you/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Roll/ })).not.toBeInTheDocument()
  })

  it('UX-31: after rolling, announces the results and focuses the heading', () => {
    render(
      <CharacteristicsStep
        inputs={rolledInputs}
        errors={{}}
        {...base({ rollStatus: { state: 'rolled' } })}
        sheet={rolledSheet}
        allowedMethods={['StandardRolling']}
      />,
    )

    expect(screen.getByText('Characteristics rolled.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your characteristics' })).toHaveFocus()
  })

  it('UX-31: when the roll found existing results, says they were already rolled', () => {
    render(
      <CharacteristicsStep
        inputs={rolledInputs}
        errors={{}}
        {...base({ rollStatus: { state: 'alreadyRolled' } })}
        sheet={rolledSheet}
        allowedMethods={['StandardRolling']}
      />,
    )

    expect(screen.getByText('Your characteristics were already rolled.')).toBeInTheDocument()
  })

  it('UX-35: shows the inline roll error and describes the trigger with it', () => {
    const message = 'Roll your characteristics.'
    render(
      <CharacteristicsStep
        inputs={standardInputs}
        errors={{ 'characteristicRolls.STR': message }}
        {...base()}
        sheet={standardSheet}
        allowedMethods={['StandardRolling']}
      />,
    )

    const inline = screen.getByText(message)
    expect(screen.getByRole('button', { name: 'Roll characteristics' })).toHaveAttribute('aria-describedby', inline.id)
  })

  it('UX-35: a failed save keeps the changes and retries the roll action', async () => {
    const props = base({ rollStatus: { state: 'saveFailed' } })
    render(
      <CharacteristicsStep
        inputs={standardInputs}
        errors={{}}
        {...props}
        sheet={standardSheet}
        allowedMethods={['StandardRolling']}
        roll={props.roll}
      />,
    )

    expect(screen.getByText("We couldn't save your Investigator. Your changes are still here - try again.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(props.roll.onRoll).toHaveBeenCalledTimes(1)
  })

  it('UX-35: a failed roll retries without the dialog', async () => {
    const props = base({ rollStatus: { state: 'rollFailed' } })
    render(
      <CharacteristicsStep
        inputs={standardInputs}
        errors={{}}
        {...props}
        sheet={standardSheet}
        allowedMethods={['StandardRolling']}
        roll={props.roll}
      />,
    )

    expect(screen.getByText("We couldn't roll your characteristics. Try again.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(props.roll.onRetry).toHaveBeenCalledTimes(1)
  })

  it('UX-35: a save conflict says the sheet was reloaded', () => {
    render(
      <CharacteristicsStep
        inputs={standardInputs}
        errors={{}}
        {...base({ rollStatus: { state: 'saveConflict' } })}
        sheet={standardSheet}
        allowedMethods={['StandardRolling']}
      />,
    )

    expect(screen.getByText('Your Investigator changed elsewhere, so we reloaded it.')).toBeInTheDocument()
  })

  it('UX-35: a roll conflict asks for a reload without retrying blindly', () => {
    render(
      <CharacteristicsStep
        inputs={standardInputs}
        errors={{}}
        {...base({ rollStatus: { state: 'rollConflict' } })}
        sheet={standardSheet}
        allowedMethods={['StandardRolling']}
      />,
    )

    expect(screen.getByText("We couldn't roll your characteristics. Reload the page and try again.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('UX-32: locks the Creation Method once the characteristics are rolled', () => {
    render(
      <CharacteristicsStep
        inputs={rolledInputs}
        errors={{}}
        {...base()}
        sheet={rolledSheet}
        status="Draft"
        allowedMethods={['StandardRolling']}
      />,
    )

    expect(screen.getByText('Creation method: Standard rolling')).toBeInTheDocument()
    expect(screen.getByText(/Locked because your characteristics are rolled\./)).toBeInTheDocument()
    expect(screen.getByText(/To use another method, start over\./)).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('disables the roll action while the roll is pending', () => {
    render(
      <CharacteristicsStep
        inputs={standardInputs}
        errors={{}}
        {...base({ rollStatus: { state: 'pending' } })}
        sheet={standardSheet}
        allowedMethods={['StandardRolling']}
      />,
    )

    expect(screen.getByRole('button', { name: 'Roll characteristics' })).toBeDisabled()
  })
})
