import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InvestigatorConflictError } from '@/campaign-play/services/investigatorApi'

import {
  bracket45,
  emptySheetView,
  myCharacterSheet,
  occupationCatalog,
  problem,
  sheetView,
  skillCatalog,
  validInputs,
} from '@/campaign-play/test-support/characterSheetFixtures'
import type { MyCharacterSheet } from '@/campaign-play/types/Investigator'
import { navigateSpy, routerState } from '@/shared/test-support/routerMock'

import { InvestigatorWizard } from './investigator-wizard'

const { mockUseSheet, mockSave, mockRoll, mockRollLuck, mockRollEdu, mockSubmit, mockDelete, mockUseCampaign } = vi.hoisted(() => ({
  mockUseSheet: vi.fn(),
  mockUseCampaign: vi.fn(),
  mockSave: vi.fn(),
  mockRoll: vi.fn(),
  mockRollLuck: vi.fn(),
  mockRollEdu: vi.fn(),
  mockSubmit: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useMyInvestigator', () => ({
  useMyCharacterSheet: mockUseSheet,
  useSaveCharacterSheet: () => ({ mutateAsync: mockSave, isPending: false }),
  useRollCharacteristics: () => ({ mutateAsync: mockRoll, isPending: false }),
  useRollLuck: () => ({ mutateAsync: mockRollLuck, isPending: false }),
  useRollEduImprovementCheck: () => ({ mutateAsync: mockRollEdu, isPending: false }),
  useSubmitInvestigator: () => ({ mutateAsync: mockSubmit, isPending: false }),
  useDeleteInvestigator: () => ({ mutateAsync: mockDelete, isPending: false }),
}))

vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/campaign-play/hooks/useRuleData', () => ({
  useOccupationCatalog: () => ({ data: occupationCatalog, isPending: false, isError: false }),
  useSkillCatalog: () => ({ data: skillCatalog, isPending: false, isError: false }),
}))

function allowing(...methods: string[]) {
  mockUseCampaign.mockReturnValue({ data: { allowedCreationMethods: methods }, isPending: false, isError: false })
}

function withSheet(sheet: MyCharacterSheet | null, refetch?: ReturnType<typeof vi.fn>) {
  mockUseSheet.mockReturnValue({
    data: sheet,
    isPending: false,
    isError: false,
    refetch: refetch ?? vi.fn().mockResolvedValue({ data: sheet }),
  })
}

const nameError = problem('InvestigatorNameRequired', 'identity.name', "Enter your Investigator's name.")

const freshDraft = myCharacterSheet({
  characterSheet: emptySheetView(),
  validationErrors: [nameError, problem('AgeRequired', 'identity.age', "Enter your Investigator's age.")],
})

