import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { RequestedRoll, RollRequest } from '@/roll-requests/types/RollRequest'
import { keeperReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import type { KeeperHistoryScene, PlayerHistoryScene } from '@/scene-play/types/SceneHistory'

import { SceneHistoryScene } from './scene-history-scene'

// specs/scene-play/ux.md section 23.11; SPL-UX-73 to SPL-UX-76, SPL-A11Y-28; SPL-UX-62, 63, 64.
vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/hooks/useReveals', () => ({ useRevealFile: vi.fn() }))

function waitingRoll(investigatorId: string, investigatorName: string): RequestedRoll {
  return {
    investigatorId,
    investigatorName,
    targetValue: 60,
    usesBaseValue: false,
    canEarnExperienceCheck: false,
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    status: 'Waiting',
    rolls: [],
  }
}

function publicRequest(id: string, createdAt: string, investigatorId = 'i1', investigatorName = 'Harvey Walters'): RollRequest {
  return {
    id,
    target: { kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null },
    message: 'Something moves upstairs.',
    visibility: 'Public',
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    createdAt,
    requestedRolls: [waitingRoll(investigatorId, investigatorName)],
  }
}

const hiddenRequest: RollRequest = {
  ...publicRequest('q2', '2026-11-07T19:31:00Z'),
  target: { kind: 'Skill', skill: 'Psychology', specialization: null, characteristic: null },
  visibility: 'KeeperOnly',
}

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
  rollRequests: [publicRequest('q1', '2026-11-07T19:14:00Z')],
}

const playerScene: PlayerHistoryScene = {
  sceneId: 's2',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  startedAt: '2026-11-07T19:05:00Z',
  finishedAt: '2026-11-07T21:00:00Z',
  reveals: [textReveal],
  rollRequests: [publicRequest('q1', '2026-11-07T19:14:00Z')],
}

