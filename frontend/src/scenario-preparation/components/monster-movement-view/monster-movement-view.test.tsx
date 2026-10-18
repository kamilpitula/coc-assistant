import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterMovementView } from './monster-movement-view'

// specs/scenario-preparation/ux.md section 25.5 (Movement); SP-UX-48.

describe('MonsterMovementView', () => {
  it('shows each mode as entered, naming an Other mode by its label', () => {
    render(<MonsterMovementView movement={ghoulMythosCreature.movement!} />)

    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual(['Walk', 'Other (phasing)'])
    expect(screen.getAllByRole('definition').map((rate) => rate.textContent)).toEqual(['8', '10'])
  })

  it('says "No ordinary movement." for an added section with no modes', () => {
    render(<MonsterMovementView movement={[]} />)

    expect(screen.getByText('No ordinary movement.')).toBeInTheDocument()
  })
})
