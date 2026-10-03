import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { InvestigatorNotFound } from './investigator-not-found'

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

/** specs/character-sheet/ux.md section 1; UX-18. */
describe('InvestigatorNotFound', () => {
  it('says the Investigator could not be found and links back to the Campaign', () => {
    render(<InvestigatorNotFound campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Investigator" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your Campaign' })).toHaveAttribute('href', '/campaigns/c1')
  })
})
