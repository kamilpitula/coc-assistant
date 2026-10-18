import { render, renderHook, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useFocusOnce, useFocusTarget } from './useProfileFormFocus'

// specs/scenario-preparation/ux.md sections 25.2 and 25.5; SP-UX-33, SP-A11Y-20, SP-A11Y-22.

describe('useFocusTarget', () => {
  it('focuses the control a change names and then clears the target', () => {
    render(<input aria-label="Target" id="target" />)
    const clear = vi.fn()

    renderHook(() => useFocusTarget('target', clear))

    expect(screen.getByLabelText('Target')).toHaveFocus()
    expect(clear).toHaveBeenCalledTimes(1)
  })

  it('does nothing while there is no target', () => {
    const clear = vi.fn()

    renderHook(() => useFocusTarget(null, clear))

    expect(clear).not.toHaveBeenCalled()
  })
})

describe('useFocusOnce', () => {
  it('focuses the error summary when problems arrive and not before', () => {
    render(<div tabIndex={-1} data-testid="summary" />)
    const ref = createRef<HTMLDivElement>()
    ;(ref as { current: HTMLDivElement | null }).current = screen.getByTestId('summary') as HTMLDivElement

    const { rerender } = renderHook(({ problems }) => useFocusOnce(ref, problems), { initialProps: { problems: [] as string[] } })
    expect(screen.getByTestId('summary')).not.toHaveFocus()

    rerender({ problems: ['Enter a name.'] })
    expect(screen.getByTestId('summary')).toHaveFocus()
  })
})
