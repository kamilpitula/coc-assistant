import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { sheetView } from '@/campaign-play/test-support/characterSheetFixtures'

import { CharacterSheetView } from './character-sheet-view'

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

const at45 = sheetView({
  identity: { name: 'Harvey Walters', age: 45, gender: 'Male', residence: 'Boston', birthplace: 'Arkham' },
  characteristics: {
    ...sheetView().characteristics,
    STR: { assigned: 60, value: 57, hard: 28, extreme: 11 },
  },
})

/** specs/character-sheet/ux.md section 6.7 Summary (PBI-CP-003 contents of section 9) and section 7. */
describe('CharacterSheetView', () => {
  it('summarises identity, the Player, and each characteristic before and after age effects', () => {
    render(<CharacterSheetView sheet={at45} playerName="Ada Lovelace" />)

    expect(screen.getByRole('heading', { level: 2, name: 'Summary' })).toBeInTheDocument()
    expect(screen.getByText('Harvey Walters')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Arkham')).toBeInTheDocument()

    const strength = screen.getByRole('row', { name: /STR/ })
    expect(within(strength).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['60', '57', '28', '11'])
  })

  it('shows the derived values', () => {
    render(<CharacterSheetView sheet={at45} playerName="Ada Lovelace" />)

    const derived = screen.getByRole('heading', { name: 'Derived values' }).parentElement!
    expect(within(derived).getByText('HP').nextElementSibling).toHaveTextContent('12')
    expect(within(derived).getByText('Luck').nextElementSibling).toHaveTextContent('55')
    expect(within(derived).getByText('SAN').nextElementSibling).toHaveTextContent('60 of 99')
  })

  it('offers "Change" links to the wizard steps in edit mode', () => {
    render(<CharacterSheetView sheet={at45} playerName="Ada Lovelace" changeLinksFor="c1" />)

    expect(screen.getByRole('link', { name: 'Change identity' })).toHaveAttribute('href', '/campaigns/c1/investigator/identity')
    expect(screen.getByRole('link', { name: 'Change characteristics' })).toHaveAttribute(
      'href',
      '/campaigns/c1/investigator/characteristics',
    )
    expect(screen.getByRole('link', { name: 'Change age effects' })).toHaveAttribute('href', '/campaigns/c1/investigator/age')
  })

  it('UX-12: has no edit controls when read-only', () => {
    render(<CharacterSheetView sheet={at45} playerName="Ada Lovelace" />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
