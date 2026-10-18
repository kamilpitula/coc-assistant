import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { gangsterHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { NpcSkillsView } from './npc-skills-view'

// specs/scenario-preparation/ux.md section 25.4; SP-UX-36, SP-UX-42.

describe('NpcSkillsView', () => {
  it('lists the skills in the entered order with value and Investigator difficulty (Spot Hidden 55 is Hard)', () => {
    render(<NpcSkillsView skills={gangsterHumanNpc.skills!} />)

    const rows = within(screen.getByRole('table', { name: 'Skills' }))
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))
    expect(rows).toEqual([
      ['Spot Hidden', '55', 'Hard'],
      ['Firearms (Handgun)', '90', 'Extreme'],
      ['Fighting (Brawl)', '40', 'Regular'],
    ])
  })

  it('says "None recorded." for an added section with no skills', () => {
    render(<NpcSkillsView skills={[]} />)

    expect(screen.getByText('None recorded.')).toBeInTheDocument()
  })
})
