import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SidePanelScopeProvider } from './side-panel-scope'
import { SidePanelContent } from './side-panel-content'

// specs/navigation/ux.md section 3: the panel header (kind line, h2, close is in the shell), the loading, error, and
// not-found states, and the ready footer link with its action slot.
function show(props: Partial<React.ComponentProps<typeof SidePanelContent>> = {}) {
  const onRetry = vi.fn()
  const view = render(
    <SidePanelScopeProvider>
      <SidePanelContent kindLabel="Clues" title="Lucy Ward's Clues" state="ready" onRetry={onRetry} {...props}>
        <p>Panel body</p>
      </SidePanelContent>
    </SidePanelScopeProvider>,
  )
  return { onRetry, ...view }
}

describe('SidePanelContent', () => {
  it('shows the kind line and the subject title as its h2 when ready', () => {
    show()

    expect(screen.getByText('Clues')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: "Lucy Ward's Clues" })).toBeInTheDocument()
    expect(screen.getByText('Panel body')).toBeInTheDocument()
  })

  it('shows the kind label as the h2 until the subject title is known', () => {
    show({ title: null, state: 'loading' })

    expect(screen.getByRole('heading', { level: 2, name: 'Clues' })).toBeInTheDocument()
  })

  it('shows a busy Skeleton while loading', () => {
    const { container } = show({ title: null, state: 'loading' })

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.queryByText('Panel body')).not.toBeInTheDocument()
  })

  it('shows the failure copy with Try again, and retries', async () => {
    const { onRetry } = show({ state: 'error' })

    expect(screen.getByText("We couldn't load this.")).toBeInTheDocument()
    expect(screen.queryByText('Panel body')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('shows the not-found copy with no footer link', () => {
    show({ state: 'not-found', footer: <a href="/full">Open full page</a> })

    expect(screen.getByRole('heading', { level: 2, name: 'Clues' })).toHaveTextContent('Clues')
    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open full page' })).not.toBeInTheDocument()
  })

  it('shows the footer link and the action slot only when ready', () => {
    const { rerender } = show({ footer: <a href="/full">Open full page</a>, action: <button type="button">Reveal...</button> })

    expect(screen.getByRole('link', { name: 'Open full page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reveal...' })).toBeInTheDocument()

    rerender(
      <SidePanelScopeProvider>
        <SidePanelContent kindLabel="Clues" title={null} state="loading" footer={<a href="/full">Open full page</a>} />
      </SidePanelScopeProvider>,
    )
    expect(screen.queryByRole('link', { name: 'Open full page' })).not.toBeInTheDocument()
  })
})
