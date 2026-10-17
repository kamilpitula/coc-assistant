import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { RichTextDocument } from '@/shared/types/RichText'
import { gangsterHumanNpc, knottHumanNpc, whateleyHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { HumanNpcView } from './human-npc-view'

// specs/scenario-preparation/ux.md sections 25.1 and 25.4; SP-UX-36, SP-UX-42, SP-A11Y-18, SP-A11Y-25.

const headings = () => screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)

describe('HumanNpcView', () => {
  it('shows the name as the only h1 with the type and age in a muted line', () => {
    render(<HumanNpcView humanNpc={knottHumanNpc} />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Mr. Knott' })).toBeInTheDocument()
    expect(screen.getByText(/Human NPC/)).toHaveTextContent('Age 62')
  })

  it('lists only the filled Details and shows only Details and Keeper notes for a narrative profile', () => {
    render(<HumanNpcView humanNpc={knottHumanNpc} />)

    expect(headings()).toEqual(['Details', 'Keeper notes'])
    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual(['Profession or role', 'Goal'])
    expect(screen.getByText('Rent the Corbitt House')).toBeInTheDocument()
    expect(screen.getByText('No Keeper notes yet.')).toBeInTheDocument()
  })

  it('says "No details yet." when no narrative field is filled', () => {
    render(<HumanNpcView humanNpc={whateleyHumanNpc} />)

    expect(screen.getByText('No details yet.')).toBeInTheDocument()
  })

  it('shows each added section in its fixed order and labels the narrative fields without "NPC" alone', () => {
    render(<HumanNpcView humanNpc={gangsterHumanNpc} />)

    expect(headings()).toEqual(['Details', 'Characteristics', 'Skills', 'Combat', 'Spells', 'Keeper notes'])
    expect(screen.getByText('What the Human NPC knows')).toBeInTheDocument()
    expect(screen.getByText('What the Human NPC hides')).toBeInTheDocument()
  })

  it('shows difficulty as text for characteristics, skills, and Dodge and no half or fifth values (SP-UX-42)', () => {
    render(<HumanNpcView humanNpc={gangsterHumanNpc} />)

    expect(screen.getAllByText('Hard').length).toBeGreaterThan(0)
    expect(screen.getByText('40 (Investigator difficulty: Regular)')).toBeInTheDocument()
    expect(screen.queryByText(/half value|fifth value|one-fifth/i)).not.toBeInTheDocument()
  })

  it('shows the Keeper notes document when there is one', () => {
    const notes: RichTextDocument = { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Cellar key', format: 0 }] }] } }

    render(<HumanNpcView humanNpc={{ ...knottHumanNpc, keeperNotes: notes }} />)

    expect(screen.getByText('Cellar key')).toBeInTheDocument()
    expect(screen.queryByText('No Keeper notes yet.')).not.toBeInTheDocument()
  })
})
