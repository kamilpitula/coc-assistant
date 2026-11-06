import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MaterialLoadState } from './material-load-state'

// specs/scene-play/ux.md section 21.10: the shared loading and failure branches of the sub-tab bodies.
describe('MaterialLoadState', () => {
  it('shows the failure message with a retry that calls onRetry', async () => {
    const onRetry = vi.fn()
    render(<MaterialLoadState isError onRetry={onRetry} />)

    expect(screen.getByText("We couldn't load this Scene's material.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it('shows the loading skeletons when there is no error', () => {
    render(<MaterialLoadState isError={false} onRetry={vi.fn()} />)

    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
})
