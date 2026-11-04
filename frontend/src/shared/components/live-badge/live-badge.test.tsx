import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LiveBadge } from './live-badge'

// specs/navigation/ux.md section 2; NAV-UX-3, NAV-A11Y-1, NAV-A11Y-5.

describe('LiveBadge', () => {
  it('shows the text "Live" with an aria-hidden dot, and no live region', () => {
    const { container } = render(<LiveBadge />)

    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(container.querySelector('[aria-live], [role="status"]')).toBeNull()
  })
})
