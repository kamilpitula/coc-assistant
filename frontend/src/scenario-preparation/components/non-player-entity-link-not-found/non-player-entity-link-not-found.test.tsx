import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NonPlayerEntityLinkNotFound } from './non-player-entity-link-not-found'

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

// specs/scenario-preparation/ux.md section 33; SP-UX-60.
describe('NonPlayerEntityLinkNotFound', () => {
  it('says the link could not be found and links back to the Scene', () => {
    render(<NonPlayerEntityLinkNotFound campaignId="c1" scenarioId="s1" sceneId="a1" />)

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that link" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the Scene' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1')
  })
})
