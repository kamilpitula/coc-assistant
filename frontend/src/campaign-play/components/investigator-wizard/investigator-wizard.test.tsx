import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  emptySheetView,
  myCharacterSheet,
  problem,
  sheetView,
} from '@/campaign-play/test-support/characterSheetFixtures'
import type { MyCharacterSheet } from '@/campaign-play/types/Investigator'
import { navigateSpy, routerState } from '@/shared/test-support/routerMock'

import { InvestigatorWizard } from './investigator-wizard'

const { mockUseSheet, mockSave, mockSubmit, mockDelete } = vi.hoisted(() => ({
  mockUseSheet: vi.fn(),
  mockSave: vi.fn(),
  mockSubmit: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useMyInvestigator', () => ({
  useMyCharacterSheet: mockUseSheet,
  useSaveCharacterSheet: () => ({ mutateAsync: mockSave, isPending: false }),
  useSubmitInvestigator: () => ({ mutateAsync: mockSubmit, isPending: false }),
  useDeleteInvestigator: () => ({ mutateAsync: mockDelete, isPending: false }),
}))

function withSheet(sheet: MyCharacterSheet | null) {
  mockUseSheet.mockReturnValue({ data: sheet, isPending: false, isError: false, refetch: vi.fn() })
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
    mockSubmit.mockResolvedValue({ kind: 'invalid', validationErrors: [nameError] })
    render(<InvestigatorWizard campaignId="c1" step="sheet" />)

    await userEvent.click(screen.getByRole('button', { name: 'Submit to Keeper' }))
    await userEvent.click(within(await screen.findByRole('alert')).getByRole('link', { name: "Enter your Investigator's name." }))

    expect(navigateSpy).toHaveBeenCalledWith(expect.objectContaining({ params: { campaignId: 'c1', step: 'identity' } }))
  })

  it('UX-11: a successful submit returns to the Campaign page with the submitted message', async () => {
    withSheet(myCharacterSheet())
    mockSubmit.mockResolvedValue({ kind: 'submitted', investigator: { id: 'i1', status: 'Submitted' } })
    render(<InvestigatorWizard campaignId="c1" step="sheet" />)

    await userEvent.click(screen.getByRole('button', { name: 'Submit to Keeper' }))

    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId',
      params: { campaignId: 'c1' },
      state: { statusMessage: 'Submitted. Your Keeper will review your Investigator.' },
    })
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
})