describe('SceneHistoryScene', () => {
  it('shows the Keeper Scene with its Scenario, times, present list, and every Reveal with its recipients (SPL-UX-62, 63)', async () => {
    render(<SceneHistoryScene campaignId="c1" scene={keeperScene} investigatorName={null} requestedByDisplayName="Eleanor Hart" />)

    const section = screen.getByRole('region', { name: 'The Corbitt House' })
    expect(within(section).getByRole('heading', { level: 2, name: 'The Corbitt House' })).toBeInTheDocument()
    expect(within(section).getByText('Scenario: The Haunting')).toBeInTheDocument()
    const times = within(section).getAllByRole('time')
    expect(times.map((time) => time.getAttribute('datetime'))).toEqual(['2026-11-07T19:05:00Z', '2026-11-07T19:14:00Z', '2026-10-28T19:52:00Z'])
    expect(within(section).getByText('Investigators present: Harvey Walters and Lucy Ward')).toBeInTheDocument()
    expect(within(section).getByText('Active')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'Open Active Scene' })).toHaveAttribute('href', '/campaigns/c1/active-scene')
    expect(within(section).getByText(/to Harvey Walters/)).toBeInTheDocument()
    expect(within(section).queryByText(/Nothing was revealed/)).not.toBeInTheDocument()

    await userEvent.click(within(section).getByRole('button', { name: 'Show A letter from Knott' }))
    expect(within(section).getByText('Come at once.')).toBeInTheDocument()
  })

  it('shows the Player Scene without the present list or recipients, and "Finished" instead of the badge (SPL-UX-64)', () => {
    render(<SceneHistoryScene campaignId="c1" scene={playerScene} investigatorName="Harvey Walters" requestedByDisplayName="Eleanor Hart" />)

    const section = screen.getByRole('region', { name: 'The Corbitt House' })
    expect(within(section).getByText('Scenario: The Haunting')).toBeInTheDocument()
    const times = within(section).getAllByRole('time')
    expect(times.map((time) => time.getAttribute('datetime'))).toEqual([
      '2026-11-07T19:05:00Z',
      '2026-11-07T21:00:00Z',
      '2026-11-07T19:14:00Z',
      '2026-10-28T19:52:00Z',
    ])
    expect(within(section).queryByText(/Investigators present/)).not.toBeInTheDocument()
    expect(within(section).queryByText(/to Harvey Walters/)).not.toBeInTheDocument()
    expect(within(section).queryByRole('link', { name: 'Open Active Scene' })).not.toBeInTheDocument()
    expect(within(section).getByRole('heading', { level: 3, name: 'A letter from Knott' })).toBeInTheDocument()
  })

  it('shows nothing was revealed or rolled when the Keeper Scene is empty (SPL-UX-76)', () => {
    render(
      <SceneHistoryScene
        campaignId="c1"
        scene={{ ...keeperScene, reveals: [], rollRequests: [] }}
        investigatorName={null}
        requestedByDisplayName="Eleanor Hart"
      />,
    )

    expect(screen.getByText('Nothing was revealed or rolled in this Scene.')).toBeInTheDocument()
  })

  it('shows nothing was revealed or rolled when the Keeper Scene holds only Cancelled rolls (SPL-UX-75, SPL-UX-76)', () => {
    const cancelled = publicRequest('q1', '2026-11-07T19:14:00Z')
    const allCancelled: RollRequest = {
      ...cancelled,
      requestedRolls: [{ ...cancelled.requestedRolls[0], status: 'Cancelled' }],
    }
    render(
      <SceneHistoryScene
        campaignId="c1"
        scene={{ ...keeperScene, reveals: [], rollRequests: [allCancelled] }}
        investigatorName={null}
        requestedByDisplayName="Eleanor Hart"
      />,
    )

    expect(screen.getByText('Nothing was revealed or rolled in this Scene.')).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Spot Hidden roll' })).not.toBeInTheDocument()
  })

  it('hides Cancelled rows of a listed card and keeps its Waiting rows (RR-UX-24)', () => {
    const mixed = publicRequest('q1', '2026-11-07T19:14:00Z')
    const visible = { ...mixed.requestedRolls[0] }
    const hidden = { ...mixed.requestedRolls[0], investigatorId: 'i2', investigatorName: 'Lucy Ward', status: 'Cancelled' as const }
    render(
      <SceneHistoryScene
        campaignId="c1"
        scene={{ ...keeperScene, reveals: [], rollRequests: [{ ...mixed, requestedRolls: [visible, hidden] }] }}
        investigatorName={null}
        requestedByDisplayName="Eleanor Hart"
      />,
    )

    const article = screen.getByRole('article', { name: 'Spot Hidden roll' })
    expect(within(article).getByText('Harvey Walters')).toBeInTheDocument()
    expect(within(article).queryByText('Lucy Ward')).not.toBeInTheDocument()
    expect(within(article).queryByText('Cancelled')).not.toBeInTheDocument()
  })

  it('lists each Scene with its Reveals and Roll Requests newest first, with the Keeper-only badge for the Keeper (SPL-UX-73, SPL-UX-74)', () => {
    render(
      <SceneHistoryScene
        campaignId="c1"
        scene={{ ...keeperScene, rollRequests: [publicRequest('q1', '2026-11-07T19:14:00Z'), hiddenRequest] }}
        investigatorName={null}
        requestedByDisplayName="Eleanor Hart"
      />,
    )

    const section = screen.getByRole('region', { name: 'The Corbitt House' })
    expect(within(section).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Psychology roll',
      'Spot Hidden roll',
      'A letter from Knott',
    ])
    expect(within(section).getByText('Keeper only')).toBeInTheDocument()
  })

  it('shows the Player a Public roll for another Investigator as an article with an h3 (SPL-UX-74, SPL-A11Y-28)', () => {
    render(
      <SceneHistoryScene
        campaignId="c1"
        scene={{ ...playerScene, reveals: [], rollRequests: [publicRequest('q1', '2026-11-07T19:14:00Z', 'i2', 'Lucy Ward')] }}
        investigatorName="Harvey Walters"
        requestedByDisplayName="Eleanor Hart"
      />,
    )

    const article = screen.getByRole('article', { name: 'Spot Hidden roll' })
    expect(within(article).getByRole('heading', { level: 3, name: 'Spot Hidden roll' })).toBeInTheDocument()
    expect(within(article).getByText('Lucy Ward')).toBeInTheDocument()
    expect(within(article).queryByText('Keeper only')).not.toBeInTheDocument()
  })

  it('names whose Investigator a Scene left empty for the Player', () => {
    render(
      <SceneHistoryScene
        campaignId="c1"
        scene={{ ...playerScene, reveals: [], rollRequests: [] }}
        investigatorName="Harvey Walters"
        requestedByDisplayName="Eleanor Hart"
      />,
    )

    expect(screen.getByText('Nothing from this Scene reached Harvey Walters.')).toBeInTheDocument()
  })

  it('shows no per-Scene sentence for a Player without an Approved Investigator', () => {
    render(
      <SceneHistoryScene
        campaignId="c1"
        scene={{ ...playerScene, reveals: [], rollRequests: [] }}
        investigatorName={null}
        requestedByDisplayName="Eleanor Hart"
      />,
    )

    expect(screen.queryByText(/Nothing from this Scene reached/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Nothing was revealed/)).not.toBeInTheDocument()
  })

  it('names an unnamed Investigator in the present list', () => {
    render(
      <SceneHistoryScene
        campaignId="c1"
        scene={{ ...keeperScene, investigatorsPresent: [{ id: 'i1', name: null }] }}
        investigatorName={null}
        requestedByDisplayName="Eleanor Hart"
      />,
    )

    expect(screen.getByText('Investigators present: Unnamed Investigator')).toBeInTheDocument()
  })
})
