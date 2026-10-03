import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Campaign, PlayerCampaign } from '@/campaign-play/types/Campaign'
import type { CampaignMember } from '@/campaign-play/types/CampaignMember'
import { navigateSpy } from '@/shared/test-support/routerMock'

import { AttentionList } from './attention-list'

// specs/campaign-overview/ux.md section 4; spec.md, Attention items; CO-UX-4, CO-UX-5, CO-UX-6.

const { mockUseMembers, mockUseMyInvestigator, mockUseMyCharacterSheet, mockUseCreate, mockCreate, mockRefetch } = vi.hoisted(
  () => ({
    mockUseMembers: vi.fn(),
    mockUseMyInvestigator: vi.fn(),
    mockUseMyCharacterSheet: vi.fn(),
    mockUseCreate: vi.fn(),
    mockCreate: vi.fn(),
    mockRefetch: vi.fn(),
  }),
)

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaignMembers', () => ({ useCampaignMembers: mockUseMembers }))
vi.mock('@/campaign-play/hooks/useMyInvestigator', () => ({
  useMyInvestigator: mockUseMyInvestigator,
  useMyCharacterSheet: mockUseMyCharacterSheet,
  useCreateInvestigator: mockUseCreate,
}))
vi.mock('@/campaign-play/components/invite-dialog/invite-dialog', () => ({
  InvitePlayersDialog: () => <button type="button">Invite Players</button>,
}))

function query(data: unknown, overrides: Record<string, unknown> = {}) {
  return { data, isPending: false, isError: false, refetch: mockRefetch, ...overrides }
}

const keeperCampaign: Campaign = {
  id: 'c1',
  name: 'The Haunting',
  keeperAccountId: 'k1',
  playerLimit: 8,
  era: '1920s',
  allowedCreationMethods: ['PointBuy'],
  role: 'Keeper',
}

const playerCampaign: PlayerCampaign = {
  id: 'c1',
  name: 'The Haunting',
  era: '1920s',
  allowedCreationMethods: ['StandardRolling', 'PointBuy', 'QuickFire'],
  role: 'Player',
}

const keeper: CampaignMember = { memberId: 'c1', displayName: 'Eleanor Hart', role: 'Keeper', isYou: true, investigator: null }

function section() {
  return screen.getByRole('region', { name: 'Needs your attention' })
}

