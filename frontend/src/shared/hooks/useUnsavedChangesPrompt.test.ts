import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useUnsavedChangesPrompt } from './useUnsavedChangesPrompt'

function leavePage(): Event {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

/** specs/character-sheet/ux.md section 5.1: the browser's native prompt appears when leaving with unsaved edits. */
describe('useUnsavedChangesPrompt', () => {
  it('asks the browser to confirm leaving while there are unsaved edits', () => {
    renderHook(() => useUnsavedChangesPrompt(true))

    expect(leavePage().defaultPrevented).toBe(true)
  })

  it('lets the Player leave freely without unsaved edits, and stops asking once unmounted', () => {
    const { rerender, unmount } = renderHook(({ dirty }) => useUnsavedChangesPrompt(dirty), { initialProps: { dirty: false } })
    expect(leavePage().defaultPrevented).toBe(false)

    rerender({ dirty: true })
    unmount()
    expect(leavePage().defaultPrevented).toBe(false)
  })
})
