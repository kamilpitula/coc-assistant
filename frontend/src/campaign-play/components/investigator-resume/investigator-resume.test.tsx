import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { emptySheetView, myCharacterSheet } from '@/campaign-play/test-support/characterSheetFixtures'
import { navigateSpy } from '@/shared/test-support/routerMock'

import { InvestigatorResume } from './investigator-resume'

const { mockUseSheet } = vi.hoisted(() => ({ mockUseSheet: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useMyInvestigator', () => ({ useMyCharacterSheet: mockUseSheet }))

function withSheet(data: unknown) {
  mockUseSheet.mockReturnValue({ data, isPending: false, isError: false })
}

/** specs/character-sheet/ux.md sections 1 and 5.3; UX-5 ("Continue" opens the first incomplete step). */
describe('InvestigatorResume', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens the first step that is not completed', () => {
    withSheet(myCharacterSheet({ characterSheet: { ...emptySheetView(), identity: { name: 'Harvey', age: 25, gender: null, residence: null, birthplace: null } } }))

    render(<InvestigatorResume campaignId="c1" />)

    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/investigator/$step',
      params: { campaignId: 'c1', step: 'characteristics' },
      replace: true,
    })
  })

  it('opens the read-only sheet for a Submitted Investigator', () => {
    withSheet(myCharacterSheet({ status: 'Submitted', characterSheet: emptySheetView() }))

    render(<InvestigatorResume campaignId="c1" />)

    expect(navigateSpy).toHaveBeenCalledWith(expect.objectContaining({ params: { campaignId: 'c1', step: 'sheet' } }))
  })

  it('shows the not-found page when there is no Investigator', () => {
    withSheet(null)

    render(<InvestigatorResume campaignId="c1" />)

    expect(screen.getByRole('heading', { name: "We couldn't find that Investigator" })).toBeInTheDocument()
    expect(navigateSpy).not.toHaveBeenCalled()
  })
})
