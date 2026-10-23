import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ItemNotFound } from './item-not-found'

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

// specs/scenario-preparation/ux.md section 63.1; SP-UX-102.
describe('ItemNotFound', () => {
  it('says the Item could not be found and links back to the Campaign', () => {
    render(<ItemNotFound campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Item" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your Campaign' })).toHaveAttribute('href', '/campaigns/c1')
  })
})
