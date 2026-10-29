import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NoActiveScene } from './no-active-scene'

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

// specs/scene-play/ux.md section 4.3.
describe('NoActiveScene', () => {
  it('tells a Player that no Scene is being played, with the way back', () => {
    render(<NoActiveScene campaignId="c1" isKeeper={false} />)

    expect(screen.getByRole('heading', { level: 1, name: 'No Active Scene' })).toBeInTheDocument()
    expect(screen.getByText('No Scene is being played right now.')).toBeInTheDocument()
    expect(screen.queryByText('Start a Scene from its page in a Scenario.')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your Campaign' })).toHaveAttribute('href', '/campaigns/c1')
  })

  it('tells the Keeper where a Scene is started', () => {
    render(<NoActiveScene campaignId="c1" isKeeper />)

    expect(screen.getByText('Start a Scene from its page in a Scenario.')).toBeInTheDocument()
  })

  it('has a focusable heading, so focus can go there after a finish', () => {
    render(<NoActiveScene campaignId="c1" isKeeper />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('tabindex', '-1')
  })
})
