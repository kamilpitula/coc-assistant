import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AddSectionGroup } from './add-section-group'

// specs/scenario-preparation/ux.md section 25.2; SP-UX-33, SP-A11Y-21.

describe('AddSectionGroup', () => {
  it('offers one button per section not added, in a group labelled "Add a section"', async () => {
    const onAdd = vi.fn()
    render(<AddSectionGroup available={['combat', 'spells']} onAdd={onAdd} />)

    expect(screen.getByRole('group', { name: 'Add a section' })).toBeInTheDocument()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Add Combat', 'Add Spells'])
    await userEvent.click(screen.getByRole('button', { name: 'Add Combat' }))
    expect(onAdd).toHaveBeenCalledWith('combat')
  })

  it('is not rendered when every section is added', () => {
    const { container } = render(<AddSectionGroup available={[]} onAdd={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })
})
