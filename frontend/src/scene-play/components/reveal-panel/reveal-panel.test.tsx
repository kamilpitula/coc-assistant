import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActiveScene, KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'
import { keeperReveal, readAloudReveal } from '@/scene-play/test-support/revealFixtures'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { routerState } from '@/shared/test-support/routerMock'

import { RevealPanel } from './reveal-panel'

// specs/navigation/ux.md section 3 (refinements G2, G5, G8): the reveal panel reads the Reveal from the Keeper's Active
// Scene snapshot, shows its content from h3, and has no footer link.
const { mockUseActive } = vi.hoisted(() => ({ mockUseActive: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/hooks/useActiveScene', () => ({ useActiveScene: mockUseActive }))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const headingContent = {
  root: {
    type: 'root' as const,
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text('Inside')] },
      { type: 'paragraph', version: 1, children: [text('The door creaks open.')] },
    ],
  },
}
const headedReveal: KeeperReveal = { ...keeperReveal(readAloudReveal, 'h1', ['Harvey Walters']), content: headingContent }
const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 's1',
  scenarioId: 'p1',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [],
  reveals: [headedReveal],
}
const query = (data: ActiveScene | null | undefined) => ({ data, isError: false, isFetchedAfterMount: true, refetch: vi.fn() })

function show(revealId = 'story-read-aloud') {
  return render(
    <SidePanelScopeProvider>
      <RevealPanel campaignId="c1" revealId={revealId} />
    </SidePanelScopeProvider>,
  )
}

describe('RevealPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseActive.mockReturnValue(query(scene))
  })

  it('shows the kind line, the title, the meta line, and the content from h3, with no footer (NAV-UX-4)', () => {
    show()

    expect(screen.getByText('Revealed')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'The front door' })).toBeInTheDocument()
    expect(screen.getByText(/Read-aloud/)).toHaveTextContent('to Harvey Walters')
    expect(screen.getByRole('heading', { level: 3, name: 'Inside' })).toBeInTheDocument()
    expect(screen.getByText('The door creaks open.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open full page' })).not.toBeInTheDocument()
  })

  it('says the subject was not found for an unknown Reveal, with no footer (NAV-UX-9)', () => {
    show('unknown')

    expect(screen.getByRole('heading', { level: 2, name: 'Revealed' })).toBeInTheDocument()
    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open full page' })).not.toBeInTheDocument()
  })

  it('says the subject was not found for a Player, reading only the Active Scene (NAV-UX-9)', () => {
    mockUseActive.mockReturnValue(query({ kind: 'present-player', title: 'The Corbitt House', location: '', investigatorsPresent: [], reveals: [] }))
    show()

    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    expect(mockUseActive).toHaveBeenCalledWith('c1')
  })

  it('says the subject was not found when no Scene is Active (NAV-UX-9)', () => {
    mockUseActive.mockReturnValue(query(null))
    show()

    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
  })

  it('shows the kind label with a Skeleton while the Active Scene loads (G2)', () => {
    mockUseActive.mockReturnValue(query(undefined))
    show()

    expect(screen.getByRole('heading', { level: 2, name: 'Revealed' })).toBeInTheDocument()
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})
