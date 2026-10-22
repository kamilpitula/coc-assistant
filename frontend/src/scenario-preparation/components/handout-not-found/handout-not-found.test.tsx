import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HandoutNotFound } from './handout-not-found'

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

// specs/scenario-preparation/ux.md section 42; SP-UX-74.
describe('HandoutNotFound', () => {
  it('says the Handout could not be found and links back to the Scene', () => {
    render(<HandoutNotFound campaignId="c1" scenarioId="s1" sceneId="a1" />)

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Handout" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the Scene' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1')
  })
})
