import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { InvestigatorStatus } from '@/campaign-play/types/Investigator'

import { InvestigatorStatusBadge } from './investigator-status-badge'

/** specs/character-sheet/ux.md section 1, status labels; badges always show the text label (A11Y-6). */
describe('InvestigatorStatusBadge', () => {
  it.each<[InvestigatorStatus, string]>([
    ['Draft', 'Draft'],
    ['Submitted', 'Submitted - waiting for your Keeper'],
    ['ChangesRequested', 'Changes requested'],
    ['Approved', 'Approved - ready for play'],
  ])('shows the Player the %s label "%s"', (status, label) => {
    render(<InvestigatorStatusBadge status={status} audience="Player" />)

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it.each<[InvestigatorStatus, string]>([
    ['Draft', 'In progress'],
    ['Submitted', 'Submitted'],
    ['ChangesRequested', 'Changes requested'],
    ['Approved', 'Approved'],
  ])('shows the Keeper the %s label "%s"', (status, label) => {
    render(<InvestigatorStatusBadge status={status} audience="Keeper" />)

    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
