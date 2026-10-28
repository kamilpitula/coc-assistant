import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ActiveScenePlayerView } from './active-scene-player-view'

// specs/scene-play/ux.md section 4; SPL-UX-12, SPL-UX-13, SPL-A11Y-1, SPL-A11Y-4.
describe('ActiveScenePlayerView', () => {
  it('shows a present Player the title, location, who is present with their own marked, and the empty Reveals sentence', () => {
    render(
      <ActiveScenePlayerView
        scene={{
          kind: 'present-player',
          title: 'The Corbitt House',
          location: 'Arkham, Boston Road',
          investigatorsPresent: [{ name: 'Harvey Walters', isYours: true }, { name: 'Lucy Ward', isYours: false }],
        }}
      />,
    )

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeInTheDocument()
    expect(screen.getByText('Location').nextElementSibling).toHaveTextContent('Arkham, Boston Road')
    expect(screen.getByRole('region', { name: 'Investigators present' })).toBeInTheDocument()
    expect(screen.getByText('Harvey Walters (your Investigator)')).toBeInTheDocument()
    expect(screen.getByText('Lucy Ward')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Revealed to Harvey Walters' })).toBeInTheDocument()
    expect(screen.getByText("The Keeper hasn't revealed anything to Harvey Walters yet.")).toBeInTheDocument()
  })

  it('omits the location when there is none and names an unnamed Investigator', () => {
    render(
      <ActiveScenePlayerView scene={{ kind: 'present-player', title: 'X', location: '', investigatorsPresent: [{ name: null, isYours: true }] }} />,
    )

    expect(screen.queryByText('Location')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Revealed to Unnamed Investigator' })).toBeInTheDocument()
  })

  it('shows any other Player only the title and that the Scene is in progress', () => {
    const { container } = render(<ActiveScenePlayerView scene={{ kind: 'absent-player', title: 'The Corbitt House' }} />)

    expect(screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeInTheDocument()
    expect(screen.getByText("This Scene is in progress. You aren't taking part in it.")).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
    expect(container.querySelector('dl, ul, time')).toBeNull()
  })
})
