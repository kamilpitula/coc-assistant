import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { stateFromHumanNpc } from '@/scenario-preparation/services/humanNpcForm'
import type { HumanNpc } from '@/scenario-preparation/types/HumanNpc'

import { NpcCharacteristicsFields } from './npc-characteristics-fields'

// specs/scenario-preparation/ux.md sections 25.2 and 25.4; SP-A11Y-19.

const npc: HumanNpc = {
  id: 'h1',
  name: 'Thug',
  age: 30,
  details: { professionOrRole: null, shortDescription: null, goal: null, relationshipToInvestigators: null, knowledge: null, secrets: null, behaviorCue: null },
  keeperNotes: null,
  characteristics: {
    values: { STR: 70 },
    difficulty: {},
    derived: { hitPoints: null, magicPoints: null, damageBonus: null, build: null, movementRate: null, movementRateNotCovered: false },
  },
  skills: null,
  combat: null,
  spells: null,
}

describe('NpcCharacteristicsFields', () => {
  it('shows eight number inputs in rule order, named with the full characteristic name, and both hints', () => {
    render(<NpcCharacteristicsFields state={stateFromHumanNpc(npc)} dispatch={vi.fn()} errorOf={() => undefined} />)

    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs.map((input) => input.getAttribute('id'))).toEqual(
      ['STR', 'CON', 'DEX', 'APP', 'POW', 'SIZ', 'INT', 'EDU'].map((code) => `field-characteristics-${code}`),
    )
    expect(screen.getByLabelText('STR Strength')).toHaveValue(70)
    expect(screen.getByLabelText('EDU Education')).toHaveValue(null)
    expect(screen.getAllByRole('spinbutton')[0]).toHaveAttribute('inputmode', 'numeric')
    expect(screen.getByText('Enter only the characteristics this Scenario needs, from 0 to 100.')).toBeInTheDocument()
    expect(screen.getByText('Hit Points and other worked-out values update when you save.')).toBeInTheDocument()
  })

  it('reports an entered value', async () => {
    const dispatch = vi.fn()
    render(<NpcCharacteristicsFields state={stateFromHumanNpc(npc)} dispatch={dispatch} errorOf={() => undefined} />)

    await userEvent.type(screen.getByLabelText('CON Constitution'), '6')

    expect(dispatch).toHaveBeenCalledWith({ type: 'setCharacteristic', code: 'CON', value: 6 })
  })

  it('shows the server message next to its field', () => {
    render(
      <NpcCharacteristicsFields
        state={stateFromHumanNpc(npc)}
        dispatch={vi.fn()}
        errorOf={(path) => (path === 'characteristics.STR' ? 'Enter STR from 0 to 100.' : undefined)}
      />,
    )

    expect(screen.getByLabelText('STR Strength')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('STR Strength')).toHaveAccessibleDescription('Enter STR from 0 to 100.')
  })

  it('renders nothing when the section was not added', () => {
    const { container } = render(<NpcCharacteristicsFields state={stateFromHumanNpc({ ...npc, characteristics: null })} dispatch={vi.fn()} errorOf={() => undefined} />)

    expect(container).toBeEmptyDOMElement()
  })
})
