import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ScenarioNotFound } from './scenario-not-found'

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

// specs/scenario-preparation/ux.md section 5; SP-UX-9, SP-UX-10.
describe('ScenarioNotFound', () => {
  it('says the Scenario could not be found and links back to the Campaign', () => {
    render(<ScenarioNotFound campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scenario" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your Campaign' })).toHaveAttribute('href', '/campaigns/c1')
  })
})
