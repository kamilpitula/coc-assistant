import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlayerCampaign } from '@/campaign-play/types/Campaign'
import { navigateSpy } from '@/shared/test-support/routerMock'

import { YourInvestigatorCard } from './your-investigator-card'

const { mockUseMyInvestigator, mockUseMyCharacterSheet, mockUseCreate, mockCreate, mockRefetch } = vi.hoisted(() => ({
  mockUseMyInvestigator: vi.fn(),
  mockUseMyCharacterSheet: vi.fn(),
  mockUseCreate: vi.fn(),
  mockCreate: vi.fn(),
  mockRefetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

vi.mock('@/campaign-play/hooks/useMyInvestigator', () => ({
  useMyInvestigator: mockUseMyInvestigator,
  useMyCharacterSheet: mockUseMyCharacterSheet,
  useCreateInvestigator: mockUseCreate,
}))

const campaign: PlayerCampaign = {
  id: 'c1',
  name: 'The Haunting',
  era: '1920s',
  allowedCreationMethods: ['StandardRolling', 'PointBuy', 'QuickFire'],
  role: 'Player',
}

function investigator(overrides: Record<string, unknown> = {}) {
  return {
    id: 'i1',
    status: 'Draft',
    name: null,
    changeRequestComment: null,
    updatedAt: '2026-10-02T12:00:00+00:00',
    ...overrides,
  }
}

function query(data: unknown, overrides: Record<string, unknown> = {}) {
  return { data, isPending: false, isError: false, refetch: mockRefetch, ...overrides }
}

const emptyIdentity = { name: null, age: null, gender: null, residence: null, birthplace: null }

function characterSheetWithName(name: string | null) {
  const characteristic = { assigned: null, value: null, hard: null, extreme: null }
  return {
    status: 'Draft',
    validationErrors: [],
    characterSheet: {
      identity: { ...emptyIdentity, name, age: name ? 25 : null },
      characteristics: Object.fromEntries(['STR', 'CON', 'DEX', 'APP', 'POW', 'SIZ', 'INT', 'EDU'].map((code) => [code, characteristic])),
      ageEffects: { bracket: null, deductions: {}, eduImprovementChecks: [] },
      luckRolls: [],
    },
  }
}

/** specs/character-sheet/ux.md section 3.2, the "Your Investigator" card. */
describe('YourInvestigatorCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMyInvestigator.mockReturnValue(query(null))
    mockUseMyCharacterSheet.mockReturnValue(query(undefined, { isPending: true }))
    mockUseCreate.mockReturnValue({ mutate: mockCreate, isPending: false, isError: false })
  })

  it('is a section headed "Your Investigator"', () => {
    render(<YourInvestigatorCard campaign={campaign} />)

    expect(screen.getByRole('region', { name: 'Your Investigator' })).toBeInTheDocument()
  })

  it('UX-3: offers "Create Investigator", and opens Identity once the Draft is created', async () => {
    mockCreate.mockImplementation((_variables: unknown, options: { onSuccess: () => void }) => options.onSuccess())
    render(<YourInvestigatorCard campaign={campaign} />)

    expect(screen.getByText("Create the Investigator you'll play in this Campaign.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Create Investigator' }))

    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/investigator/$step',
      params: { campaignId: 'c1', step: 'identity' },
    })
  })

  it('UX-19: explains that no allowed creation method is available yet and offers no create action', () => {
    render(<YourInvestigatorCard campaign={{ ...campaign, allowedCreationMethods: ['StandardRolling', 'QuickFire'] }} />)

    expect(
      screen.getByText(
        "You can't create your Investigator yet. This Campaign allows Standard rolling, Quick fire, which aren't available yet. Ask your Keeper to also allow Point buy.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create Investigator' })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a Draft with its name, status, the step to resume, and "Continue"', () => {
    mockUseMyInvestigator.mockReturnValue(query(investigator({ name: 'Harvey Walters' })))
    mockUseMyCharacterSheet.mockReturnValue(query(characterSheetWithName('Harvey Walters')))

    render(<YourInvestigatorCard campaign={campaign} />)

    expect(screen.getByText('Harvey Walters')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/campaigns/c1/investigator')
  })

  it('calls an unnamed Draft "Unnamed Investigator"', () => {
    mockUseMyInvestigator.mockReturnValue(query(investigator()))
    mockUseMyCharacterSheet.mockReturnValue(query(characterSheetWithName(null)))

    render(<YourInvestigatorCard campaign={campaign} />)

    expect(screen.getByText('Unnamed Investigator')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
  })

  it('shows a Submitted Investigator with its badge and "View"', () => {
    mockUseMyInvestigator.mockReturnValue(query(investigator({ status: 'Submitted', name: 'Harvey Walters' })))

    render(<YourInvestigatorCard campaign={campaign} />)

    expect(screen.getByText('Submitted - waiting for your Keeper')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/campaigns/c1/investigator')
  })

  it("UX-15: shows the Keeper's comment and \"Edit Investigator\" when changes are requested", () => {
    mockUseMyInvestigator.mockReturnValue(
      query(investigator({ status: 'ChangesRequested', name: 'Harvey Walters', changeRequestComment: 'Lower the Credit Rating' })),
    )

    render(<YourInvestigatorCard campaign={campaign} />)

    const alert = screen.getByRole('heading', { name: 'Your Keeper asked for changes' }).parentElement!
    expect(within(alert).getByText('Lower the Credit Rating')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit Investigator' })).toHaveAttribute('href', '/campaigns/c1/investigator/sheet')
  })

  it('shows an Approved Investigator as ready for play', () => {
    mockUseMyInvestigator.mockReturnValue(query(investigator({ status: 'Approved', name: 'Harvey Walters' })))

    render(<YourInvestigatorCard campaign={campaign} />)

    expect(screen.getByText('Approved - ready for play')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View' })).toBeInTheDocument()
  })

  it('shows a busy skeleton while loading', () => {
    mockUseMyInvestigator.mockReturnValue(query(undefined, { isPending: true }))

    render(<YourInvestigatorCard campaign={campaign} />)

    expect(screen.getByRole('region', { name: 'Your Investigator' })).toHaveAttribute('aria-busy', 'true')
  })

  it('offers "Try again" when the Investigator cannot be loaded', async () => {
    mockUseMyInvestigator.mockReturnValue(query(undefined, { isError: true }))

    render(<YourInvestigatorCard campaign={campaign} />)

    expect(screen.getByText("We couldn't load your Investigator.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(mockRefetch).toHaveBeenCalled()
  })
})
