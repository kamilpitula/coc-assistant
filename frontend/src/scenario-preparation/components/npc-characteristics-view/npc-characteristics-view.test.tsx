import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { thugHumanNpc, whateleyHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'
import type { HumanNpcCharacteristics } from '@/scenario-preparation/types/HumanNpc'

import { NpcCharacteristicsView } from './npc-characteristics-view'

// specs/scenario-preparation/ux.md section 25.4; SP-UX-36, SP-UX-42, SP-A11Y-25.

const rowsOf = () =>
  within(screen.getByRole('table', { name: 'Characteristics' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))

describe('NpcCharacteristicsView', () => {
  it('lists only the entered characteristics with value and Investigator difficulty as text, and no half or fifth values (SP-UX-42)', () => {
    render(<NpcCharacteristicsView characteristics={thugHumanNpc.characteristics!} />)

    expect(rowsOf()).toEqual([
      ['STR Strength', '70', 'Hard'],
      ['CON Constitution', '60', 'Hard'],
      ['DEX Dexterity', '55', 'Hard'],
      ['POW Power', '50', 'Hard'],
      ['SIZ Size', '65', 'Hard'],
    ])
    expect(screen.queryByText(/half|fifth/i)).not.toBeInTheDocument()
  })

  it('shows the worked-out values under an h3 (SP-UX-36)', () => {
    render(<NpcCharacteristicsView characteristics={thugHumanNpc.characteristics!} />)

    expect(screen.getByRole('heading', { level: 3, name: 'Worked-out values' })).toBeInTheDocument()
    const terms = screen.getAllByRole('term').map((term) => term.textContent)
    const values = screen.getAllByRole('definition').map((value) => value.textContent)
    expect(terms.slice(-5)).toEqual(['Hit Points', 'Magic Points', 'Damage Bonus', 'Build', 'MOV'])
    expect(values.slice(-5)).toEqual(['12', '10', '+1D4', '1', '8'])
  })

  it('says MOV is not covered for the age, in text (SP-UX-36, SP-A11Y-25)', () => {
    render(<NpcCharacteristicsView characteristics={whateleyHumanNpc.characteristics!} />)

    expect(screen.getByText('Not covered by the rules for this age')).toBeInTheDocument()
    expect(screen.queryByText('Hit Points')).not.toBeInTheDocument()
  })

  it('explains when nothing can be worked out yet', () => {
    const characteristics: HumanNpcCharacteristics = {
      values: { APP: 60 },
      difficulty: { APP: 'Hard' },
      derived: { hitPoints: null, magicPoints: null, damageBonus: null, build: null, movementRate: null, movementRateNotCovered: false },
    }

    render(<NpcCharacteristicsView characteristics={characteristics} />)

    expect(screen.getByText('Worked-out values appear when the characteristics they need are entered.')).toBeInTheDocument()
  })

  it('says "None recorded." for an added section with no values', () => {
    const empty: HumanNpcCharacteristics = { values: { STR: null }, difficulty: {}, derived: thugHumanNpc.characteristics!.derived }

    render(<NpcCharacteristicsView characteristics={empty} />)

    expect(screen.getByText('None recorded.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
