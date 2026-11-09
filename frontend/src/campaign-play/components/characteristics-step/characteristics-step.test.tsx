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
  type RollRecord,
  type ValidationError,
} from '@/campaign-play/types/CharacterSheet'

import { CharacteristicsStep } from './characteristics-step'

function base(overrides: { rollStatus?: RollStatus; luckRollStatus?: RollStatus } = {}) {
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
    luckRoll: {
      status: overrides.luckRollStatus ?? ({ state: 'idle' } as RollStatus),
      onRoll: vi.fn(),
      onRetry: vi.fn(),
    },
  }
}

const standardInputs = { ...emptyInputs, creationMethod: 'StandardRolling' as const }
const standardSheet = { ...emptySheetView(), creationMethod: 'StandardRolling' as const }
const rolledInputs = { ...standardInputs, characteristics: { ...validInputs.characteristics } }
/** One Server Roll Record per characteristic; the faces add up to the raw total, as the roll response returns them. */
const SERVER_CHARACTERISTICS: [code: (typeof CHARACTERISTIC_CODES)[number], dice: string, faces: number[]][] = [
  ['STR', '3D6', [4, 4, 4]],
  ['CON', '3D6', [4, 4, 4]],
  ['DEX', '3D6', [4, 4, 4]],
  ['APP', '3D6', [3, 3, 4]],
  ['POW', '3D6', [4, 4, 4]],
  ['SIZ', '2D6', [3, 3]],
  ['INT', '2D6', [3, 3]],
  ['EDU', '2D6', [2, 2]],
]

function serverCharacteristicRecords(): RollRecord[] {
  return SERVER_CHARACTERISTICS.map(([code, dice, faces]) => ({
    purpose: `Characteristic:${code}`,
    dice,
    faces,
    result: faces.reduce((total, face) => total + face, 0),
    source: 'Server',
    rolledByDisplayName: 'Ada Lovelace',
    rolledAt: '2026-11-08T14:30:00+00:00',
  }))
}

/** A sheet whose Luck rolls are Server records, as the roll response returns them. */
function serverLucked(rolls: (number | null)[]): CharacterSheetView {
  const purposes = ['Luck', 'Luck:SecondRoll']
  return sheetView({
    luckRolls: rolls,
    rollRecords: rolls.flatMap((result, index) =>
      result === null
        ? []
        : [{
            purpose: purposes[index],
            dice: '3D6',
            faces: [3, 3, 3],
            result,
            source: 'Server',
            rolledByDisplayName: 'Ada Lovelace',
            rolledAt: '2026-11-08T14:30:00+00:00',
          }],
    ),
  })
}

