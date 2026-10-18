import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterCombatView } from './monster-combat-view'

// specs/scenario-preparation/ux.md section 25.5 (Combat); SP-UX-48.

describe('MonsterCombatView', () => {
  it('shows attacks per round and Dodge with its Investigator difficulty as text', () => {
    render(<MonsterCombatView combat={ghoulMythosCreature.combat!} />)

    expect(screen.getByText('Attacks per round', { selector: 'dt' }).nextElementSibling).toHaveTextContent('3')
    expect(screen.getByText('Dodge', { selector: 'dt' }).nextElementSibling).toHaveTextContent('30 (Investigator difficulty: Regular)')
  })

  it('shows each attack with its skill and value, difficulty, damage, and effect; a manoeuvre without damage reads Manoeuvre', () => {
    render(<MonsterCombatView combat={ghoulMythosCreature.combat!} />)

    const rows = within(screen.getByRole('table', { name: 'Attacks' })).getAllByRole('row')
    expect(rows.map((row) => row.textContent)).toEqual([
      'AttackSkillInvestigator difficultyDamageEffect',
      'ClawFighting 40%Regular1D6+DBGrapples on a hit.',
      'Drag downFighting 50%HardManoeuvre',
    ])
  })

  it('leaves out what was not entered and says "None recorded." for an empty added section', () => {
    const { rerender } = render(<MonsterCombatView combat={{ attacksPerRound: 2, dodge: null, dodgeDifficulty: null, attacks: [] }} />)
    expect(screen.queryByText('Dodge')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    rerender(<MonsterCombatView combat={{ attacksPerRound: null, dodge: null, dodgeDifficulty: null, attacks: [] }} />)
    expect(screen.getByText('None recorded.')).toBeInTheDocument()
  })
})
