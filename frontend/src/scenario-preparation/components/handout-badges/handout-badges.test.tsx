import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HandoutBadges } from './handout-badges'

// specs/scenario-preparation/ux.md section 41; SP-UX-64, SP-UX-67, SP-A11Y-38.
describe('HandoutBadges', () => {
  it.each([
    ['ReadAloud', 'PlayerFacing', 'Read-aloud', 'Player-facing'],
    ['Text', 'KeeperFacing', 'Text', 'Keeper-facing'],
    ['ReadAloud', 'KeeperFacing', 'Read-aloud', 'Keeper-facing'],
    ['Text', 'PlayerFacing', 'Text', 'Player-facing'],
  ] as const)('shows a %s %s Handout as the text "%s" and "%s"', (kind, visibility, kindLabel, visibilityLabel) => {
    render(<HandoutBadges kind={kind} visibility={visibility} />)

    expect(screen.getByText(kindLabel)).toBeInTheDocument()
    expect(screen.getByText(visibilityLabel)).toBeInTheDocument()
  })

  it('keeps every icon out of the accessibility tree, so the text carries the meaning (SP-A11Y-38)', () => {
    const { container } = render(<HandoutBadges kind="ReadAloud" visibility="PlayerFacing" />)

    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
    expect(Array.from(icons).every((icon) => icon.getAttribute('aria-hidden') === 'true')).toBe(true)
  })

  it('uses a different icon for each visibility', () => {
    const player = render(<HandoutBadges kind="Text" visibility="PlayerFacing" />)
    const keeper = render(<HandoutBadges kind="Text" visibility="KeeperFacing" />)

    expect(player.container.innerHTML).not.toBe(keeper.container.innerHTML)
  })
})
