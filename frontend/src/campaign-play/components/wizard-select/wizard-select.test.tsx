import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WizardSelect } from './wizard-select'

const options = [
  { value: '70', label: '70' },
  { value: '60', label: '60' },
]

/** specs/character-sheet/ux.md sections 5.2 and 6.2 (Quick fire Selects); A11Y-3 and A11Y-4. */
describe('WizardSelect', () => {
  it('labels its control, shows the chosen option, and attaches the error', () => {
    render(<WizardSelect field="characteristics.STR" label="STR" value="70" options={options} error="Pick one." onChange={vi.fn()} />)

    const select = screen.getByRole('combobox', { name: 'STR' })
    expect(select).toHaveTextContent('70')
    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(select).toHaveAccessibleDescription('Pick one.')
    expect(select).toHaveAttribute('id', 'field-characteristics-STR')
  })

  it('reports the option the Player picks', async () => {
    const onChange = vi.fn()
    render(<WizardSelect field="characteristics.STR" label="STR" value={null} options={options} onChange={onChange} />)

    await userEvent.click(screen.getByRole('combobox', { name: 'STR' }))
    await userEvent.click(screen.getByRole('option', { name: '60' }))

    expect(onChange).toHaveBeenCalledWith('60')
  })
})
