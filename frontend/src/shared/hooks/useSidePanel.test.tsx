import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, type MouseEvent } from 'vitest'

import { useSidePanel } from './useSidePanel'
import { sidePanelSearchSchema } from '@/shared/components/side-panel/sidePanelParams'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'

// PBI-NAV-002 design record D1 and D2, against a real memory router: the hook reads the panel from the URL,
// opening pushes with the marker (replacing while open), and closing goes back with the marker or replaces without it.
function PanelHarness() {
  const { panel, open, close } = useSidePanel()

  return (
    <div>
      <p data-testid="panel">{panel === null ? 'none' : JSON.stringify(panel)}</p>
      <button type="button" onClick={(event: MouseEvent<HTMLButtonElement>) => open({ type: 'clues', investigatorId: 'inv-1' }, event.currentTarget)}>
        Open clues
      </button>
      <button type="button" onClick={(event: MouseEvent<HTMLButtonElement>) => open({ type: 'handout', handoutId: 'h-1' }, event.currentTarget)}>
        Open handout
      </button>
      <button type="button" onClick={() => close()}>
        Close
      </button>
    </div>
  )
}

function show(initialEntries: string[]) {
  const rootRoute = createRootRoute({
    component: () => (
      <SidePanelScopeProvider>
        <Outlet />
      </SidePanelScopeProvider>
    ),
  })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    validateSearch: sidePanelSearchSchema,
    component: PanelHarness,
  })
  const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute]), history: createMemoryHistory({ initialEntries }) })
  render(<RouterProvider router={router} />)
  return { router }
}

describe('useSidePanel', () => {
  it('reads no panel from an empty search', async () => {
    show(['/'])

    await waitFor(() => expect(screen.getByTestId('panel')).toHaveTextContent('none'))
  })

  it('opens the panel from the URL on load', async () => {
    show(['/?panel=clues&investigator=inv-1'])

    await waitFor(() => expect(screen.getByTestId('panel')).toHaveTextContent(JSON.stringify({ type: 'clues', investigatorId: 'inv-1' })))
  })

  it('ignores unknown panel params on load', async () => {
    show(['/?panel=unknown'])

    await waitFor(() => expect(screen.getByTestId('panel')).toHaveTextContent('none'))
  })

  it('opens with a push that carries the marker, then a second open replaces', async () => {
    const { router } = show(['/'])
    await waitFor(() => expect(screen.getByTestId('panel')).toHaveTextContent('none'))

    await userEvent.click(screen.getByRole('button', { name: 'Open clues' }))
    await waitFor(() => expect(screen.getByTestId('panel')).toHaveTextContent(JSON.stringify({ type: 'clues', investigatorId: 'inv-1' })))
    expect(router.state.location.state.sidePanelOpenedHere).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Open handout' }))
    await waitFor(() => expect(screen.getByTestId('panel')).toHaveTextContent(JSON.stringify({ type: 'handout', handoutId: 'h-1' })))

    router.history.back()
    await waitFor(() => expect(screen.getByTestId('panel')).toHaveTextContent('none'))
  })

  it('closes with browser back when the marker is present', async () => {
    const { router } = show(['/'])
    await waitFor(() => expect(screen.getByTestId('panel')).toHaveTextContent('none'))

    await userEvent.click(screen.getByRole('button', { name: 'Open clues' }))
    await waitFor(() => expect(screen.getByTestId('panel')).not.toHaveTextContent('none'))

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.getByTestId('panel')).toHaveTextContent('none'))
    expect(router.state.location.search).toEqual({})
  })

  it('closes with a replace that strips the panel params when the marker is absent', async () => {
    const { router } = show(['/?panel=clues&investigator=inv-1'])
    await waitFor(() => expect(screen.getByTestId('panel')).not.toHaveTextContent('none'))

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.getByTestId('panel')).toHaveTextContent('none'))
    expect(router.state.location.search).toEqual({})
  })
})
