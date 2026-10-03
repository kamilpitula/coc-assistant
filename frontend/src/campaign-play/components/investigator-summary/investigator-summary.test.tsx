import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { DerivedValues } from '@/campaign-play/types/CharacterSheet'

import { InvestigatorSummary } from './investigator-summary'

const derived: DerivedValues = {
  luck: 55,
  hitPoints: 12,
  magicPoints: 12,
  sanity: { current: 60, maximum: 99 },
  dodge: 30,
  movementRate: 8,
  damageBonus: '0',
  build: 0,
}

const notCalculated: DerivedValues = {
  luck: null,
  hitPoints: null,
  magicPoints: null,
  sanity: { current: null, maximum: null },
  dodge: null,
  movementRate: null,
  damageBonus: null,
  build: null,
}

/** specs/character-sheet/ux.md section 4.2 with the PBI-CP-003 contents of section 9. */
describe('InvestigatorSummary', () => {
  it('lists the derived values in a "Your Investigator" aside', () => {
    render(<InvestigatorSummary derived={derived} problemCount={0} onShowProblems={vi.fn()} />)

    const aside = screen.getByRole('complementary', { name: 'Your Investigator' })
    expect(within(aside).getByText('HP').nextElementSibling).toHaveTextContent('12')
    expect(within(aside).getByText('SAN').nextElementSibling).toHaveTextContent('60')
    expect(within(aside).getByText('Damage Bonus').nextElementSibling).toHaveTextContent('0')
    expect(within(aside).getByText('No problems')).toBeInTheDocument()
  })

  it('shows an em dash with hidden text for values not yet calculated', () => {
    render(<InvestigatorSummary derived={notCalculated} problemCount={0} onShowProblems={vi.fn()} />)

    const aside = screen.getByRole('complementary', { name: 'Your Investigator' })
    expect(within(aside).getAllByText('not yet calculated')).toHaveLength(8)
  })

  it('links the problem count to the error summary', async () => {
    const onShowProblems = vi.fn()
    render(<InvestigatorSummary derived={derived} problemCount={2} onShowProblems={onShowProblems} />)

    const aside = screen.getByRole('complementary', { name: 'Your Investigator' })
    await userEvent.click(within(aside).getByRole('link', { name: '2 problems' }))

    expect(onShowProblems).toHaveBeenCalled()
  })

  it('offers a collapsed summary below 1024px with the key values in its name', () => {
    render(<InvestigatorSummary derived={derived} problemCount={0} onShowProblems={vi.fn()} />)

    const toggle = screen.getByRole('button', { name: 'Summary: HP 12, SAN 60' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})
