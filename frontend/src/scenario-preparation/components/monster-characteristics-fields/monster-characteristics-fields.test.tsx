import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useReducer } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { mythosCreatureFormReducer, stateFromMythosCreature, inputFromState } from '@/scenario-preparation/services/mythosCreatureForm'
import { bareMythosCreature, dissolvingGhoul, ghoulMythosCreature, overriddenGhoul } from '@/scenario-preparation/test-support/mythosCreatureFixtures'
import type { MythosCreature } from '@/scenario-preparation/types/MythosCreature'

import { MonsterCharacteristicsFields } from './monster-characteristics-fields'

// specs/scenario-preparation/ux.md section 25.5 (Characteristics); SP-UX-46, SP-UX-49, SP-A11Y-19, SP-A11Y-29.

const noErrors = () => undefined

/** The fields over the real reducer, so a click shows what the Keeper would see next. */
function Harness({ creature, onInput }: { creature: MythosCreature; onInput?: (input: ReturnType<typeof inputFromState>) => void }) {
  const [state, dispatch] = useReducer(mythosCreatureFormReducer, creature, stateFromMythosCreature)
  onInput?.(inputFromState(state, null))
  return <MonsterCharacteristicsFields state={state} dispatch={dispatch} errorOf={noErrors} />
}

