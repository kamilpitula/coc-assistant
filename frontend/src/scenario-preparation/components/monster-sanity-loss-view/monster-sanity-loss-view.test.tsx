import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MonsterSanityLossView } from './monster-sanity-loss-view'

// specs/scenario-preparation/ux.md section 25.5 (Sanity loss).

describe('MonsterSanityLossView', () => {
  it('shows the Sanity loss as entered', () => {
    render(<MonsterSanityLossView sanityLoss={{ value: '0/1D6' }} />)

    expect(screen.getByText('Sanity loss 0/1D6')).toBeInTheDocument()
  })

  it('says "No Sanity roll." for an added empty section', () => {
    render(<MonsterSanityLossView sanityLoss={{ value: null }} />)

    expect(screen.getByText('No Sanity roll.')).toBeInTheDocument()
  })
})
