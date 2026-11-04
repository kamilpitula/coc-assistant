import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BackLink } from './back-link'

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

function show(from: unknown) {
  render(
    <BackLink
      from={from}
      fallback={{ label: 'Lucy Ward', to: '/campaigns/$campaignId/investigators/$investigatorId', params: { campaignId: 'c1', investigatorId: 'i1' } }}
      originTargets={{ 'active-scene': { label: 'The Corbitt House', to: '/campaigns/$campaignId/active-scene', params: { campaignId: 'c1' } } }}
      render={(target) => <a href={target.to}>Back to {target.label}</a>}
    />,
  )
}

describe('BackLink', () => {
  it('renders the origin target for an allow-listed from', () => {
    show('active-scene')

    expect(screen.getByRole('link', { name: 'Back to The Corbitt House' })).toHaveAttribute('href', '/campaigns/$campaignId/active-scene')
  })

  it('renders the structural fallback for a missing or unknown from', () => {
    show(undefined)
    expect(screen.getByRole('link', { name: 'Back to Lucy Ward' })).toBeInTheDocument()

    show('wall')
    expect(screen.getAllByRole('link', { name: 'Back to Lucy Ward' })).toHaveLength(2)
  })
})