describe('MonsterCharacteristicsFields', () => {
  it('shows STR, CON, SIZ, DEX, INT, and POW with the code and full name, and the hints', () => {
    render(<MonsterCharacteristicsFields state={stateFromMythosCreature(ghoulMythosCreature)} dispatch={vi.fn()} errorOf={noErrors} />)

    expect(screen.getByLabelText('STR Strength')).toHaveValue(80)
    for (const label of ['CON Constitution', 'SIZ Size', 'DEX Dexterity', 'INT Intelligence', 'POW Power']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.getByText('Enter only the characteristics this Mythos Creature needs, from 0 to 2,000.')).toBeInTheDocument()
    expect(screen.getByText('Hit Points and other worked-out values update when you save.')).toBeInTheDocument()
  })

  it('offers APP and EDU only through Add APP and Add EDU, and shows an input that has a value (SP-UX-49)', () => {
    const { rerender } = render(<MonsterCharacteristicsFields state={stateFromMythosCreature(ghoulMythosCreature)} dispatch={vi.fn()} errorOf={noErrors} />)
    expect(screen.queryByLabelText('APP Appearance')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add APP' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add EDU' })).toBeInTheDocument()

    const withApp = { ...ghoulMythosCreature, characteristics: { ...ghoulMythosCreature.characteristics!, values: { ...ghoulMythosCreature.characteristics!.values, APP: 70 } } }
    rerender(<MonsterCharacteristicsFields state={stateFromMythosCreature(withApp)} dispatch={vi.fn()} errorOf={noErrors} />)
    expect(screen.getByLabelText('APP Appearance')).toHaveValue(70)
    expect(screen.queryByRole('button', { name: 'Add APP' })).not.toBeInTheDocument()
  })

  it('replaces Add APP with its input and moves focus there when activated (SP-UX-49)', async () => {
    function Focusing() {
      const [state, dispatch] = useReducer(mythosCreatureFormReducer, ghoulMythosCreature, stateFromMythosCreature)
      if (state.focusTarget) {
        queueMicrotask(() => document.getElementById(state.focusTarget!)?.focus())
      }
      return <MonsterCharacteristicsFields state={state} dispatch={dispatch} errorOf={noErrors} />
    }
    render(<Focusing />)

    await userEvent.click(screen.getByRole('button', { name: 'Add APP' }))

    expect(screen.queryByRole('button', { name: 'Add APP' })).not.toBeInTheDocument()
    expect(await screen.findByLabelText('APP Appearance')).toHaveFocus()
  })

  it('offers Hit Points as three choices in a group with a legend, defaulting to working them out (SP-A11Y-29)', () => {
    render(<MonsterCharacteristicsFields state={stateFromMythosCreature(ghoulMythosCreature)} dispatch={vi.fn()} errorOf={noErrors} />)

    const group = screen.getByRole('group', { name: 'Hit Points' })
    expect(within(group).getAllByRole('radio').map((radio) => radio.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false'])
    expect(within(group).getByRole('radio', { name: 'Work out from the characteristics' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Reason for the Hit Points override')).not.toBeInTheDocument()
  })

  it('reveals the Hit Points value and reason for Override, and the Defeat outcome hint for Not applicable (SP-UX-46)', async () => {
    const inputs: ReturnType<typeof inputFromState>[] = []
    render(<Harness creature={ghoulMythosCreature} onInput={(input) => inputs.push(input)} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Override' }))
    expect(screen.getByLabelText('Hit Points')).toHaveAccessibleDescription('From 1 to 9,999.')
    await userEvent.type(screen.getByLabelText('Hit Points'), '40')
    await userEvent.type(screen.getByLabelText('Reason for the Hit Points override'), 'Swollen')
    expect(screen.getByLabelText('Reason for the Hit Points override')).toHaveAccessibleDescription('Why it differs from the rules, up to 500 characters.')
    expect(inputs.at(-1)?.characteristics?.overrides.hitPoints).toEqual({ value: 40, reason: 'Swollen' })

    await userEvent.click(screen.getByRole('radio', { name: 'Not applicable' }))
    expect(screen.queryByLabelText('Hit Points')).not.toBeInTheDocument()
    expect(screen.getByText('Describe the Defeat outcome under Details.')).toBeInTheDocument()
    expect(inputs.at(-1)?.characteristics).toMatchObject({ hitPointsNotApplicable: true })
    expect(inputs.at(-1)?.characteristics?.overrides.hitPoints).toBeNull()
  })

  it('shows the saved overrides with their reasons and checks their boxes', () => {
    render(<MonsterCharacteristicsFields state={stateFromMythosCreature(overriddenGhoul)} dispatch={vi.fn()} errorOf={noErrors} />)

    expect(screen.getByRole('radio', { name: 'Override' })).toBeChecked()
    expect(screen.getByLabelText('Hit Points')).toHaveValue(40)
    expect(screen.getByRole('checkbox', { name: 'Override Magic Points' })).toBeChecked()
    expect(screen.getByLabelText('Reason for the Magic Points override')).toHaveValue('Drained')
    expect(screen.getByRole('checkbox', { name: 'Override Damage Bonus' })).toBeChecked()
    expect(screen.getByLabelText('Damage Bonus')).toHaveValue('+2D6')
    expect(screen.getByLabelText('Damage Bonus')).toHaveAccessibleDescription('Write it like +1D4, -1, or 0.')
    expect(screen.getByRole('checkbox', { name: 'Override Build' })).toBeChecked()
    expect(screen.getByLabelText('Build')).toHaveAccessibleDescription('From -2 to 99.')
  })

  it('reveals and clears the fields of each Override checkbox and groups them under a legend (SP-UX-46, SP-A11Y-29)', async () => {
    const inputs: ReturnType<typeof inputFromState>[] = []
    render(<Harness creature={ghoulMythosCreature} onInput={(input) => inputs.push(input)} />)
    expect(screen.queryByLabelText('Reason for the Build override')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Override Build' }))
    const build = screen.getByRole('group', { name: 'Build' })
    await userEvent.type(within(build).getByLabelText('Build'), '3')
    await userEvent.type(within(build).getByLabelText('Reason for the Build override'), 'Hulking')
    expect(inputs.at(-1)?.characteristics?.overrides.build).toEqual({ value: 3, reason: 'Hulking' })

    await userEvent.click(screen.getByRole('checkbox', { name: 'Override Build' }))
    expect(screen.queryByLabelText('Reason for the Build override')).not.toBeInTheDocument()
    expect(inputs.at(-1)?.characteristics?.overrides.build).toBeNull()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Override Damage Bonus' }))
    await userEvent.type(screen.getByLabelText('Damage Bonus'), '+1D4')
    expect(inputs.at(-1)?.characteristics?.overrides.damageBonus).toEqual({ value: '+1D4', reason: null })
  })

  it('shows Not applicable as chosen for a profile whose Hit Points do not apply', () => {
    render(<MonsterCharacteristicsFields state={stateFromMythosCreature(dissolvingGhoul)} dispatch={vi.fn()} errorOf={noErrors} />)

    expect(screen.getByRole('radio', { name: 'Not applicable' })).toBeChecked()
  })

  it('shows the server messages next to the fields', () => {
    render(
      <MonsterCharacteristicsFields
        state={stateFromMythosCreature(overriddenGhoul)}
        dispatch={vi.fn()}
        errorOf={(path) =>
          ({
            'characteristics.values.STR': 'Enter STR from 0 to 2,000.',
            'characteristics.overrides.hitPoints.reason': 'Give a reason for the override.',
            'characteristics.overrides.damageBonus.value': 'Write the Damage Bonus like +1D4, -1, or 0.',
          })[path]
        }
      />,
    )

    expect(screen.getByLabelText('STR Strength')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Reason for the Hit Points override')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Damage Bonus')).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders nothing while the section is not added', () => {
    const { container } = render(<MonsterCharacteristicsFields state={stateFromMythosCreature(bareMythosCreature)} dispatch={vi.fn()} errorOf={noErrors} />)

    expect(container).toBeEmptyDOMElement()
  })
})
