import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { InvestigatorCreationStepper } from './investigator-creation-stepper'

const states = {
  identity: 'completed',
  characteristics: 'needsAttention',
  age: 'notStarted',
  occupation: 'notStarted',
  'occupation-skills': 'notStarted',
  'personal-interests': 'notStarted',
  sheet: 'notStarted',
} as const

/** specs/character-sheet/ux.md section 4.1; A11Y-2 and UX-6. */
describe('InvestigatorCreationStepper', () => {
  it('is a labelled navigation with an ordered list of the seven steps', () => {
    render(<InvestigatorCreationStepper campaignId="c1" current="age" states={states} onSelect={vi.fn()} />)

    const nav = screen.getByRole('navigation', { name: 'Investigator creation steps' })
    expect(within(nav).getAllByRole('listitem')).toHaveLength(7)
  })

  it('makes completed and needs-attention steps links that say their status, and marks the current step', () => {
    render(<InvestigatorCreationStepper campaignId="c1" current="age" states={states} onSelect={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'Identity, completed' })).toHaveAttribute('href', '/campaigns/c1/investigator/identity')
    expect(screen.getByRole('link', { name: 'Characteristics, needs attention' })).toBeInTheDocument()
    expect(screen.getByText('Age effects').closest('[aria-current="step"]')).not.toBeNull()
  })

  it('UX-6: does not let the Player open a step that is not started', () => {
    render(<InvestigatorCreationStepper campaignId="c1" current="age" states={states} onSelect={vi.fn()} />)

    expect(screen.queryByRole('link', { name: /Sheet and submit/ })).not.toBeInTheDocument()
    expect(screen.getAllByText(', not started')).toHaveLength(4)
  })

  it('hands a link click to the wizard so it can save first', async () => {
    const onSelect = vi.fn()
    render(<InvestigatorCreationStepper campaignId="c1" current="age" states={states} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('link', { name: 'Identity, completed' }))

    expect(onSelect).toHaveBeenCalledWith('identity')
  })
})