describe('AttentionList for the Keeper', () => {
  beforeEach(() => vi.clearAllMocks())

  it('asks the Keeper to review each Submitted Investigator (CO-UX-4)', () => {
    mockUseMembers.mockReturnValue(
      query([
        keeper,
        {
          memberId: 'p1',
          displayName: 'Ana Ruiz',
          role: 'Player',
          isYou: false,
          investigator: { visibility: 'Visible', id: 'i1', name: 'Dr. Ames', status: 'Submitted' },
        },
      ]),
    )

    render(<AttentionList campaign={keeperCampaign} />)

    const items = within(section()).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('Dr. Ames by Ana Ruiz is ready for review')
    expect(within(items[0]).getByRole('link', { name: 'Review Dr. Ames' })).toHaveAttribute(
      'href',
      '/campaigns/c1/investigators/i1',
    )
  })

  it('asks a Keeper without Players to invite them (CO-UX-5)', () => {
    mockUseMembers.mockReturnValue(query([keeper]))

    render(<AttentionList campaign={keeperCampaign} />)

    expect(within(section()).getByText('No Players have joined yet.')).toBeInTheDocument()
    expect(within(section()).getByRole('button', { name: 'Invite Players' })).toBeInTheDocument()
  })

  it('is not shown when nothing needs the Keeper', () => {
    mockUseMembers.mockReturnValue(
      query([keeper, { memberId: 'p1', displayName: 'Ana Ruiz', role: 'Player', isYou: false, investigator: null }]),
    )

    render(<AttentionList campaign={keeperCampaign} />)

    expect(screen.queryByRole('region', { name: 'Needs your attention' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Needs your attention' })).not.toBeInTheDocument()
  })

  it('shows a busy row while the roster loads', () => {
    mockUseMembers.mockReturnValue(query(undefined, { isPending: true }))

    render(<AttentionList campaign={keeperCampaign} />)

    expect(section().querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('offers to try again when it cannot check', async () => {
    mockUseMembers.mockReturnValue(query(undefined, { isError: true }))

    render(<AttentionList campaign={keeperCampaign} />)

    expect(within(section()).getByText("We couldn't check what needs your attention.")).toBeInTheDocument()
    await userEvent.click(within(section()).getByRole('button', { name: 'Try again' }))
    expect(mockRefetch).toHaveBeenCalled()
  })
})

function investigator(overrides: Record<string, unknown> = {}) {
  return { id: 'i1', status: 'Draft', name: null, changeRequestComment: null, updatedAt: '2026-10-02T12:00:00+00:00', ...overrides }
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

describe('AttentionList for a Player (CO-UX-6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMyInvestigator.mockReturnValue(query(null))
    mockUseMyCharacterSheet.mockReturnValue(query(undefined, { isPending: true }))
    mockUseCreate.mockReturnValue({ mutate: mockCreate, isPending: false, isError: false })
  })

  it('offers "Create Investigator" and opens Identity once the Draft is created', async () => {
    mockCreate.mockImplementation((_variables: unknown, options: { onSuccess: () => void }) => options.onSuccess())
    render(<AttentionList campaign={playerCampaign} />)

    expect(within(section()).getByText("Create the Investigator you'll play in this Campaign.")).toBeInTheDocument()
    await userEvent.click(within(section()).getByRole('button', { name: 'Create Investigator' }))

    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/investigator/$step',
      params: { campaignId: 'c1', step: 'identity' },
    })
  })

  it('reports when the Investigator cannot be created', () => {
    mockUseCreate.mockReturnValue({ mutate: mockCreate, isPending: false, isError: true })

    render(<AttentionList campaign={playerCampaign} />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't create your Investigator. Try again.")
  })

  it('explains that no allowed Creation Method is available yet, with no action', () => {
    render(<AttentionList campaign={{ ...playerCampaign, allowedCreationMethods: ['StandardRolling', 'QuickFire'] }} />)

    expect(
      within(section()).getByText(
        "You can't create your Investigator yet. This Campaign allows Standard rolling, Quick fire, which aren't available yet. Ask your Keeper to also allow Point buy.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create Investigator' })).not.toBeInTheDocument()
  })

  it('uses a singular verb when the Campaign allows a single unavailable method', () => {
    render(<AttentionList campaign={{ ...playerCampaign, allowedCreationMethods: ['QuickFire'] }} />)

    expect(
      screen.getByText(
        "You can't create your Investigator yet. This Campaign allows Quick fire, which isn't available yet. Ask your Keeper to also allow Point buy.",
      ),
    ).toBeInTheDocument()
  })

  it('asks to continue a Draft at the step to resume', () => {
    mockUseMyInvestigator.mockReturnValue(query(investigator({ name: 'Harvey Walters' })))
    mockUseMyCharacterSheet.mockReturnValue(query(characterSheetWithName('Harvey Walters')))

    render(<AttentionList campaign={playerCampaign} />)

    expect(within(section()).getByText('Continue Harvey Walters: step 2 of 4')).toBeInTheDocument()
    expect(within(section()).getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/campaigns/c1/investigator')
  })

  it('calls an unnamed Draft "your Investigator"', () => {
    mockUseMyInvestigator.mockReturnValue(query(investigator()))
    mockUseMyCharacterSheet.mockReturnValue(query(characterSheetWithName(null)))

    render(<AttentionList campaign={playerCampaign} />)

    expect(within(section()).getByText('Continue your Investigator: step 1 of 4')).toBeInTheDocument()
  })

  it('waits for the Draft progress before showing the item', () => {
    mockUseMyInvestigator.mockReturnValue(query(investigator()))

    render(<AttentionList campaign={playerCampaign} />)

    expect(section().querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(within(section()).queryByRole('link', { name: 'Continue' })).not.toBeInTheDocument()
  })

  it("shows the Keeper's Change Request comment and \"Edit Investigator\"", () => {
    mockUseMyInvestigator.mockReturnValue(
      query(investigator({ status: 'ChangesRequested', name: 'Harvey Walters', changeRequestComment: 'Lower the\nCredit Rating' })),
    )

    render(<AttentionList campaign={playerCampaign} />)

    expect(within(section()).getByText('Your Keeper asked for changes to Harvey Walters.')).toBeInTheDocument()
    expect(within(section()).getByText(/Lower the\s+Credit Rating/)).toHaveClass('whitespace-pre-line')
    expect(within(section()).getByRole('link', { name: 'Edit Investigator' })).toHaveAttribute(
      'href',
      '/campaigns/c1/investigator/sheet',
    )
  })

  it.each(['Submitted', 'Approved'])('is not shown once the Investigator is %s', (status) => {
    mockUseMyInvestigator.mockReturnValue(query(investigator({ status, name: 'Harvey Walters' })))

    render(<AttentionList campaign={playerCampaign} />)

    expect(screen.queryByRole('region', { name: 'Needs your attention' })).not.toBeInTheDocument()
  })

  it('offers to try again when the Investigator cannot be loaded', async () => {
    mockUseMyInvestigator.mockReturnValue(query(undefined, { isError: true }))

    render(<AttentionList campaign={playerCampaign} />)

    expect(within(section()).getByText("We couldn't check what needs your attention.")).toBeInTheDocument()
    await userEvent.click(within(section()).getByRole('button', { name: 'Try again' }))
    expect(mockRefetch).toHaveBeenCalled()
  })
})
