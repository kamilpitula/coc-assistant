import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { VisibilityChoice } from './visibility-choice'

// specs/roll-requests/ux.md RR-A11Y-11: a visible accessible name, descriptions linked to their options, keyboard operable.
describe('VisibilityChoice', () => {
  it('names the group by its legend and describes each option', () => {
    render(
      <VisibilityChoice
        legend="Who can see this roll?"
        publicLabel="Public"
        publicDescription="Players roll it themselves and everyone sees the result."
        keeperOnlyLabel="Keeper only (hidden roll)"
        keeperOnlyDescription="The app rolls it now. Only you see it."
        value="Public"
        onChange={() => undefined}
      />,
    )

    const group = screen.getByRole('radiogroup', { name: 'Who can see this roll?' })
    expect(group).toBeInTheDocument()
    const publicOption = screen.getByRole('radio', { name: 'Public' })
    expect(publicOption).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Keeper only (hidden roll)' })).not.toBeChecked()
    for (const [option, description] of [
      [publicOption, 'Players roll it themselves and everyone sees the result.'],
      [screen.getByRole('radio', { name: 'Keeper only (hidden roll)' }), 'The app rolls it now. Only you see it.'],
    ] as const) {
      const describedBy = option.getAttribute('aria-describedby')
      expect(describedBy).not.toBeNull()
      expect(document.getElementById(describedBy ?? '')).toHaveTextContent(description)
    }
  })

  it('reports the chosen value on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <VisibilityChoice
        legend="Who can see this roll?"
        publicLabel="Public"
        publicDescription="Players roll it themselves and everyone sees the result."
        keeperOnlyLabel="Keeper only (hidden roll)"
        keeperOnlyDescription="The app rolls it now. Only you see it."
        value="Public"
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('radio', { name: 'Keeper only (hidden roll)' }))

    expect(onChange).toHaveBeenCalledWith('KeeperOnly')
  })

  it('moves between options with the arrows and selects with Space', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <VisibilityChoice
        legend="Who can see this roll?"
        publicLabel="Public"
        publicDescription="Players roll it themselves and everyone sees the result."
        keeperOnlyLabel="Keeper only (hidden roll)"
        keeperOnlyDescription="The app rolls it now. Only you see it."
        value="Public"
        onChange={onChange}
      />,
    )

    await user.tab()
    expect(screen.getByRole('radio', { name: 'Public' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Keeper only (hidden roll)' })).toHaveFocus()
    await user.keyboard(' ')

    expect(onChange).toHaveBeenCalledWith('KeeperOnly')
  })
})
