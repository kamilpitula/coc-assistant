import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { routerState } from '@/shared/test-support/routerMock'

import { ActiveSceneNav } from './active-scene-nav'
import type { ActiveSceneSubTab } from '@/scene-play/services/activeSceneSubTab'

// specs/scene-play/ux.md section 21.1; SPL-UX-41, SPL-A11Y-15.
vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

const counts = { toReveal: 4, reference: 5, revealed: 2 }

function renderNav(current: ActiveSceneSubTab = 'run') {
  render(<ActiveSceneNav campaignId="c1" current={current} counts={counts} />)
}

describe('ActiveSceneNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.search = {}
  })

  it('labels the navigation "Active Scene" and links each sub-tab to its route', () => {
    renderNav()

    const nav = screen.getByRole('navigation', { name: 'Active Scene' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/campaigns/c1/active-scene',
      '/campaigns/c1/active-scene/to-reveal',
      '/campaigns/c1/active-scene/reference',
      '/campaigns/c1/active-scene/revealed',
    ])
  })

  it('names each counted link "{label}, {n}" (SPL-A11Y-15)', () => {
    renderNav()

    expect(screen.getByRole('link', { name: 'Run' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'To reveal, 4' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Keeper reference, 5' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revealed, 2' })).toBeInTheDocument()
  })

  it('marks only the current sub-tab (SPL-UX-41)', () => {
    renderNav('to-reveal')

    expect(screen.getByRole('link', { name: 'To reveal, 4' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Run' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Keeper reference, 5' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Revealed, 2' })).not.toHaveAttribute('aria-current')
  })

  it('renders the links without counts while the material is still loading', () => {
    render(<ActiveSceneNav campaignId="c1" current="run" counts={null} />)

    expect(screen.getByRole('link', { name: 'To reveal' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Keeper reference' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revealed' })).toBeInTheDocument()
  })
})
