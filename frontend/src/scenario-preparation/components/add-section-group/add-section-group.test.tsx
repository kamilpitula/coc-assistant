import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AddSectionGroup } from './add-section-group'

// specs/scenario-preparation/ux.md section 25.2; SP-UX-33, SP-A11Y-21.

const labels = { combat: 'Combat', spells: 'Spells', sanityLoss: 'Sanity loss' }

describe('AddSectionGroup', () => {
  it('offers one button per section not added, in a group labelled "Add a section"', async () => {
    const onAdd = vi.fn()
    render(<AddSectionGroup available={['combat', 'spells']} labels={labels} onAdd={onAdd} />)

    expect(screen.getByRole('group', { name: 'Add a section' })).toBeInTheDocument()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Add Combat', 'Add Spells'])
    await userEvent.click(screen.getByRole('button', { name: 'Add Combat' }))
    expect(onAdd).toHaveBeenCalledWith('combat')
  })

  it('labels the buttons with the section names of the profile type', () => {
    render(<AddSectionGroup available={['sanityLoss']} labels={labels} onAdd={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Add Sanity loss' })).toHaveAttribute('id', 'add-section-sanityLoss')
  })

  it('is not rendered when every section is added', () => {
    const { container } = render(<AddSectionGroup available={[]} labels={labels} onAdd={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })
})
