import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'

import { RunView } from './run-view'

// specs/scene-play/ux.md sections 21.3 and 21.10; SPL-UX-40, SPL-UX-50.
const { notesProps, presentProps, mockUseScene } = vi.hoisted(() => ({
  notesProps: { current: null as null | Record<string, unknown> },
  presentProps: { current: null as null | Record<string, unknown> },
  mockUseScene: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))
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
  })

  it('shows Keeper notes before Investigators present, and no material (SPL-UX-40)', () => {
    render(<RunView campaignId="c1" scene={scene} onPresentSaved={vi.fn()} onFinishedMeanwhile={vi.fn()} />)

    const notes = screen.getByRole('region', { name: 'Keeper notes' })
    const present = screen.getByRole('region', { name: 'Investigators present' })
    expect(notes.compareDocumentPosition(present) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Handouts' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Non-Player Entities' })).not.toBeInTheDocument()
  })

  it('passes the Scene to both regions', () => {
    const onPresentSaved = vi.fn()
    const onFinishedMeanwhile = vi.fn()
    render(<RunView campaignId="c1" scene={scene} onPresentSaved={onPresentSaved} onFinishedMeanwhile={onFinishedMeanwhile} />)

    expect(notesProps.current).toMatchObject({ notes: null })
    expect(presentProps.current).toMatchObject({ campaignId: 'c1', scene, onSaved: onPresentSaved, onFinishedMeanwhile })
  })
})
