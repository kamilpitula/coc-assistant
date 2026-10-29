import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ImageDescriptionField } from './image-description-field'

// specs/scenario-preparation/ux.md section 71; SP-UX-104, SP-A11Y-59.

const props = { value: '', onChange: vi.fn(), inputId: 'description', hintId: 'description-hint', errorId: 'description-error' }

describe('ImageDescriptionField', () => {
  it('has a visible label, a hint that says Players receive it, and no maximum length (SP-A11Y-59)', () => {
    render(<ImageDescriptionField {...props} />)

    const field = screen.getByRole('textbox', { name: 'Image description (optional)' })
    expect(field).toHaveAccessibleDescription('Describe the image for Players who use a screen reader. Players receive it when you reveal the Handout.')
    expect(field).not.toHaveAttribute('maxlength')
    expect(field).not.toHaveAttribute('aria-invalid')
  })

  it('connects the error with aria-describedby and marks the field invalid', () => {
    render(<ImageDescriptionField {...props} error="Image description must be 1,000 characters or fewer." />)

    const field = screen.getByRole('textbox', { name: 'Image description (optional)' })
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription(/Image description must be 1,000 characters or fewer\./)
  })

  it('reports what the Keeper types', async () => {
    const onChange = vi.fn()
    render(<ImageDescriptionField {...props} onChange={onChange} />)

    await userEvent.type(screen.getByRole('textbox'), 'A')

    expect(onChange).toHaveBeenCalledWith('A')
  })
})
