import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { HeadingOffsetProvider } from '@/shared/providers/heading-offset/heading-offset'

import { ProfileSection } from './profile-section'

// specs/scenario-preparation/ux.md sections 25.1 and 25.2; SP-A11Y-18, SP-A11Y-21.

describe('ProfileSection', () => {
  it('is an h2 section in view mode', () => {
    render(
      <ProfileSection title="Skills" mode="view">
        <p>Content</p>
      </ProfileSection>,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Skills' })).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('is a fieldset with a legend in edit mode, and a Remove button named for its section', async () => {
    const onRemove = vi.fn()
    render(
      <ProfileSection title="Skills" mode="edit" onRemove={onRemove}>
        <input aria-label="inner" />
      </ProfileSection>,
    )

    expect(screen.getByRole('group', { name: 'Skills' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove Skills section' }))
    expect(onRemove).toHaveBeenCalled()
  })

  it('has no Remove button for a section that is always present', () => {
    render(
      <ProfileSection title="Details" mode="edit">
        <input aria-label="inner" />
      </ProfileSection>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shifts the view-mode h2 down inside an offset provider and leaves edit mode unchanged (NAV-UX-9, entity panel)', () => {
    const { rerender } = render(
      <HeadingOffsetProvider value={3}>
        <ProfileSection title="Skills" mode="view">
          <p>Content</p>
        </ProfileSection>
      </HeadingOffsetProvider>,
    )

    expect(screen.getByRole('heading', { level: 5, name: 'Skills' })).toBeInTheDocument()

    rerender(
      <HeadingOffsetProvider value={3}>
        <ProfileSection title="Skills" mode="edit">
          <input aria-label="inner" />
        </ProfileSection>
      </HeadingOffsetProvider>,
    )

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Skills' })).toBeInTheDocument()
  })
})
