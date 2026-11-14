import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { CampaignMember } from '@/campaign-play/types/CampaignMember'
import type { RollRequest } from '@/roll-requests/types/RollRequest'
import { keeperReveal, readAloudReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import type { KeeperSceneHistory, PlayerSceneHistory } from '@/scene-play/types/SceneHistory'

import { SceneHistoryPage } from './scene-history-page'

// specs/scene-play/ux.md section 23.11; SPL-UX-65, 68, 74; SPL-A11Y-23, 25.
vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/hooks/useReveals', () => ({ useRevealFile: vi.fn() }))

const { mockUseSceneHistory, mockUseCampaignMembers } = vi.hoisted(() => ({ mockUseSceneHistory: vi.fn(), mockUseCampaignMembers: vi.fn() }))
vi.mock('@/scene-play/hooks/useSceneHistory', () => ({ useSceneHistory: mockUseSceneHistory }))
vi.mock('@/campaign-play/hooks/useCampaignMembers', () => ({ useCampaignMembers: mockUseCampaignMembers }))

const keeper: CampaignMember = { memberId: 'k', displayName: 'Eleanor Hart', role: 'Keeper', isYou: false, investigator: null }

const publicRequest: RollRequest = {
  id: 'q1',
  target: { kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null },
  message: 'Something moves upstairs.',
  visibility: 'Public',
  difficulty: 'Regular',
  bonusDice: 0,
  penaltyDice: 0,
  createdAt: '2026-11-07T19:14:00Z',
  requestedRolls: [
    {
      investigatorId: 'i1',
      investigatorName: 'Harvey Walters',
      targetValue: 60,
      usesBaseValue: false,
      canEarnExperienceCheck: false,
      difficulty: 'Regular',
      bonusDice: 0,
      penaltyDice: 0,
      status: 'Waiting',
      rolls: [],
    },
  ],
}

const keeperHistory: KeeperSceneHistory = {
  kind: 'keeper',
  scenes: [
    {
      sceneId: 's2',
      scenarioId: 'p1',
      scenarioTitle: 'The Haunting',
      title: 'The Corbitt House',
      startedAt: '2026-11-07T19:05:00Z',
      finishedAt: null,
      investigatorsPresent: [{ id: 'i1', name: 'Harvey Walters' }],
      reveals: [keeperReveal(readAloudReveal, 'h1', ['Harvey Walters'])],
      rollRequests: [publicRequest],
    },
    {
      sceneId: 's1',
      scenarioId: 'p1',
      scenarioTitle: 'The Haunting',
      title: 'The Speakeasy',
      startedAt: '2026-10-31T19:10:00Z',
      finishedAt: '2026-10-31T21:00:00Z',
      investigatorsPresent: [],
      reveals: [],
      rollRequests: [],
    },
  ],
}

const playerHistory: PlayerSceneHistory = {
  kind: 'player',
  investigatorName: 'Harvey Walters',
  scenes: [
    {
      sceneId: 's2',
      scenarioTitle: 'The Haunting',
      title: 'The Corbitt House',
      startedAt: '2026-11-07T19:05:00Z',
      finishedAt: null,
      reveals: [textReveal],
      rollRequests: [publicRequest],
    },
  ],
}

const refetch = vi.fn()

function membersLoaded() {
  mockUseCampaignMembers.mockReturnValue({ data: [keeper], isPending: false, isError: false })
}

function membersPending() {
  mockUseCampaignMembers.mockReturnValue({ data: undefined, isPending: true, isError: false })
}

function loading() {
  mockUseSceneHistory.mockReturnValue({ data: undefined, isError: false, refetch })
}

function failed() {
  mockUseSceneHistory.mockReturnValue({ data: undefined, isError: true, refetch })
}

describe('SceneHistoryPage', () => {
  it('shows every Scene under one h1 with the Keeper description (SPL-UX-62, SPL-A11Y-23)', () => {
    mockUseSceneHistory.mockReturnValue({ data: keeperHistory, isError: false, refetch })
    membersLoaded()

    render(<SceneHistoryPage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Scene History' })).toBeInTheDocument()
    expect(screen.getByText('Every Scene played in this Campaign, newest first.')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['The Corbitt House', 'The Speakeasy'])
  })

  it('names the Keeper on every Roll Request card (SPL-UX-74)', () => {
    mockUseSceneHistory.mockReturnValue({ data: keeperHistory, isError: false, refetch })
    membersLoaded()

    render(<SceneHistoryPage campaignId="c1" />)

    expect(screen.getByRole('article', { name: 'Spot Hidden roll' })).toHaveTextContent('Eleanor Hart')
  })

  it('names whose Investigator the history reached and the Public rolls for the Player (SPL-UX-64)', () => {
    mockUseSceneHistory.mockReturnValue({ data: playerHistory, isError: false, refetch })
    membersLoaded()

    render(<SceneHistoryPage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Scene History' })).toBeInTheDocument()
    expect(
      screen.getByText('Every Scene played in this Campaign, what reached Harvey Walters, and the Public rolls, newest first.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'A letter from Knott' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Spot Hidden roll' })).toBeInTheDocument()
  })

  it('tells a Player without an Approved Investigator that no Reveals are shown, with the Public rolls listed (SPL-UX-65, SPL-UX-74)', () => {
    mockUseSceneHistory.mockReturnValue({
      data: { ...playerHistory, investigatorName: null, scenes: playerHistory.scenes.map((scene) => ({ ...scene, reveals: [] })) },
      isError: false,
      refetch,
    })
    membersLoaded()

    render(<SceneHistoryPage campaignId="c1" />)

    expect(screen.getByText('Every Scene played in this Campaign, newest first.')).toBeInTheDocument()
    expect(screen.getByText("You don't have an Approved Investigator in this Campaign yet, so no Reveals are shown.")).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Spot Hidden roll' })).toBeInTheDocument()
  })

  it('says no Scene has been played yet when the Campaign has none', () => {
    mockUseSceneHistory.mockReturnValue({ data: { ...keeperHistory, scenes: [] }, isError: false, refetch })
    membersLoaded()

    render(<SceneHistoryPage campaignId="c1" />)

    expect(screen.getByText('No Scene has been played yet.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('keeps an open Reveal open when a refetch adds a Scene on top (SPL-UX-68)', async () => {
    mockUseSceneHistory.mockReturnValue({ data: playerHistory, isError: false, refetch })
    membersLoaded()
    const { rerender } = render(<SceneHistoryPage campaignId="c1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Show A letter from Knott' }))
    expect(screen.getByText('Come at once.')).toBeInTheDocument()

    mockUseSceneHistory.mockReturnValue({
      data: {
        ...playerHistory,
        scenes: [
          {
            sceneId: 's3',
            scenarioTitle: 'The Dunwich Horror',
            title: 'The Strange High House',
            startedAt: '2026-11-07T20:00:00Z',
            finishedAt: null,
            reveals: [],
            rollRequests: [],
          },
          ...playerHistory.scenes,
        ],
      },
      isError: false,
      refetch,
    })
    rerender(<SceneHistoryPage campaignId="c1" />)

    expect(screen.getByText('Come at once.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'The Strange High House' })).toBeInTheDocument()
  })

  it('shows a Skeleton with aria-busy while loading', () => {
    loading()
    membersLoaded()

    const { container } = render(<SceneHistoryPage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Scene History' })).toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })

  it('shows a Skeleton with aria-busy while the Campaign members are pending', () => {
    mockUseSceneHistory.mockReturnValue({ data: keeperHistory, isError: false, refetch })
    membersPending()

    const { container } = render(<SceneHistoryPage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Scene History' })).toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('announces the load failure as an alert and retries on "Try again" (SPL-UX-69, SPL-A11Y-25)', async () => {
    failed()

    render(<SceneHistoryPage campaignId="c1" />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load the Scene History.")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })
})
