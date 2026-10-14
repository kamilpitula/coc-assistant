import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { myCharacterSheet, problem, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'

import { SheetStep } from './sheet-step'

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

const editing = { inputs: validInputs, errors: {}, onAction: vi.fn(), onBlur: vi.fn() }
const unspent = problem('PersonalInterestPointsUnspent', 'personalInterestPoints', 'You have 60 personal interest points left. Unspent points are lost.', 'Warning')
const lowSize = problem('PointBuyBelowRecommendation', 'characteristics.SIZ', 'SIZ is below the recommended 40. Check with your Keeper.', 'Warning')

/** specs/character-sheet/ux.md section 6.7 (Worth checking, selected option A) and section 5.2. */
describe('SheetStep', () => {
  it('UX-29: lists every warning from every step in "Worth checking" above the sheet, without errors', () => {
    const nameError = problem('InvestigatorNameRequired', 'identity.name', "Enter your Investigator's name.")
    render(<SheetStep campaignId="c1" sheet={myCharacterSheet({ validationErrors: [unspent, nameError, lowSize] })} editing={editing} />)

    const alert = screen.getByText('Worth checking').parentElement!
    expect(alert).not.toHaveAttribute('role', 'alert')
    expect(alert).toHaveTextContent(unspent.message)
    expect(alert).toHaveTextContent(lowSize.message)
    expect(alert).not.toHaveTextContent(nameError.message)
    expect(alert.compareDocumentPosition(screen.getByRole('heading', { name: 'Summary' }))).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('shows no "Worth checking" without warnings, and the sheet in edit mode', () => {
    render(<SheetStep campaignId="c1" sheet={myCharacterSheet()} editing={editing} />)

    expect(screen.queryByText('Worth checking')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Change identity' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add weapon' })).toBeInTheDocument()
  })
})
