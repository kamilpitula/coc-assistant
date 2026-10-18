import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { stateFromMythosCreature } from '@/scenario-preparation/services/mythosCreatureForm'
import { bareMythosCreature, ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterSanityLossFields } from './monster-sanity-loss-fields'

// specs/scenario-preparation/ux.md section 25.5 (Sanity loss); SP-UX-35.

describe('MonsterSanityLossFields', () => {
  it('shows one Sanity loss input with its hint and reports edits', async () => {
    const dispatch = vi.fn()
    render(<MonsterSanityLossFields state={stateFromMythosCreature(ghoulMythosCreature)} dispatch={dispatch} errorOf={() => undefined} />)

    const input = screen.getByLabelText('Sanity loss')
    expect(input).toHaveValue('0/1D6')
    expect(input).toHaveAccessibleDescription('Success/failure, for example 0/1D6 or 1/1D10.')
    await userEvent.type(input, '5')
    expect(dispatch).toHaveBeenCalledWith({ type: 'setSanityLoss', value: '0/1D65' })
  })

  it('marks the input with the server message invalid', () => {
    render(
      <MonsterSanityLossFields
        state={stateFromMythosCreature(ghoulMythosCreature)}
        dispatch={vi.fn()}
        errorOf={(path) => (path === 'sanityLoss.value' ? 'Write the Sanity loss as success/failure, for example 0/1D6.' : undefined)}
      />,
    )

    expect(screen.getByLabelText('Sanity loss')).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders nothing while the section is not added', () => {
    const { container } = render(<MonsterSanityLossFields state={stateFromMythosCreature(bareMythosCreature)} dispatch={vi.fn()} errorOf={() => undefined} />)

    expect(container).toBeEmptyDOMElement()
  })
})