/** A fully server-rolled sheet, as the roll response returns it: raw totals kept, Server records attached. */
const rolledSheet = sheetView({
  creationMethod: 'StandardRolling',
  characteristicRolls: { STR: 12, CON: 12, DEX: 12, APP: 10, POW: 12, SIZ: 6, INT: 6, EDU: 4 },
  rollRecords: serverCharacteristicRecords(),
  locks: { creationMethod: true, ageBracket: false, edu: false },
})

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

  it('reports characteristic changes', async () => {
    const props = base()
    render(<CharacteristicsStep inputs={emptyInputs} errors={{}} {...props} onAction={props.onAction} />)

    await userEvent.type(screen.getByLabelText('STR'), '6')

    expect(props.onAction).toHaveBeenCalledWith({ type: 'characteristic', code: 'STR', value: 6 })
  })

  it('UX-36: Luck is not counted in "Points used"', () => {
    render(<CharacteristicsStep inputs={validInputs} errors={{}} {...base()} sheet={serverLucked([11])} />)

    expect(screen.getByText('Points used: 460 of 460')).toBeInTheDocument()
    expect(screen.getByText('Luck 55')).toBeInTheDocument()
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

/** specs/character-sheet/ux.md section 6.2 "Luck, rolled by the app" (UX-36; PBI-DICE-003). */
describe('CharacteristicsStep Luck', () => {
  const unrolled25 = sheetView({
    identity: { ...validInputs.identity, age: 25 },
    ageEffects: { bracket: bracket25, deductions: {}, eduImprovementChecks: [] },
    luckRolls: [],
    rollRecords: [],
  })
  const unrolled17 = sheetView({
    identity: { ...validInputs.identity, age: 17 },
    ageEffects: { bracket: bracket17, deductions: {}, eduImprovementChecks: [] },
    luckRolls: [],
    rollRecords: [],
  })

  it('UX-36: asks for a valid age first when none is saved', () => {
    render(<CharacteristicsStep inputs={validInputs} errors={{}} {...base()} sheet={emptySheetView()} bracket={null} />)

    expect(screen.getByText('Enter a valid age on the Identity step to roll Luck.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Roll/ })).not.toBeInTheDocument()
  })

  it('UX-36: confirms once before rolling, naming the age range that becomes fixed', async () => {
    const props = base()
    render(
      <CharacteristicsStep inputs={validInputs} errors={{}} {...props} sheet={unrolled25} luckRoll={props.luckRoll} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Roll Luck' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Roll Luck?' })
    expect(dialog).toHaveTextContent(
      "The app rolls Luck (3D6) once. You can't roll it again, and your age must then stay between 20 and 39.",
    )
    await userEvent.click(screen.getByRole('button', { name: 'Roll now' }))

    expect(props.luckRoll.onRoll).toHaveBeenCalledTimes(1)
  })

  it('UX-36: names both rolls in the two-roll age bracket', async () => {
    const props = base()
    render(
      <CharacteristicsStep inputs={validInputs} errors={{}} {...props} sheet={unrolled17} bracket={bracket17} luckRoll={props.luckRoll} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Roll Luck' }))

    expect(screen.getByRole('alertdialog', { name: 'Roll Luck?' })).toHaveTextContent(
      "The app rolls Luck (3D6) twice at your age, keeping the higher result. You can't roll it again, and your age must then stay between 15 and 19.",
    )
  })

  it('UX-36: after rolling, shows the value, announces it, and focuses the heading', () => {
    render(
      <CharacteristicsStep
        inputs={validInputs}
        errors={{}}
        {...base({ luckRollStatus: { state: 'rolled', group: 'luck' } })}
        sheet={serverLucked([11])}
      />,
    )

    expect(screen.getByText('Luck 55')).toBeInTheDocument()
    expect(screen.getByText('Luck rolled.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Luck' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: /Roll/ })).not.toBeInTheDocument()
  })

  it('UX-36: shows both rolls and the kept value in the two-roll bracket', () => {
    const sheet = sheetView({
      identity: { ...validInputs.identity, age: 17 },
      ageEffects: { bracket: bracket17, deductions: {}, eduImprovementChecks: [] },
      luckRolls: [9, 11],
      rollRecords: [
        { purpose: 'Luck', dice: '3D6', faces: [3, 3, 3], result: 9, source: 'Server', rolledByDisplayName: 'Ada Lovelace', rolledAt: '2026-11-08T14:30:00+00:00' },
        { purpose: 'Luck:SecondRoll', dice: '3D6', faces: [4, 4, 3], result: 11, source: 'Server', rolledByDisplayName: 'Ada Lovelace', rolledAt: '2026-11-08T14:30:00+00:00' },
      ],
    })
    render(
      <CharacteristicsStep
        inputs={validInputs}
        errors={{}}
        {...base()}
        sheet={sheet}
        bracket={bracket17}
      />,
    )

    expect(screen.getByText('Luck rolls 45 and 55, kept 55')).toBeInTheDocument()
  })

  it('G2: marks a typed-in Luck as entered by you', () => {
    render(<CharacteristicsStep inputs={validInputs} errors={{}} {...base()} />)

    expect(screen.getByText('Luck 55 (entered by you)')).toBeInTheDocument()
  })

  it('G2: rolls only the second roll when the first was typed in', async () => {
    const props = base()
    const sheet = sheetView({
      identity: { ...validInputs.identity, age: 17 },
      ageEffects: { bracket: bracket17, deductions: {}, eduImprovementChecks: [] },
      luckRolls: [11, null],
    })
    render(
      <CharacteristicsStep inputs={validInputs} errors={{}} {...props} sheet={sheet} bracket={bracket17} luckRoll={props.luckRoll} />,
    )

    expect(screen.getByText('Luck 55 (entered by you)')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Roll your second Luck roll' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Roll your second Luck roll?' })
    expect(dialog).toHaveTextContent('The app rolls your second Luck roll (3D6) once, keeping the higher result.')
    expect(dialog.textContent).not.toContain('twice')
  })

  it('shows the inline error once, under the action', () => {
    const message = 'Roll Luck.'
    render(
      <CharacteristicsStep inputs={validInputs} errors={{ 'luckRolls[0]': message }} {...base()} sheet={unrolled25} />,
    )

    const inline = screen.getByText(message)
    expect(screen.getByRole('button', { name: 'Roll Luck' })).toHaveAttribute('aria-describedby', inline.id)
  })

  it('says the Luck was already rolled after a 409 that found results', () => {
    render(
      <CharacteristicsStep
        inputs={validInputs}
        errors={{}}
        {...base({ luckRollStatus: { state: 'alreadyRolled', group: 'luck' } })}
        sheet={sheetView({ luckRolls: [11] })}
      />,
    )

    expect(screen.getByText('Your Luck was already rolled.')).toBeInTheDocument()
  })

  it('retries a failed save and a failed roll', async () => {
    const saveFailed = base({ luckRollStatus: { state: 'saveFailed', group: 'luck' } })
    const { rerender } = render(
      <CharacteristicsStep inputs={validInputs} errors={{}} {...saveFailed} sheet={unrolled25} luckRoll={saveFailed.luckRoll} />,
    )

    expect(screen.getByText("We couldn't save your Investigator. Your changes are still here - try again.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(saveFailed.luckRoll.onRoll).toHaveBeenCalledTimes(1)

    const rollFailed = base({ luckRollStatus: { state: 'rollFailed', group: 'luck' } })
    rerender(
      <CharacteristicsStep inputs={validInputs} errors={{}} {...rollFailed} sheet={unrolled25} luckRoll={rollFailed.luckRoll} />,
    )

    expect(screen.getByText("We couldn't roll your Luck. Try again.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(rollFailed.luckRoll.onRetry).toHaveBeenCalledTimes(1)
  })

  it('reloads instead of retrying after a conflict', () => {
    const { rerender } = render(
      <CharacteristicsStep
        inputs={validInputs}
        errors={{}}
        {...base({ luckRollStatus: { state: 'saveConflict', group: 'luck' } })}
        sheet={unrolled25}
      />,
    )

    expect(screen.getByText('Your Investigator changed elsewhere, so we reloaded it.')).toBeInTheDocument()

    rerender(
      <CharacteristicsStep
        inputs={validInputs}
        errors={{}}
        {...base({ luckRollStatus: { state: 'rollConflict', group: 'luck' } })}
        sheet={unrolled25}
      />,
    )

    expect(screen.getByText("We couldn't roll your Luck. Reload the page and try again.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('disables the roll action while the roll is pending', () => {
    render(
      <CharacteristicsStep
        inputs={validInputs}
        errors={{}}
        {...base({ luckRollStatus: { state: 'pending', group: 'luck' } })}
        sheet={unrolled25}
      />,
    )

    expect(screen.getByRole('button', { name: 'Roll Luck' })).toBeDisabled()
  })
})

/** specs/character-sheet/ux.md section 6.8 "Creation locks" under Point buy and Quick fire (UX-38, G1; PBI-DICE-003). */
describe('CharacteristicsStep EDU lock', () => {
  it('disables the Point buy EDU input with the reason once an EDU check is rolled', () => {
    const sheet = sheetView({ locks: { creationMethod: false, ageBracket: true, edu: true } })
    render(<CharacteristicsStep inputs={validInputs} errors={{}} {...base()} sheet={sheet} />)

    expect(screen.getByLabelText('EDU')).toBeDisabled()
    expect(screen.getByText('Locked because you rolled an EDU check.')).toBeInTheDocument()
  })

  it('replaces the Quick fire EDU Select with text and the reason once an EDU check is rolled', () => {
    const inputs = { ...emptyInputs, creationMethod: 'QuickFire' as const, characteristics: { EDU: 80 } }
    const sheet = { ...emptySheetView(), creationMethod: 'QuickFire' as const, locks: { creationMethod: false, ageBracket: true, edu: true } }
    render(
      <CharacteristicsStep inputs={inputs} errors={{}} {...base()} sheet={sheet} allowedMethods={['QuickFire']} />,
    )

    expect(screen.queryByRole('combobox', { name: 'EDU' })).not.toBeInTheDocument()
    expect(screen.getByText('EDU 80')).toBeInTheDocument()
    expect(screen.getByText('Locked because you rolled an EDU check.')).toBeInTheDocument()
  })

  it('shows the method as text with the EDU reason once an EDU check is rolled', () => {
    const sheet = sheetView({ locks: { creationMethod: false, ageBracket: true, edu: true } })
    render(
      <CharacteristicsStep
        inputs={validInputs}
        errors={{}}
        {...base()}
        sheet={sheet}
        allowedMethods={['StandardRolling', 'PointBuy', 'QuickFire']}
        status="Draft"
      />,
    )

    expect(screen.getByText('Creation method: Point buy')).toBeInTheDocument()
    expect(screen.getByText('Locked because you rolled an EDU check. To use another method, start over.')).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
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
      ...sheetView({
        creationMethod: 'StandardRolling',
        characteristicRolls: { STR: 11 },
        rollRecords: [
          {
            purpose: 'Characteristic:STR',
            dice: '3D6',
            faces: null,
            result: 11,
            source: 'PlayerEntered',
            rolledByDisplayName: 'Ada Lovelace',
            rolledAt: null,
          },
        ],
      }),
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
        {...base({ rollStatus: { state: 'rolled', group: 'characteristics' } })}
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
        {...base({ rollStatus: { state: 'alreadyRolled', group: 'characteristics' } })}
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
    const props = base({ rollStatus: { state: 'saveFailed', group: 'characteristics' } })
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
    const props = base({ rollStatus: { state: 'rollFailed', group: 'characteristics' } })
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
        {...base({ rollStatus: { state: 'saveConflict', group: 'characteristics' } })}
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
        {...base({ rollStatus: { state: 'rollConflict', group: 'characteristics' } })}
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
        {...base({ rollStatus: { state: 'pending', group: 'characteristics' } })}
        sheet={standardSheet}
        allowedMethods={['StandardRolling']}
      />,
    )

    expect(screen.getByRole('button', { name: 'Roll characteristics' })).toBeDisabled()
  })
})
