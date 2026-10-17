import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SceneStatusBadge } from './scene-status-badge'

// specs/scenario-preparation/ux.md section 12; SP-UX-21, SP-A11Y-11.
describe('SceneStatusBadge', () => {
  it.each(['Prepared', 'Active', 'Finished'] as const)('shows %s as text with a hidden icon', (status) => {
    const { container } = render(<SceneStatusBadge status={status} />)

    expect(screen.getByText(status)).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
