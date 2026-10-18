import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NonPlayerEntityNotFound } from './non-player-entity-not-found'

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

// specs/scenario-preparation/ux.md section 25.6; SP-UX-39.
describe('NonPlayerEntityNotFound', () => {
  it('says the Non-Player Entity could not be found and links back to the Campaign', () => {
    render(<NonPlayerEntityNotFound campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Non-Player Entity" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your Campaign' })).toHaveAttribute('href', '/campaigns/c1')
  })
})
