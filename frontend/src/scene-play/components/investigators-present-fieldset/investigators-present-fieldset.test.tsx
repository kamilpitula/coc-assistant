import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ApprovedInvestigator } from '@/scene-play/types/ActiveScene'

import { InvestigatorsPresentFieldset } from './investigators-present-fieldset'

// specs/scene-play/ux.md section 2; SPL-A11Y-2.
const investigators: ApprovedInvestigator[] = [
  { id: 'i1', name: 'Harvey Walters', playerName: 'Ana Ruiz' },
  { id: 'i2', name: null, playerName: 'Ben Cole' },
]

describe('InvestigatorsPresentFieldset', () => {
  it('is a fieldset with the legend, the hint, and a labelled checkbox per Investigator', () => {
    render(<InvestigatorsPresentFieldset investigators={investigators} selected={['i1']} onToggle={vi.fn()} />)

    const group = screen.getByRole('group', { name: 'Investigators present' })
    expect(group).toHaveAccessibleDescription('Choose the Investigators taking part in this Scene.')
    expect(screen.getByRole('checkbox', { name: /Harvey Walters/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Unnamed Investigator/ })).not.toBeChecked()
    expect(screen.getByText('Ben Cole')).toBeInTheDocument()
  })

  it('reports the toggled Investigator and the new state', async () => {
    const onToggle = vi.fn()
    render(<InvestigatorsPresentFieldset investigators={investigators} selected={['i1']} onToggle={onToggle} />)

    await userEvent.click(screen.getByRole('checkbox', { name: /Unnamed Investigator/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Harvey Walters/ }))

    expect(onToggle).toHaveBeenNthCalledWith(1, 'i2', true)
    expect(onToggle).toHaveBeenNthCalledWith(2, 'i1', false)
  })

  it('connects the error to the group and marks it and the checkboxes invalid', () => {
    render(<InvestigatorsPresentFieldset investigators={investigators} selected={[]} onToggle={vi.fn()} error="Choose at least one Investigator present." />)

    const group = screen.getByRole('group', { name: 'Investigators present' })
    expect(group).toHaveAccessibleDescription('Choose the Investigators taking part in this Scene. Choose at least one Investigator present.')
    expect(group).toBeInvalid()
    expect(screen.getByRole('checkbox', { name: /Harvey Walters/ })).toBeInvalid()
  })

  it('disables every checkbox while disabled', () => {
    render(<InvestigatorsPresentFieldset investigators={investigators} selected={[]} onToggle={vi.fn()} disabled />)

    expect(screen.getAllByRole('checkbox').every((checkbox) => checkbox.hasAttribute('disabled'))).toBe(true)
  })
})
