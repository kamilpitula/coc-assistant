import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'

import { useSidePanelScope } from './side-panel-scope-context'
import { SidePanelScopeProvider } from './side-panel-scope'
import { SidePanel } from './side-panel'
import { SidePanelContent } from './side-panel-content'

// specs/navigation/ux.md sections 3 and 9 (NAV-A11Y-2): the panel is a modal dialog labelled by its h2, focus moves into
// it on open and returns to the trigger (or the page h1) on close, and every close control shuts it.
function Harness({ withTrigger = true }: { withTrigger?: boolean }) {
  const [open, setOpen] = useState(true)
  const { triggerRef } = useSidePanelScope()
  const fallbackRef = useRef<HTMLHeadingElement>(null)

  return (
    <>
      <h1 ref={fallbackRef} tabIndex={-1}>
        The Corbitt House
      </h1>
      {withTrigger && (
        <button
          type="button"
          onClick={(event) => {
            triggerRef.current = event.currentTarget
            setOpen(true)
          }}
        >
          Open
        </button>
      )}
      <SidePanel open={open} onClose={() => setOpen(false)} fallbackRef={fallbackRef}>
        <SidePanelContent kindLabel="Clues" title="Lucy Ward's Clues" state="ready">
          <p>Panel body</p>
        </SidePanelContent>
      </SidePanel>
    </>
  )
}

function show(withTrigger = true) {
  render(
    <SidePanelScopeProvider>
      <Harness withTrigger={withTrigger} />
    </SidePanelScopeProvider>,
  )
}

describe('SidePanel', () => {
  it('is a modal dialog labelled by its h2', () => {
    show()

    expect(screen.getByRole('dialog', { name: "Lucy Ward's Clues" })).toBeInTheDocument()
  })

  it('moves focus to the h2 on open', async () => {
    show()

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: "Lucy Ward's Clues" })).toHaveFocus())
  })

  it('closes through the Close button', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    show()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on a click outside the panel', async () => {
    show()

    // The modal disables pointer events on the page, so the outside pointer-down bypasses user-event's check. Radix
    // dismisses on the click that follows it.
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toHaveFocus())
    fireEvent.pointerDown(document.body)
    fireEvent.click(document.body)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('returns focus to the trigger on close', async () => {
    show()

    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toHaveFocus())
    // The modal hides the page from assistive tech, so the trigger is found with hidden: true. Opening through the
    // button records it as the trigger, as the entry points do.
    const trigger = screen.getByRole('button', { name: 'Open', hidden: true })
    fireEvent.click(trigger)
    await userEvent.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })

  it('returns focus to the page h1 when the trigger is gone', async () => {
    show(false)

    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toHaveFocus())
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toHaveFocus()
  })
})
