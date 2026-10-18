import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import {
  bareMythosCreature,
  dissolvingGhoul,
  ghoulMythosCreature,
  narrativeGhoul,
  overriddenGhoul,
} from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MythosCreatureView } from './mythos-creature-view'

// specs/scenario-preparation/ux.md sections 25.1 and 25.5; SP-UX-36, SP-UX-45, SP-UX-46, SP-UX-48, SP-A11Y-18, SP-A11Y-28.

const headings = () => screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)

describe('MythosCreatureView', () => {
  it('shows the name as the only h1, the type with the Creature Kind, and Details with its filled fields', () => {
    render(<MythosCreatureView mythosCreature={narrativeGhoul} />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Ghoul' })).toBeInTheDocument()
    expect(screen.getByText(/Mythos Creature/)).toHaveTextContent(/Mythos$/)
    expect(screen.getByText('Origin', { selector: 'dt' }).nextElementSibling).toHaveTextContent('Crypts under Arkham')
    expect(screen.getByText('Defeat outcome', { selector: 'dt' }).nextElementSibling).toHaveTextContent('Flees into the tunnels.')
  })

  it('shows "No details yet." and "No Keeper notes yet." and no optional section for a bare Mythos Creature', () => {
    render(<MythosCreatureView mythosCreature={bareMythosCreature} />)

    expect(headings()).toEqual(['Details', 'Keeper notes'])
    expect(screen.getByText('No details yet.')).toBeInTheDocument()
    expect(screen.getByText('No Keeper notes yet.')).toBeInTheDocument()
  })

  it('shows every added section in its fixed order (SP-UX-36)', () => {
    render(<MythosCreatureView mythosCreature={ghoulMythosCreature} />)

    expect(headings()).toEqual(['Details', 'Characteristics', 'Movement', 'Combat', 'Defenses', 'Skills', 'Spells', 'Powers', 'Sanity loss', 'Keeper notes'])
    expect(screen.getByText('Limits: Once per day')).toBeInTheDocument()
    expect(screen.getByText('Sanity loss 0/1D6')).toBeInTheDocument()
  })

  it('shows a section index with a link to each present section, and a link moves focus to its section (SP-UX-45, SP-A11Y-28)', async () => {
    render(<MythosCreatureView mythosCreature={ghoulMythosCreature} />)

    const nav = screen.getByRole('navigation', { name: 'On this page' })
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Details',
      'Characteristics',
      'Movement',
      'Combat',
      'Defenses',
      'Skills',
      'Spells',
      'Powers',
      'Sanity loss',
      'Keeper notes',
    ])

    await userEvent.click(within(nav).getByRole('link', { name: 'Sanity loss' }))

    expect(screen.getByRole('heading', { level: 2, name: 'Sanity loss' }).closest('section')).toHaveFocus()
  })

  it('lists only the added sections in the index', () => {
    render(<MythosCreatureView mythosCreature={narrativeGhoul} />)

    expect(within(screen.getByRole('navigation', { name: 'On this page' })).getAllByRole('link').map((link) => link.textContent)).toEqual(['Details', 'Keeper notes'])
  })

  it('shows an override beside the computed value and Hit Points not applicable with the defeat outcome (SP-UX-46)', () => {
    const { rerender } = render(<MythosCreatureView mythosCreature={overriddenGhoul} />)
    expect(screen.getByText(/40 \(no computed value: needs CON and SIZ\)/)).toBeInTheDocument()

    rerender(<MythosCreatureView mythosCreature={dissolvingGhoul} />)
    expect(screen.getByText('Not applicable')).toBeInTheDocument()
    expect(screen.getByText('Defeat outcome: It dissolves into black water at dawn.')).toBeInTheDocument()
  })

  it('shows the Keeper notes when there are some', () => {
    const notes = {
      root: {
        type: 'root' as const,
        children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: 'Lair under the church', format: 0, style: '', mode: 'normal', detail: 0 }] }],
      },
    }

    render(<MythosCreatureView mythosCreature={{ ...bareMythosCreature, keeperNotes: notes }} />)

    expect(screen.queryByText('No Keeper notes yet.')).not.toBeInTheDocument()
  })
})
