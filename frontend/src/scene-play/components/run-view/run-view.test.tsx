import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'

import { RunView } from './run-view'

// specs/scene-play/ux.md sections 21.3 and 21.10; SPL-UX-40, SPL-UX-50; specs/roll-requests/ux.md section 2, RR-UX-1.
const { notesProps, presentProps, wallProps, formProps, waitingProps, mockUseScene, mockUseCampaign } = vi.hoisted(() => ({
  notesProps: { current: null as null | Record<string, unknown> },
  presentProps: { current: null as null | Record<string, unknown> },
  wallProps: { current: null as null | Record<string, unknown> },
  formProps: { current: null as null | Record<string, unknown> },
  waitingProps: { current: null as null | Record<string, unknown> },
  mockUseScene: vi.fn(),
  mockUseCampaign: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scene-play/components/keeper-notes-section/keeper-notes-section', () => ({
  KeeperNotesSection: (props: Record<string, unknown>) => {
    notesProps.current = props
    return (
      <section aria-labelledby="notes-stub-heading">
        <h2 id="notes-stub-heading">Keeper notes</h2>
      </section>
    )
  },
}))
vi.mock('@/scene-play/components/investigators-present-section/investigators-present-section', () => ({
  InvestigatorsPresentSection: (props: Record<string, unknown>) => {
    presentProps.current = props
    return (
      <section aria-labelledby="present-stub-heading">
        <h2 id="present-stub-heading">Investigators present</h2>
      </section>
    )
  },
}))
vi.mock('@/roll-requests/components/roll-request-form/roll-request-form', () => ({
  RollRequestForm: (props: Record<string, unknown>) => {
    formProps.current = props
    return (
      <section aria-labelledby="form-stub-heading">
        <h2 id="form-stub-heading">Request a roll</h2>
      </section>
    )
  },
}))
vi.mock('@/roll-requests/components/waiting-rolls/waiting-rolls', () => ({
  WaitingRolls: (props: Record<string, unknown>) => {
    waitingProps.current = props
    return (
      <section aria-labelledby="waiting-stub-heading">
        <h2 id="waiting-stub-heading">Waiting rolls</h2>
      </section>
    )
  },
}))
vi.mock('@/scene-play/components/active-scene-wall/active-scene-wall', () => ({
  ActiveSceneWall: (props: Record<string, unknown>) => {
    wallProps.current = props
    return (
      <section aria-labelledby="wall-stub-heading">
        <h2 id="wall-stub-heading">Wall</h2>
      </section>
    )
  },
}))

const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 's1',
  scenarioId: 'p1',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: '2026-10-28T19:40:00Z',
  investigatorsPresent: [{ id: 'i1', name: 'Harvey Walters' }],
  reveals: [],
}

describe('RunView', () => {
  beforeEach(() => {
    mockUseScene.mockReturnValue({ data: { keeperNotes: null }, isError: false })
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
  })

  it('shows Keeper notes before Investigators present, and no material (SPL-UX-40)', () => {
    render(<RunView campaignId="c1" scene={scene} onPresentSaved={vi.fn()} onWallEntryAdded={vi.fn()} onFinishedMeanwhile={vi.fn()} onRollRequested={vi.fn()} />)

    const notes = screen.getByRole('region', { name: 'Keeper notes' })
    const present = screen.getByRole('region', { name: 'Investigators present' })
    expect(notes.compareDocumentPosition(present) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Handouts' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Non-Player Entities' })).not.toBeInTheDocument()
  })

  it('shows the Wall after Investigators present in the DOM (SPL-UX-50)', () => {
    render(<RunView campaignId="c1" scene={scene} onPresentSaved={vi.fn()} onWallEntryAdded={vi.fn()} onFinishedMeanwhile={vi.fn()} onRollRequested={vi.fn()} />)

    const present = screen.getByRole('region', { name: 'Investigators present' })
    const wall = screen.getByRole('region', { name: 'Wall' })
    expect(present.compareDocumentPosition(wall) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows Request a roll and Waiting rolls between Keeper notes and Investigators present (RR-UX-1)', () => {
    const onFinishedMeanwhile = vi.fn()
    const onRollRequested = vi.fn()
    render(<RunView campaignId="c1" scene={scene} onPresentSaved={vi.fn()} onWallEntryAdded={vi.fn()} onFinishedMeanwhile={onFinishedMeanwhile} onRollRequested={onRollRequested} />)

    const order = ['Keeper notes', 'Request a roll', 'Waiting rolls', 'Investigators present', 'Wall'].map((name) =>
      screen.getByRole('region', { name }),
    )
    for (let index = 0; index < order.length - 1; index += 1) {
      expect(order[index].compareDocumentPosition(order[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    expect(formProps.current).toMatchObject({
      campaignId: 'c1',
      investigators: scene.investigatorsPresent,
      onRequested: onRollRequested,
      onNoActiveScene: onFinishedMeanwhile,
    })
    expect(waitingProps.current).toMatchObject({ campaignId: 'c1' })
  })

  it('passes the Scene to both regions and the Wall its add callback (SPL-UX-40)', () => {
    const onPresentSaved = vi.fn()
    const onWallEntryAdded = vi.fn()
    const onFinishedMeanwhile = vi.fn()
    render(<RunView campaignId="c1" scene={scene} onPresentSaved={onPresentSaved} onWallEntryAdded={onWallEntryAdded} onFinishedMeanwhile={onFinishedMeanwhile} onRollRequested={vi.fn()} />)

    expect(notesProps.current).toMatchObject({ notes: null })
    expect(presentProps.current).toMatchObject({ campaignId: 'c1', scene, onSaved: onPresentSaved, onFinishedMeanwhile })
    expect(wallProps.current).toMatchObject({ campaignId: 'c1', viewerRole: 'Keeper', onWallEntryAdded })
  })
})
