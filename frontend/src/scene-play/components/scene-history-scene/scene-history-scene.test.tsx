import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { keeperReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import type { KeeperHistoryScene, PlayerHistoryScene } from '@/scene-play/types/SceneHistory'

import { SceneHistoryScene } from './scene-history-scene'

// specs/scene-play/ux.md section 23.2; SPL-UX-62, 63, 64, 67; SPL-A11Y-23, 24.
vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/hooks/useReveals', () => ({ useRevealFile: vi.fn() }))

const keeperScene: KeeperHistoryScene = {
  sceneId: 's2',
  scenarioId: 'p1',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  startedAt: '2026-11-07T19:05:00Z',
  finishedAt: null,
  investigatorsPresent: [
    { id: 'i1', name: 'Harvey Walters' },
    { id: 'i2', name: 'Lucy Ward' },
  ],
  reveals: [keeperReveal(textReveal, 'h1', ['Harvey Walters'])],
}

const playerScene: PlayerHistoryScene = {
  sceneId: 's2',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  startedAt: '2026-11-07T19:05:00Z',
  finishedAt: '2026-11-07T21:00:00Z',
  reveals: [textReveal],
}

describe('SceneHistoryScene', () => {
  it('shows the Keeper Scene with its Scenario, times, present list, and every Reveal with its recipients (SPL-UX-62, 63)', async () => {
    render(<SceneHistoryScene campaignId="c1" scene={keeperScene} investigatorName={null} />)

    const section = screen.getByRole('region', { name: 'The Corbitt House' })
    expect(within(section).getByRole('heading', { level: 2, name: 'The Corbitt House' })).toBeInTheDocument()
    expect(within(section).getByText('Scenario: The Haunting')).toBeInTheDocument()
    const times = within(section).getAllByRole('time')
    expect(times.map((time) => time.getAttribute('datetime'))).toEqual(['2026-11-07T19:05:00Z', '2026-10-28T19:52:00Z'])
    expect(within(section).getByText('Investigators present: Harvey Walters and Lucy Ward')).toBeInTheDocument()
    expect(within(section).getByText('Active')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'Open Active Scene' })).toHaveAttribute('href', '/campaigns/c1/active-scene')
    expect(within(section).getByText(/to Harvey Walters/)).toBeInTheDocument()
    expect(within(section).queryByText(/Nothing was revealed/)).not.toBeInTheDocument()

    await userEvent.click(within(section).getByRole('button', { name: 'Show A letter from Knott' }))
    expect(within(section).getByText('Come at once.')).toBeInTheDocument()
  })

  it('shows the Player Scene without the present list or recipients, and "Finished" instead of the badge (SPL-UX-64)', () => {
    render(<SceneHistoryScene campaignId="c1" scene={playerScene} investigatorName="Harvey Walters" />)

    const section = screen.getByRole('region', { name: 'The Corbitt House' })
    expect(within(section).getByText('Scenario: The Haunting')).toBeInTheDocument()
    const times = within(section).getAllByRole('time')
    expect(times.map((time) => time.getAttribute('datetime'))).toEqual(['2026-11-07T19:05:00Z', '2026-11-07T21:00:00Z', '2026-10-28T19:52:00Z'])
    expect(within(section).queryByText(/Investigators present/)).not.toBeInTheDocument()
    expect(within(section).queryByText(/to Harvey Walters/)).not.toBeInTheDocument()
    expect(within(section).queryByRole('link', { name: 'Open Active Scene' })).not.toBeInTheDocument()
    expect(within(section).getByRole('heading', { level: 3, name: 'A letter from Knott' })).toBeInTheDocument()
  })

  it('says the Keeper Scene revealed nothing when it has no Reveals', () => {
    render(<SceneHistoryScene campaignId="c1" scene={{ ...keeperScene, reveals: [] }} investigatorName={null} />)

    expect(screen.getByText('Nothing was revealed in this Scene.')).toBeInTheDocument()
  })

  it('names whose Investigator a Scene left empty for the Player', () => {
    render(<SceneHistoryScene campaignId="c1" scene={{ ...playerScene, reveals: [] }} investigatorName="Harvey Walters" />)

    expect(screen.getByText('Nothing from this Scene reached Harvey Walters.')).toBeInTheDocument()
  })

  it('shows no per-Scene sentence for a Player without an Approved Investigator', () => {
    render(<SceneHistoryScene campaignId="c1" scene={{ ...playerScene, reveals: [] }} investigatorName={null} />)

    expect(screen.queryByText(/Nothing from this Scene reached/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Nothing was revealed/)).not.toBeInTheDocument()
  })

  it('names an unnamed Investigator in the present list', () => {
    render(
      <SceneHistoryScene
        campaignId="c1"
        scene={{ ...keeperScene, investigatorsPresent: [{ id: 'i1', name: null }] }}
        investigatorName={null}
      />,
    )

    expect(screen.getByText('Investigators present: Unnamed Investigator')).toBeInTheDocument()
  })
})
