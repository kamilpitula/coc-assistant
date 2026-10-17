import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SceneNotFound } from './scene-not-found'

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

// specs/scenario-preparation/ux.md section 14; SP-UX-26.
describe('SceneNotFound', () => {
  it('says the Scene could not be found and links back to the Campaign', () => {
    render(<SceneNotFound campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your Campaign' })).toHaveAttribute('href', '/campaigns/c1')
  })
})
