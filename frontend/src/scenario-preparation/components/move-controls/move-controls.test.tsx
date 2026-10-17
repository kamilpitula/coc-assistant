import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MoveControls } from './move-controls'

// specs/scenario-preparation/ux.md sections 2.1 and 12; SP-UX-24, SP-A11Y-9.
function renderControls(overrides: Partial<Parameters<typeof MoveControls>[0]> = {}) {
  const onMove = vi.fn()
  render(
    <MoveControls
      itemId="a1"
      title="The Corbitt House"
      isFirst={false}
      isLast={false}
      saving={false}
      buttonIdPrefix="scene"
      onMove={onMove}
      {...overrides}
    />,
  )
  return onMove
}

describe('MoveControls', () => {
  it('offers both moves named after the item, with ids that carry the prefix', () => {
    renderControls()

    expect(screen.getByRole('button', { name: 'Move The Corbitt House up' })).toHaveAttribute('id', 'move-scene-up-a1')
    expect(screen.getByRole('button', { name: 'Move The Corbitt House down' })).toHaveAttribute('id', 'move-scene-down-a1')
  })

  it('has no Move up for the first row', () => {
    renderControls({ isFirst: true })

    expect(screen.queryByRole('button', { name: /up/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /down/ })).toBeInTheDocument()
  })

  it('has no Move down for the last row', () => {
    renderControls({ isLast: true })

    expect(screen.queryByRole('button', { name: /down/ })).not.toBeInTheDocument()
  })

  it('reports the used direction', async () => {
    const onMove = renderControls()

    await userEvent.click(screen.getByRole('button', { name: /down/ }))

    expect(onMove).toHaveBeenCalledWith('a1', 'down')
  })

  it('marks both buttons aria-disabled, not disabled, while saving', () => {
    renderControls({ saving: true })

    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAttribute('aria-disabled', 'true')
      expect(button).not.toBeDisabled()
    }
  })
})
