import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'
import { HeadingOffsetProvider } from '@/shared/providers/heading-offset/heading-offset'

import { MonsterDefensesView } from './monster-defenses-view'

// specs/scenario-preparation/ux.md section 25.5 (Defenses).

describe('MonsterDefensesView', () => {
  it('shows armor points, the immunities, and the vulnerabilities under their own headings', () => {
    render(<MonsterDefensesView defenses={ghoulMythosCreature.defenses!} />)

    expect(screen.getByText('Armor points', { selector: 'dt' }).nextElementSibling).toHaveTextContent('0')
    expect(screen.queryByText('Armor note')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Immunities' })).toBeInTheDocument()
    expect(screen.getByText('Ordinary bullets inflict no damage.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Vulnerabilities' })).toBeInTheDocument()
    expect(screen.getByText('Fire')).toBeInTheDocument()
  })

  it('leaves out a list with no entries and shows the armor note when entered', () => {
    render(<MonsterDefensesView defenses={{ armorPoints: 2, armorNote: 'Leathery hide', immunities: [], vulnerabilities: [] }} />)

    expect(screen.getByText('Leathery hide')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })

  it('says "None recorded." when the whole section is empty', () => {
    render(<MonsterDefensesView defenses={{ armorPoints: null, armorNote: null, immunities: [], vulnerabilities: [] }} />)

    expect(screen.getByText('None recorded.')).toBeInTheDocument()
  })

  it('shifts the entry headings to h6 inside a +3 offset provider (NAV-UX-9, entity panel)', () => {
    render(
      <HeadingOffsetProvider value={3}>
        <MonsterDefensesView defenses={ghoulMythosCreature.defenses!} />
      </HeadingOffsetProvider>,
    )

    expect(screen.getByRole('heading', { level: 6, name: 'Immunities' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 6, name: 'Vulnerabilities' })).toBeInTheDocument()
  })
})
