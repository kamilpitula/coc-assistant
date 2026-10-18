import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterSkillsView } from './monster-skills-view'

// specs/scenario-preparation/ux.md section 25.5 (Skills); SP-UX-48.

describe('MonsterSkillsView', () => {
  it('shows each skill with its value and Investigator difficulty in the entered order', () => {
    render(<MonsterSkillsView skills={ghoulMythosCreature.skills!} />)

    const rows = within(screen.getByRole('table', { name: 'Skills' })).getAllByRole('row')
    expect(rows.map((row) => row.textContent)).toEqual(['SkillValueInvestigator difficulty', 'Stealth70Hard'])
  })

  it('says "None recorded." for an added section with no skills', () => {
    render(<MonsterSkillsView skills={[]} />)

    expect(screen.getByText('None recorded.')).toBeInTheDocument()
  })
})
