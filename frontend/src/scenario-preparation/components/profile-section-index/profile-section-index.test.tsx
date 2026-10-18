import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { sectionIndexEntries } from '@/scenario-preparation/services/mythosCreatureSections'

import { ProfileSectionIndex } from './profile-section-index'

// specs/scenario-preparation/ux.md section 25.5 (Section index); SP-UX-45, SP-A11Y-28.

describe('ProfileSectionIndex', () => {
  it('is a nav labelled by the visible "On this page" with one link per section in order', () => {
    render(<ProfileSectionIndex sections={sectionIndexEntries(['characteristics', 'combat'])} />)

    const nav = screen.getByRole('navigation', { name: 'On this page' })
    expect(screen.getByText('On this page')).toBeVisible()
    expect(nav).toBeInTheDocument()
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Details', 'Characteristics', 'Combat', 'Keeper notes'])
    expect(screen.getByRole('link', { name: 'Combat' })).toHaveAttribute('href', '#section-combat')
  })

  it('moves focus to the section a link names, never to the body (SP-A11Y-28)', async () => {
    render(
      <>
        <ProfileSectionIndex sections={sectionIndexEntries(['sanityLoss'])} />
        <section id="section-sanityLoss" tabIndex={-1}>
          <h2>Sanity loss</h2>
        </section>
      </>,
    )

    await userEvent.click(screen.getByRole('link', { name: 'Sanity loss' }))

    expect(document.getElementById('section-sanityLoss')).toHaveFocus()
  })

  it('lists only Details and Keeper notes when no section was added', () => {
    render(<ProfileSectionIndex sections={sectionIndexEntries([])} />)

    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Details', 'Keeper notes'])
  })
})
