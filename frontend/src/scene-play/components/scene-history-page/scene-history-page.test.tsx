import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { keeperReveal, readAloudReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import type { KeeperSceneHistory, PlayerSceneHistory } from '@/scene-play/types/SceneHistory'

import { SceneHistoryPage } from './scene-history-page'

// specs/scene-play/ux.md section 23.2; SPL-UX-65, 68, 69; SPL-A11Y-23, 25.
vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/hooks/useReveals', () => ({ useRevealFile: vi.fn() }))

const { mockUseSceneHistory } = vi.hoisted(() => ({ mockUseSceneHistory: vi.fn() }))
vi.mock('@/scene-play/hooks/useSceneHistory', () => ({ useSceneHistory: mockUseSceneHistory }))

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
    },
  ],
}

const refetch = vi.fn()

function loading() {
  mockUseSceneHistory.mockReturnValue({ data: undefined, isError: false, refetch })
}

function failed() {
  mockUseSceneHistory.mockReturnValue({ data: undefined, isError: true, refetch })
}

describe('SceneHistoryPage', () => {
  it('shows every Scene under one h1 with the Keeper description (SPL-UX-62, SPL-A11Y-23)', () => {
    mockUseSceneHistory.mockReturnValue({ data: keeperHistory, isError: false, refetch })

    render(<SceneHistoryPage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Scene History' })).toBeInTheDocument()
    expect(screen.getByText('Every Scene played in this Campaign, newest first.')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['The Corbitt House', 'The Speakeasy'])
  })

  it('names whose Investigator the history reached for the Player', () => {
    mockUseSceneHistory.mockReturnValue({ data: playerHistory, isError: false, refetch })

    render(<SceneHistoryPage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Scene History' })).toBeInTheDocument()
    expect(screen.getByText('Every Scene played in this Campaign and what reached Harvey Walters, newest first.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'A letter from Knott' })).toBeInTheDocument()
  })

  it('tells a Player without an Approved Investigator that no Reveals are shown (SPL-UX-65)', () => {
    mockUseSceneHistory.mockReturnValue({
      data: { ...playerHistory, investigatorName: null, scenes: playerHistory.scenes.map((scene) => ({ ...scene, reveals: [] })) },
      isError: false,
      refetch,
    })

    render(<SceneHistoryPage campaignId="c1" />)

    expect(screen.getByText('Every Scene played in this Campaign, newest first.')).toBeInTheDocument()
    expect(screen.getByText("You don't have an Approved Investigator in this Campaign yet, so no Reveals are shown.")).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })

  it('says no Scene has been played yet when the Campaign has none', () => {
    mockUseSceneHistory.mockReturnValue({ data: { ...keeperHistory, scenes: [] }, isError: false, refetch })

    render(<SceneHistoryPage campaignId="c1" />)

    expect(screen.getByText('No Scene has been played yet.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('keeps an open Reveal open when a refetch adds a Scene on top (SPL-UX-68)', async () => {
    mockUseSceneHistory.mockReturnValue({ data: playerHistory, isError: false, refetch })
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

    const { container } = render(<SceneHistoryPage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Scene History' })).toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })

  it('announces the load failure as an alert and retries on "Try again" (SPL-UX-69, SPL-A11Y-25)', async () => {
    failed()

    render(<SceneHistoryPage campaignId="c1" />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load the Scene History.")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })
})
