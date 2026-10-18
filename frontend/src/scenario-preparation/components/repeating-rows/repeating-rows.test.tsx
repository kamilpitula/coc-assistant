import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RepeatingRows } from './repeating-rows'

// specs/scenario-preparation/ux.md section 25.2; SP-UX-34.

describe('RepeatingRows', () => {
  it('shows the rows and an "Add skill" button that adds', async () => {
    const onAdd = vi.fn()
    render(
      <RepeatingRows item="skill" items="skills" count={1} addButtonId="add-skills" onAdd={onAdd}>
        <p>row</p>
      </RepeatingRows>,
    )

    expect(screen.getByText('row')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add skill' }))
    expect(onAdd).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Add skill' })).toHaveAttribute('id', 'add-skills')
  })

  it('replaces the Add button with the limit message at 100 rows', () => {
    render(
      <RepeatingRows item="skill" items="skills" count={100} addButtonId="add-skills" onAdd={vi.fn()}>
        <p>row</p>
      </RepeatingRows>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText("You've reached the limit of 100 skills.")).toBeInTheDocument()
  })

  it('still offers Add at 99 rows', () => {
    render(
      <RepeatingRows item="spell" items="spells" count={99} addButtonId="add-spells" onAdd={vi.fn()}>
        <p>row</p>
      </RepeatingRows>,
    )

    expect(screen.getByRole('button', { name: 'Add spell' })).toBeInTheDocument()
  })
})
