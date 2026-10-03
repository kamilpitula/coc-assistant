import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { WizardField } from './wizard-field'

/** specs/character-sheet/ux.md section 5.2; A11Y-3 (visible labels) and A11Y-4 (errors attached to their field). */
describe('WizardField', () => {
  it('labels its input and describes it with the help text', () => {
    render(<WizardField field="identity.age" label="Age" type="number" value={25} help="Age affects your characteristics." onChange={vi.fn()} />)

    const input = screen.getByLabelText('Age')
    expect(input).toHaveAccessibleDescription('Age affects your characteristics.')
    expect(input).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('marks the input invalid and attaches the error message', () => {
    render(<WizardField field="identity.age" label="Age" type="number" value={14} error="Age must be between 15 and 89." onChange={vi.fn()} />)

    const input = screen.getByLabelText('Age')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Age must be between 15 and 89.')
    expect(input).toHaveAttribute('id', 'field-identity-age')
  })

  it('reports whole numbers for a number field and null when it is cleared', async () => {
    const onChange = vi.fn()
    function Harness() {
      const [value, setValue] = useState<number | null>(null)
      return (
        <WizardField
          field="characteristics.STR"
          label="STR"
          type="number"
          value={value}
          onChange={(next) => {
            onChange(next)
            setValue(next)
          }}
        />
      )
    }
    render(<Harness />)

    await userEvent.type(screen.getByLabelText('STR'), '6')
    expect(onChange).toHaveBeenLastCalledWith(6)

    await userEvent.clear(screen.getByLabelText('STR'))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('reports text, and null for blank text', async () => {
    const onChange = vi.fn()
    render(<WizardField field="identity.name" label="Investigator name" value={null} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Investigator name'), 'H')
    expect(onChange).toHaveBeenLastCalledWith('H')
  })

  it('tells its parent when it loses focus', async () => {
    const onBlur = vi.fn()
    render(<WizardField field="identity.name" label="Investigator name" value="Harvey" onChange={vi.fn()} onBlur={onBlur} />)

    await userEvent.click(screen.getByLabelText('Investigator name'))
    await userEvent.tab()

    expect(onBlur).toHaveBeenCalledWith('identity.name', null)
  })
})
