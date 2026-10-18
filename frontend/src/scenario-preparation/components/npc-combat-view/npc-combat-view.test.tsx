import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { gangsterHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { NpcCombatView } from './npc-combat-view'

// specs/scenario-preparation/ux.md section 25.4; SP-UX-42, SP-UX-36.

describe('NpcCombatView', () => {
  it('shows Dodge with its Investigator difficulty as text, armor points, and tactics and morale', () => {
    render(<NpcCombatView combat={gangsterHumanNpc.combat!} skills={gangsterHumanNpc.skills!} />)

    const terms = screen.getAllByRole('term').map((term) => term.textContent)
    const values = screen.getAllByRole('definition').map((value) => value.textContent)
    expect(terms.slice(0, 3)).toEqual(['Dodge', 'Armor points', 'Tactics and morale'])
    expect(values.slice(0, 3)).toEqual(['40 (Investigator difficulty: Regular)', '1', 'Flees at half Hit Points.'])
  })

  it('lists the weapons with the skill value and the filled optional details', () => {
    render(<NpcCombatView combat={gangsterHumanNpc.combat!} skills={gangsterHumanNpc.skills!} />)

    const rows = within(screen.getByRole('table', { name: 'Weapons' }))
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))
    expect(rows).toEqual([
      ['Revolver', 'Firearms (Handgun) 90%', '1D10', '1', 'Range 15 yards; Ammunition 6; Malfunction 100; Impaling'],
      ['Fists', 'Fighting (Brawl) 40%', '1D3+DB', '1', ''],
    ])
  })

  it('leaves out entered-nothing lines and the weapons table when there are no weapons', () => {
    const combat = { dodge: null, dodgeDifficulty: null, armorPoints: 0, tacticsAndMorale: null, weapons: [] }

    render(<NpcCombatView combat={combat} skills={[]} />)

    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual(['Armor points'])
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('says "None recorded." for an added section with nothing in it', () => {
    render(<NpcCombatView combat={{ dodge: null, dodgeDifficulty: null, armorPoints: null, tacticsAndMorale: null, weapons: [] }} skills={[]} />)

    expect(screen.getByText('None recorded.')).toBeInTheDocument()
  })
})
