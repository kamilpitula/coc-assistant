import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { WizardTextarea } from './wizard-textarea'

/** specs/character-sheet/ux.md sections 5.2 and 6.7; A11Y-3 (visible labels) and A11Y-4 (errors attached to their field). */
describe('WizardTextarea', () => {
  it('labels its textarea, limits its length, and attaches the error message', () => {
    render(<WizardTextarea field="backstory.traits" label="Traits" value="Stubborn" maxLength={2000} error="Too long." onChange={vi.fn()} />)

    const textarea = screen.getByRole('textbox', { name: 'Traits' })
    expect(textarea).toHaveValue('Stubborn')
    expect(textarea).toHaveAttribute('id', 'field-backstory-traits')
    expect(textarea).toHaveAttribute('maxlength', '2000')
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
    expect(textarea).toHaveAccessibleDescription('Too long.')
  })

  it('keeps line breaks, reports null when cleared, and reports the field on blur', async () => {
    const onChange = vi.fn()
    const onBlur = vi.fn()
    function Harness() {
      const [value, setValue] = useState<string | null>(null)
      return (
        <WizardTextarea
          field="gear"
          label="Gear and possessions"
          value={value}
          onBlur={onBlur}
          onChange={(next) => {
            onChange(next)
            setValue(next)
          }}
        />
      )
    }
    render(<Harness />)

    const textarea = screen.getByRole('textbox', { name: 'Gear and possessions' })
    await userEvent.type(textarea, 'Lantern{Enter}Rope')
    expect(onChange).toHaveBeenLastCalledWith('Lantern\nRope')

    await userEvent.clear(textarea)
    expect(onChange).toHaveBeenLastCalledWith(null)

    await userEvent.tab()
    expect(onBlur).toHaveBeenCalledWith('gear', null)
  })

  it('can keep its label for assistive technology only', () => {
    render(<WizardTextarea field="gear" label="Gear and possessions" value={null} hideLabel onChange={vi.fn()} />)

    expect(screen.getByText('Gear and possessions')).toHaveClass('sr-only')
  })
})
