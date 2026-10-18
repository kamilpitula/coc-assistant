import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { dissolvingGhoul, ghoulMythosCreature, overriddenGhoul } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterCharacteristicsView } from './monster-characteristics-view'

// specs/scenario-preparation/ux.md section 25.5; SP-UX-36, SP-UX-46, SP-UX-48, SP-A11Y-25.

const view = (creature = ghoulMythosCreature) => (
  <MonsterCharacteristicsView characteristics={creature.characteristics!} defeatOutcome={creature.details.defeatOutcome} />
)

describe('MonsterCharacteristicsView', () => {
  it('lists the entered characteristics with their Investigator difficulty as text, in the Monster Profile order', () => {
    render(view())

    const rows = within(screen.getByRole('table', { name: 'Characteristics' })).getAllByRole('row')
    expect(rows.map((row) => row.textContent)).toEqual([
      'CharacteristicValueInvestigator difficulty',
      'STR Strength80Hard',
      'CON Constitution60Hard',
      'SIZ Size60Hard',
      'DEX Dexterity60Hard',
      'INT Intelligence60Hard',
      'POW Power60Hard',
    ])
  })

  it('shows the computed Hit Points, Magic Points, Damage Bonus, and Build, and no MOV (SP-UX-36)', () => {
    render(view())

    expect(screen.getByRole('heading', { level: 3, name: 'Worked-out values' })).toBeInTheDocument()
    const list = screen.getByText('Hit Points', { selector: 'dt' }).closest('dl')!
    expect(within(list).getAllByRole('term').map((term) => term.textContent)).toEqual(['Hit Points', 'Magic Points', 'Damage Bonus', 'Build'])
    expect(list).toHaveTextContent('12')
    expect(list).toHaveTextContent('+1D4')
    expect(screen.queryByText(/MOV/)).not.toBeInTheDocument()
  })

  it('shows an override beside the computed value with its reason (SP-UX-46)', () => {
    const computedAlso = {
      ...ghoulMythosCreature,
      characteristics: {
        ...ghoulMythosCreature.characteristics!,
        overrides: { hitPoints: { value: 40, reason: 'Swollen with stolen life' }, magicPoints: null, damageBonus: { value: '+2D6', reason: 'Strong' }, build: null },
      },
    }

    render(view(computedAlso))

    expect(screen.getByText(/40 \(computed 12\)/)).toBeInTheDocument()
    expect(screen.getByText('Reason: Swollen with stolen life')).toBeInTheDocument()
    expect(screen.getByText(/\+2D6 \(computed \+1D4\)/)).toBeInTheDocument()
    expect(screen.getByText('Reason: Strong')).toBeInTheDocument()
  })

  it('says what an override lacks when the computed value cannot be worked out (SP-UX-46)', () => {
    render(view(overriddenGhoul))

    expect(screen.getByText(/40 \(no computed value: needs CON and SIZ\)/)).toBeInTheDocument()
    expect(screen.getByText(/5 \(no computed value: needs POW\)/)).toBeInTheDocument()
    expect(screen.getByText(/\+2D6 \(no computed value: needs STR and SIZ\)/)).toBeInTheDocument()
    expect(screen.getByText(/3 \(no computed value: needs STR and SIZ\)/)).toBeInTheDocument()
    expect(screen.getByText('Reason: Hulking')).toBeInTheDocument()
  })

  it('shows "Not applicable" with the defeat outcome for Hit Points (SP-UX-46)', () => {
    render(view(dissolvingGhoul))

    const term = screen.getByText('Hit Points', { selector: 'dt' })
    expect(term.nextElementSibling).toHaveTextContent('Not applicable')
    expect(term.nextElementSibling).toHaveTextContent('Defeat outcome: It dissolves into black water at dawn.')
  })

  it('explains when nothing can be worked out yet, and says "None recorded." for an empty section', () => {
    const onlyStrength = {
      ...ghoulMythosCreature,
      characteristics: { ...ghoulMythosCreature.characteristics!, values: { STR: 80 }, difficulty: { STR: 'Hard' as const }, derived: { hitPoints: null, magicPoints: null, damageBonus: null, build: null } },
    }
    const { rerender } = render(view(onlyStrength))
    expect(screen.getByText('Worked-out values appear when the characteristics they need are entered.')).toBeInTheDocument()

    rerender(view({ ...onlyStrength, characteristics: { ...onlyStrength.characteristics, values: {}, difficulty: {} } }))
    expect(screen.getByText('None recorded.')).toBeInTheDocument()
  })
})
