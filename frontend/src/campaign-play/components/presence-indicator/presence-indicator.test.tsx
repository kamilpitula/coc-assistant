import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PresenceIndicator } from './presence-indicator'

// specs/campaign-play/ux.md section 3; PR-A11Y-2 (state as text), PR-A11Y-8 (no motion).
describe('PresenceIndicator', () => {
  it.each([
    ['Connected', 'Connected'],
    ['NotConnected', 'Not connected'],
    ['Unknown', 'Unknown'],
  ] as const)('shows %s as the text "%s"', (presence, text) => {
    render(<PresenceIndicator presence={presence} />)

    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('keeps the icon decorative so the text alone conveys the state', () => {
    const { container } = render(<PresenceIndicator presence="Connected" />)

    const icon = container.querySelector('svg')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('uses the success colour for the Connected icon and a dashed ring for Unknown', () => {
    const connected = render(<PresenceIndicator presence="Connected" />)
    expect(connected.container.querySelector('svg')).toHaveClass('text-success', 'fill-current')
    connected.unmount()

    const unknown = render(<PresenceIndicator presence="Unknown" />)
    expect(unknown.container.querySelector('svg')).toHaveClass('lucide-circle-dashed')
  })

  it('does not animate state changes', () => {
    const { container } = render(<PresenceIndicator presence="Connected" />)

    expect(container.innerHTML).not.toMatch(/animate-/)
  })
})
