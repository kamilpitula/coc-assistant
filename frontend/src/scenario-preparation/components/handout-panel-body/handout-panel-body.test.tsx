import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Handout } from '@/scenario-preparation/types/Handout'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { routerState } from '@/shared/test-support/routerMock'

import { HandoutPanelBody } from './handout-panel-body'

// specs/navigation/ux.md section 3 (PBI-SPL-005 design record D1): the scene-scoped handout body loads its Handout
// through the same query as the Handout page, shows its badges and current content, and carries `from` to the full
// page only when the host passes one.
const { mockUseHandout, refetch } = vi.hoisted(() => ({
  mockUseHandout: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scenario-preparation/hooks/useHandouts', () => ({ useHandout: mockUseHandout, useHandoutFile: vi.fn() }))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const content = {
  root: {
    type: 'root' as const,
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text('Inside')] },
      { type: 'paragraph', version: 1, children: [text('The door creaks open.')] },
    ],
  },
}
const handout: Handout = { id: 'h1', kind: 'Text', visibility: 'PlayerFacing', title: 'A letter from Knott', content }
const owner = { type: 'scene', campaignId: 'c1', scenarioId: 'p1', sceneId: 's1' } as const
const handoutQuery = (data: Handout | null | undefined, overrides: Record<string, unknown> = {}) => ({ data, isError: false, refetch, ...overrides })

function show(handoutId = 'h1', from?: 'active-scene') {
  return render(
    <SidePanelScopeProvider>
      <HandoutPanelBody owner={owner} handoutId={handoutId} from={from} />
    </SidePanelScopeProvider>,
  )
}

describe('HandoutPanelBody', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseHandout.mockReturnValue(handoutQuery(handout))
  })

  it('shows the kind line, the title, the badges, and the content from h3, with the full-page link (NAV-UX-4, NAV-UX-7)', () => {
    show()

    expect(screen.getByText('Handout')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'A letter from Knott' })).toBeInTheDocument()
    expect(screen.getByText('Text')).toBeInTheDocument()
    expect(screen.getByText('Player-facing')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Inside' })).toBeInTheDocument()
    expect(screen.getByText('The door creaks open.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/scenarios/p1/scenes/s1/handouts/h1')
  })

  it('loads the Handout of the given Scene owner', () => {
    show()

    expect(mockUseHandout).toHaveBeenCalledWith(owner, 'h1', true)
  })

  it('carries `from` to the full-page link only when the host passes one', () => {
    show('h1', 'active-scene')

    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/scenarios/p1/scenes/s1/handouts/h1?from=active-scene')
  })

  it('says the subject was not found for an unknown Handout, with no footer (NAV-UX-9)', () => {
    mockUseHandout.mockReturnValue(handoutQuery(null))
    show('unknown')

    expect(screen.getByRole('heading', { level: 2, name: 'Handout' })).toBeInTheDocument()
    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open full page' })).not.toBeInTheDocument()
  })

  it('shows the kind label, a Skeleton while loading, and retries on a failure', async () => {
    mockUseHandout.mockReturnValue(handoutQuery(undefined))
    const { rerender } = show()
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()

    mockUseHandout.mockReturnValue(handoutQuery(undefined, { isError: true }))
    rerender(
      <SidePanelScopeProvider>
        <HandoutPanelBody owner={owner} handoutId="h1" />
      </SidePanelScopeProvider>,
    )
    expect(screen.getByText("We couldn't load this.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })
})
