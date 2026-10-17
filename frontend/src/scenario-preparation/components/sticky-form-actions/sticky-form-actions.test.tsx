import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StickyFormActions } from './sticky-form-actions'

// specs/scenario-preparation/ux.md section 25.2; SP-A11Y-24.

describe('StickyFormActions', () => {
  it('holds its actions in a bar that sticks to the bottom with the page background and a top border', () => {
    render(
      <StickyFormActions>
        <button type="button">Save</button>
      </StickyFormActions>,
    )

    const bar = screen.getByRole('button', { name: 'Save' }).parentElement
    expect(bar).toHaveClass('sticky', 'bottom-0', 'bg-background', 'border-t')
  })
})