/** specs/character-sheet/ux.md sections 4 and 5 and step 6.7 with the PBI-CP-003 scope of section 9. */
describe('InvestigatorWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    allowing('PointBuy')
  })

  it('UX-18: shows the not-found page when the caller has no Investigator', () => {
    withSheet(null)

    render(<InvestigatorWizard campaignId="c1" step="identity" />)

    expect(screen.getByRole('heading', { name: "We couldn't find that Investigator" })).toBeInTheDocument()
  })

  it('A11Y-1: shows the step with its title as the single, focused h1, the stepper, and the summary', () => {
    withSheet(freshDraft)

    render(<InvestigatorWizard campaignId="c1" step="identity" />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Identity')
    expect(heading).toHaveFocus()
    expect(screen.getByRole('navigation', { name: 'Investigator creation steps' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Your Investigator' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
  })

  it('does not show errors on a step the Player has not touched yet', () => {
    withSheet(freshDraft)

    render(<InvestigatorWizard campaignId="c1" step="identity" />)

    expect(screen.getByLabelText('Investigator name')).not.toHaveAttribute('aria-invalid')
  })

  it('UX-4: "Save and continue" on a step without errors saves and opens the next step', async () => {
    withSheet(freshDraft)
    mockSave.mockResolvedValue(myCharacterSheet({ characterSheet: sheetView(), validationErrors: [] }))
    render(<InvestigatorWizard campaignId="c1" step="identity" />)

    await userEvent.type(screen.getByLabelText('Investigator name'), 'Harvey Walters')
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ identity: expect.objectContaining({ name: 'Harvey Walters' }) }))
    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/investigator/$step',
      params: { campaignId: 'c1', step: 'characteristics' },
      state: { statusMessage: undefined },
    })
  })

  it('UX-4 and A11Y-4: "Save and continue" on a step with errors stays and shows the error summary', async () => {
    withSheet(freshDraft)
    mockSave.mockResolvedValue({ ...freshDraft, validationErrors: [nameError] })
    render(<InvestigatorWizard campaignId="c1" step="identity" />)

    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    const summary = await screen.findByRole('alert')
    expect(within(summary).getByRole('link', { name: "Enter your Investigator's name." })).toBeInTheDocument()
    expect(summary).toHaveFocus()
    expect(screen.getByLabelText('Investigator name')).toHaveAttribute('aria-invalid', 'true')
    expect(navigateSpy).not.toHaveBeenCalled()
  })

  it('UX-5: "Save and exit" saves and returns to the Campaign page with "Draft saved."', async () => {
    withSheet(freshDraft)
    mockSave.mockResolvedValue(freshDraft)
    render(<InvestigatorWizard campaignId="c1" step="identity" />)

    await userEvent.click(screen.getByRole('button', { name: 'Save and exit' }))

    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId',
      params: { campaignId: 'c1' },
      state: { statusMessage: 'Draft saved.' },
    })
  })

  it('"Back" saves and moves to the previous step even when the step has errors', async () => {
    withSheet(freshDraft)
    mockSave.mockResolvedValue({ ...freshDraft, validationErrors: [problem('CharacteristicRequired', 'characteristics.STR', 'Enter a value for STR.')] })
    render(<InvestigatorWizard campaignId="c1" step="characteristics" />)

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(navigateSpy).toHaveBeenCalledWith(expect.objectContaining({ params: { campaignId: 'c1', step: 'identity' } }))
  })

  it('UX-17: keeps every input after a failed save and offers "Try again"', async () => {
    withSheet(freshDraft)
    mockSave.mockRejectedValueOnce(new Error('Failed to save (500)')).mockResolvedValueOnce({ ...freshDraft, validationErrors: [] })
    render(<InvestigatorWizard campaignId="c1" step="identity" />)

    await userEvent.type(screen.getByLabelText('Investigator name'), 'Harvey')
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(await screen.findByText("We couldn't save your Investigator. Your changes are still here - try again.")).toBeInTheDocument()
    expect(screen.getByLabelText('Investigator name')).toHaveValue('Harvey')
    expect(navigateSpy).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(navigateSpy).toHaveBeenCalled())
  })

  it('announces "Some later steps need attention." when a save makes a later step need attention', async () => {
    const complete = myCharacterSheet({ characterSheet: sheetView(), validationErrors: [] })
    withSheet(complete)
    mockSave.mockResolvedValue({
      ...complete,
      validationErrors: [problem('EduImprovementCheckRequired', 'ageEffects.eduImprovementChecks[1].check', 'Enter the D100 roll for EDU check 2.')],
    })
    render(<InvestigatorWizard campaignId="c1" step="identity" />)

    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(navigateSpy).toHaveBeenCalledWith(expect.objectContaining({ state: { statusMessage: 'Some later steps need attention.' } }))
  })

  it('shows a client-side error when a field loses focus', async () => {
    withSheet(freshDraft)
    render(<InvestigatorWizard campaignId="c1" step="identity" />)

    await userEvent.type(screen.getByLabelText('Age'), '14')
    await userEvent.tab()

    expect(screen.getByLabelText('Age')).toHaveAccessibleDescription(
      "Age affects your characteristics. You'll see how in a later step. Age must be between 15 and 89.",
    )
  })

  it('does not re-check on blur when focus moves to a wizard action, so the action is not shifted away mid-click', async () => {
    withSheet(freshDraft)
    mockSave.mockReturnValue(new Promise(() => {}))
    render(<InvestigatorWizard campaignId="c1" step="identity" />)

    await userEvent.type(screen.getByLabelText('Age'), '14')
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(screen.getByLabelText('Age')).not.toHaveAttribute('aria-invalid')
    expect(mockSave).toHaveBeenCalled()
  })

  it("shows the Keeper's comment on every step while changes are requested, without Start over", () => {
    withSheet(myCharacterSheet({ status: 'ChangesRequested', changeRequestComment: 'Lower the Credit Rating' }))

    render(<InvestigatorWizard campaignId="c1" step="characteristics" />)

    expect(screen.getByRole('heading', { name: 'Your Keeper asked for changes' })).toBeInTheDocument()
    expect(screen.getByText('Lower the Credit Rating')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start over' })).not.toBeInTheDocument()
  })

  it('UX-16: "Start over" deletes the Draft and returns to the Campaign page with "Draft deleted."', async () => {
    withSheet(freshDraft)
    mockDelete.mockResolvedValue(undefined)
    render(<InvestigatorWizard campaignId="c1" step="identity" />)

    await userEvent.click(screen.getByRole('button', { name: 'Start over' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete draft' }))

    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith({
        to: '/campaigns/$campaignId',
        params: { campaignId: 'c1' },
        state: { statusMessage: 'Draft deleted.' },
      }),
    )
  })

  it('UX-11: "Submit to Keeper" with errors lists each error with a link to the step that owns it', async () => {
    withSheet(myCharacterSheet())
    mockSave.mockResolvedValue(myCharacterSheet())
    mockSubmit.mockResolvedValue({ kind: 'invalid', validationErrors: [nameError] })
    render(<InvestigatorWizard campaignId="c1" step="sheet" />)

    await userEvent.click(screen.getByRole('button', { name: 'Submit to Keeper' }))
    await userEvent.click(within(await screen.findByRole('alert')).getByRole('link', { name: "Enter your Investigator's name." }))

    expect(navigateSpy).toHaveBeenCalledWith(expect.objectContaining({ params: { campaignId: 'c1', step: 'identity' } }))
  })

  it('UX-11: a successful submit returns to the Campaign page with the submitted message', async () => {
    withSheet(myCharacterSheet())
    mockSave.mockResolvedValue(myCharacterSheet())
    mockSubmit.mockResolvedValue({ kind: 'submitted', investigator: { id: 'i1', status: 'Submitted' } })
    render(<InvestigatorWizard campaignId="c1" step="sheet" />)

    await userEvent.click(screen.getByRole('button', { name: 'Submit to Keeper' }))

    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId',
      params: { campaignId: 'c1' },
      state: { statusMessage: 'Submitted. Your Keeper will review your Investigator.' },
    }))
  })

  it('UX-27: records the Backstory, Key Connection, a Custom Weapon, and Gear, and saves them before submitting', async () => {
    withSheet(myCharacterSheet())
    mockSave.mockResolvedValue(myCharacterSheet())
    mockSubmit.mockResolvedValue({ kind: 'submitted', investigator: { id: 'i1', status: 'Submitted' } })
    render(<InvestigatorWizard campaignId="c1" step="sheet" />)

    await userEvent.type(screen.getByRole('textbox', { name: 'My story' }), 'Grew up above a bookshop.')
    await userEvent.type(screen.getByRole('textbox', { name: 'Significant people' }), 'My sister Ada')
    await userEvent.click(screen.getByRole('radio', { name: 'Significant people' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add weapon' }))
    await userEvent.type(screen.getByLabelText('Weapon 1 name'), 'Knife')
    await userEvent.type(screen.getByRole('textbox', { name: 'Gear and possessions' }), 'Lantern')
    await userEvent.click(screen.getByRole('button', { name: 'Submit to Keeper' }))

    await waitFor(() => expect(mockSubmit).toHaveBeenCalled())
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        backstory: expect.objectContaining({ myStory: 'Grew up above a bookshop.', significantPeople: 'My sister Ada' }),
        keyConnection: 'significantPeople',
        weapons: [expect.objectContaining({ name: 'Knife' })],
        gear: 'Lantern',
      }),
    )
    expect(mockSave.mock.invocationCallOrder[0]).toBeLessThan(mockSubmit.mock.invocationCallOrder[0])
  })

  it('a "Change" link on Sheet and submit saves the Backstory, weapons, and Gear before opening its step', async () => {
    withSheet(myCharacterSheet())
    mockSave.mockResolvedValue(myCharacterSheet())
    render(<InvestigatorWizard campaignId="c1" step="sheet" />)

    await userEvent.type(screen.getByRole('textbox', { name: 'Gear and possessions' }), 'Lantern')
    await userEvent.click(screen.getByRole('link', { name: 'Change identity' }))

    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith(expect.objectContaining({ params: { campaignId: 'c1', step: 'identity' } })))
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ gear: 'Lantern' }))
  })

  it('UX-29: lists every warning in "Worth checking" on Sheet and submit, and submits with them', async () => {
    const unspent = problem('PersonalInterestPointsUnspent', 'personalInterestPoints', 'You have 60 personal interest points left. Unspent points are lost.', 'Warning')
    const lowInt = problem('PointBuyBelowRecommendation', 'characteristics.INT', 'INT is below the recommended 40. Check with your Keeper.', 'Warning')
    withSheet(myCharacterSheet({ validationErrors: [unspent, lowInt] }))
    mockSave.mockResolvedValue(myCharacterSheet({ validationErrors: [unspent, lowInt] }))
    mockSubmit.mockResolvedValue({ kind: 'submitted', investigator: { id: 'i1', status: 'Submitted' } })
    render(<InvestigatorWizard campaignId="c1" step="sheet" />)

    const worthChecking = screen.getByText('Worth checking').parentElement!
    expect(within(worthChecking).getByText(unspent.message)).toBeInTheDocument()
    expect(within(worthChecking).getByText(lowInt.message)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Submit to Keeper' }))

    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith(expect.objectContaining({ to: '/campaigns/$campaignId' })))
  })

  it('UX-17: does not submit when saving before the submit fails, and "Try again" saves and submits', async () => {
    withSheet(myCharacterSheet())
    mockSave.mockRejectedValueOnce(new Error('Failed to save (500)')).mockResolvedValueOnce(myCharacterSheet())
    mockSubmit.mockResolvedValue({ kind: 'submitted', investigator: { id: 'i1', status: 'Submitted' } })
    render(<InvestigatorWizard campaignId="c1" step="sheet" />)

    await userEvent.click(screen.getByRole('button', { name: 'Submit to Keeper' }))

    expect(await screen.findByText("We couldn't save your Investigator. Your changes are still here - try again.")).toBeInTheDocument()
    expect(mockSubmit).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(mockSubmit).toHaveBeenCalled())
  })

  it('UX-11: a weapon without a name is listed in the error summary and its link focuses the name', async () => {
    const weaponError = problem('WeaponNameRequired', 'weapons[0].name', 'Enter a name for this weapon.')
    const unnamed = { name: null, skill: null, damage: null, attacks: null, range: null, ammo: null, malfunction: null, isCustom: true }
    const withWeapon = myCharacterSheet({ characterSheet: sheetView({ weapons: [unnamed] }), validationErrors: [weaponError] })
    withSheet(withWeapon)
    mockSave.mockResolvedValue(withWeapon)
    mockSubmit.mockResolvedValue({ kind: 'invalid', validationErrors: [weaponError] })
    render(<InvestigatorWizard campaignId="c1" step="sheet" />)

    await userEvent.click(screen.getByRole('button', { name: 'Submit to Keeper' }))
    await userEvent.click(within(await screen.findByRole('alert')).getByRole('link', { name: 'Enter a name for this weapon.' }))

    expect(screen.getByLabelText('Weapon 1 name')).toHaveFocus()
    expect(screen.getByLabelText('Weapon 1 name')).toHaveAttribute('aria-invalid', 'true')
  })

  it('links an Approved Investigator to its Clues, and a Submitted one to none (SPL-UX-31)', () => {
    withSheet(myCharacterSheet({ status: 'Approved' }))
    const { unmount } = render(<InvestigatorWizard campaignId="c1" step="identity" />)

    expect(screen.getByRole('link', { name: "Harvey Walters's Clues" })).toHaveAttribute('href', '/campaigns/c1/investigator/clues')
    unmount()

    withSheet(myCharacterSheet({ status: 'Submitted' }))
    render(<InvestigatorWizard campaignId="c1" step="identity" />)
    expect(screen.queryByRole('link', { name: /Clues/ })).not.toBeInTheDocument()
  })

  it('UX-12: opens a Submitted Investigator read-only, with no edit controls', () => {
    withSheet(myCharacterSheet({ status: 'Submitted' }))

    render(<InvestigatorWizard campaignId="c1" step="identity" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Harvey Walters' })).toBeInTheDocument()
    expect(screen.getByText('Submitted - waiting for your Keeper')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Investigator creation steps' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Change/ })).not.toBeInTheDocument()
  })

  it('UX-10: starts a new Draft on the only method the Campaign allows and saves it', async () => {
    withSheet(freshDraft)
    mockSave.mockResolvedValue(myCharacterSheet({ characterSheet: sheetView(), validationErrors: [] }))
    render(<InvestigatorWizard campaignId="c1" step="characteristics" />)

    expect(screen.getByText('Creation method: Point buy')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    expect(mockSave.mock.calls[0][0].creationMethod).toBe('PointBuy')
  })

  it('offers the creation method choice when the Campaign allows several', () => {
    allowing('StandardRolling', 'PointBuy', 'QuickFire')
    withSheet(myCharacterSheet({ characterSheet: emptySheetView() }))

    render(<InvestigatorWizard campaignId="c1" step="characteristics" />)

    expect(screen.getByRole('radiogroup', { name: 'Creation method' })).toBeInTheDocument()
  })

  it.each([
    ['occupation', 'Occupation', 'radio', /Antiquarian/],
    ['occupation-skills', 'Occupation skills', 'table', 'Occupation skills'],
    ['personal-interests', 'Personal interests', 'table', 'Personal interests'],
  ] as const)('shows the %s step', (step, title, role, name) => {
    withSheet(myCharacterSheet())

    render(<InvestigatorWizard campaignId="c1" step={step} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title)
    expect(screen.getByRole(role, { name })).toBeInTheDocument()
  })

  it('UX-31: confirming the roll saves first, then rolls, and announces the results', async () => {
    allowing('StandardRolling')
    const draft = myCharacterSheet({ characterSheet: { ...emptySheetView(), creationMethod: 'StandardRolling' }, validationErrors: [] })
    const rolled = myCharacterSheet({
      characterSheet: sheetView({ creationMethod: 'StandardRolling', characteristicRolls: {}, locks: { creationMethod: true, ageBracket: false, edu: false } }),
      validationErrors: [],
    })
    withSheet(draft)
    mockSave.mockResolvedValue(draft)
    mockRoll.mockResolvedValue(rolled)
    render(<InvestigatorWizard campaignId="c1" step="characteristics" />)

    await userEvent.click(screen.getByRole('button', { name: 'Roll characteristics' }))
    await userEvent.click(screen.getByRole('button', { name: 'Roll now' }))

    await waitFor(() => expect(mockRoll).toHaveBeenCalledTimes(1))
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('heading', { name: 'Your characteristics' })).toBeInTheDocument()
    expect(screen.getByText('Characteristics rolled.')).toBeInTheDocument()
  })

  it('UX-31: when the roll finds existing results, it reloads and says they were already rolled', async () => {
    allowing('StandardRolling')
    const draft = myCharacterSheet({ characterSheet: { ...emptySheetView(), creationMethod: 'StandardRolling' }, validationErrors: [] })
    const rolled = myCharacterSheet({
      characterSheet: sheetView({ creationMethod: 'StandardRolling', characteristicRolls: {}, locks: { creationMethod: true, ageBracket: false, edu: false } }),
      validationErrors: [],
    })
    const refetch = vi.fn().mockResolvedValue({ data: rolled })
    withSheet(draft, refetch)
    mockSave.mockResolvedValue(draft)
    mockRoll.mockRejectedValue(new InvestigatorConflictError())
    render(<InvestigatorWizard campaignId="c1" step="characteristics" />)

    await userEvent.click(screen.getByRole('button', { name: 'Roll characteristics' }))
    await userEvent.click(screen.getByRole('button', { name: 'Roll now' }))

    expect(await screen.findByText('Your characteristics were already rolled.')).toBeInTheDocument()
    expect(refetch).toHaveBeenCalled()
  })

  it('UX-35: when the roll conflicts with nothing rolled, it asks for a reload instead of retrying', async () => {
    allowing('StandardRolling')
    const draft = myCharacterSheet({ characterSheet: { ...emptySheetView(), creationMethod: 'StandardRolling' }, validationErrors: [] })
    withSheet(draft)
    mockSave.mockResolvedValue(draft)
    mockRoll.mockRejectedValue(new InvestigatorConflictError())
    render(<InvestigatorWizard campaignId="c1" step="characteristics" />)

    await userEvent.click(screen.getByRole('button', { name: 'Roll characteristics' }))
    await userEvent.click(screen.getByRole('button', { name: 'Roll now' }))

    expect(await screen.findByText("We couldn't roll your characteristics. Reload the page and try again.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('A11Y-12: the error summary link for a roll error focuses the roll action', async () => {
    allowing('StandardRolling')
    const rollError = problem('CharacteristicsRequired', 'characteristicRolls.STR', 'Roll your characteristics.')
    const draft = myCharacterSheet({
      characterSheet: { ...emptySheetView(), creationMethod: 'StandardRolling' },
      validationErrors: [rollError],
    })
    withSheet(draft)
    mockSave.mockResolvedValue(draft)
    render(<InvestigatorWizard campaignId="c1" step="characteristics" />)

    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))
    await userEvent.click(within(await screen.findByRole('alert')).getByRole('link', { name: 'Roll your characteristics.' }))

    expect(screen.getByRole('button', { name: 'Roll characteristics' })).toHaveFocus()
  })

  it('reloads and stays on the step with a notice when a move meets a conflict', async () => {
    const draft = myCharacterSheet({ characterSheet: sheetView(), validationErrors: [] })
    const refetch = vi.fn().mockResolvedValue({ data: draft })
    withSheet(draft, refetch)
    mockSave.mockRejectedValue(new InvestigatorConflictError())
    render(<InvestigatorWizard campaignId="c1" step="identity" />)

    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(await screen.findByText('Your Investigator changed elsewhere, so we reloaded it.')).toBeInTheDocument()
    expect(refetch).toHaveBeenCalled()
    expect(navigateSpy).not.toHaveBeenCalled()
  })

  it('UX-36: confirming the Luck roll saves first, then rolls, and announces the result', async () => {
    const draft = myCharacterSheet({ characterSheet: sheetView({ luckRolls: [] }), validationErrors: [] })
    const rolled = myCharacterSheet({ characterSheet: sheetView({ luckRolls: [11] }), validationErrors: [] })
    withSheet(draft)
    mockSave.mockResolvedValue(draft)
    mockRollLuck.mockResolvedValue(rolled)
    render(<InvestigatorWizard campaignId="c1" step="characteristics" />)

    await userEvent.click(screen.getByRole('button', { name: 'Roll Luck' }))
    await userEvent.click(screen.getByRole('button', { name: 'Roll now' }))

    await waitFor(() => expect(mockRollLuck).toHaveBeenCalledTimes(1))
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Luck rolled.')).toBeInTheDocument()
  })

  it('A11Y-12: the error summary link for a Luck error focuses the roll action', async () => {
    const luckError = problem('LuckRequired', 'luckRolls[0]', 'Roll your Luck.')
    const draft = myCharacterSheet({ characterSheet: sheetView({ luckRolls: [] }), validationErrors: [luckError] })
    withSheet(draft)
    mockSave.mockResolvedValue(draft)
    render(<InvestigatorWizard campaignId="c1" step="characteristics" />)

    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))
    await userEvent.click(within(await screen.findByRole('alert')).getByRole('link', { name: 'Roll your Luck.' }))

    expect(screen.getByRole('button', { name: 'Roll Luck' })).toHaveFocus()
  })

  it('UX-37: confirming the EDU check roll saves first, then rolls, and announces the result', async () => {
    const draft = myCharacterSheet({
      characterSheet: sheetView({
        identity: { ...validInputs.identity, age: 45 },
        ageEffects: { bracket: bracket45, deductions: {}, eduImprovementChecks: [] },
        luckRolls: [11],
      }),
      validationErrors: [],
    })
    const rolled = myCharacterSheet({
      characterSheet: sheetView({
        identity: { ...validInputs.identity, age: 45 },
        luckRolls: [11],
      }),
      validationErrors: [],
    })
    withSheet(draft)
    mockSave.mockResolvedValue(draft)
    mockRollEdu.mockResolvedValue(rolled)
    render(<InvestigatorWizard campaignId="c1" step="age" />)

    await userEvent.click(screen.getByRole('button', { name: 'Roll EDU check 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Roll now' }))

    await waitFor(() => expect(mockRollEdu).toHaveBeenCalledTimes(1))
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('EDU check 1 rolled.')).toBeInTheDocument()
  })

  it('A11Y-12: the error summary link for an EDU check error focuses the roll action', async () => {
    const eduError = problem('EduImprovementCheckRequired', 'ageEffects.eduImprovementChecks[0].check', 'Roll EDU check 1.')
    const draft = myCharacterSheet({
      characterSheet: sheetView({
        identity: { ...validInputs.identity, age: 45 },
        ageEffects: { bracket: bracket45, deductions: {}, eduImprovementChecks: [] },
        luckRolls: [11],
      }),
      validationErrors: [eduError],
    })
    withSheet(draft)
    mockSave.mockResolvedValue(draft)
    render(<InvestigatorWizard campaignId="c1" step="age" />)

    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))
    await userEvent.click(within(await screen.findByRole('alert')).getByRole('link', { name: 'Roll EDU check 1.' }))

    expect(screen.getByRole('button', { name: 'Roll EDU check 1' })).toHaveFocus()
  })

  it('saves the occupation picked on the Occupation step', async () => {
    withSheet(myCharacterSheet())
    mockSave.mockResolvedValue(myCharacterSheet())
    render(<InvestigatorWizard campaignId="c1" step="occupation" />)

    await userEvent.click(screen.getByRole('radio', { name: /Police Detective/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    expect(mockSave.mock.calls[0][0].occupation.catalogId).toBe('police-detective')
    expect(mockSave.mock.calls[0][0].skills).toEqual(validInputs.skills)
  })
})
