import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { SkillCatalog } from '@/campaign-play/types/RuleData'
import { NoActiveSceneError } from '@/scene-play/services/activeSceneApi'
import { RollRequestRefusedError } from '@/roll-requests/services/rollRequestApi'

import { RollRequestForm } from './roll-request-form'

// specs/roll-requests/ux.md section 3; RR-UX-2 to RR-UX-6, RR-A11Y-1 to RR-A11Y-4.
const { mockUseSkillCatalog, mockMutate } = vi.hoisted(() => ({ mockUseSkillCatalog: vi.fn(), mockMutate: vi.fn() }))

vi.mock('@/campaign-play/hooks/useRuleData', () => ({ useSkillCatalog: mockUseSkillCatalog }))
vi.mock('@/roll-requests/hooks/useRollRequests', () => ({ useRequestRoll: () => ({ mutate: mockMutate, isPending: false }) }))

const catalog: SkillCatalog = {
  era: '1920s',
  skills: [
    { skill: 'Fighting', specialization: null, base: { kind: 'fixed', value: 25 } },
    { skill: 'Language', specialization: null, base: { kind: 'fixed', value: 1 } },
    { skill: 'Listen', specialization: null, base: { kind: 'fixed', value: 20 } },
    { skill: 'Spot Hidden', specialization: null, base: { kind: 'fixed', value: 25 } },
  ],
  closedFamilies: [
    {
      skill: 'Fighting',
      specializations: [
        { specialization: 'Brawl', base: { kind: 'fixed', value: 25 } },
        { specialization: 'Sword', base: { kind: 'fixed', value: 20 } },
      ],
    },
  ],
  openFamilies: ['Language'],
  specializationSuggestions: { Language: ['Latin'] },
}

const investigators = [
  { id: 'i1', name: 'Harvey Walters' },
  { id: 'i2', name: 'Lucy Ward' },
  { id: 'i3', name: 'Cy Holloway' },
]

function setup(props: Partial<React.ComponentProps<typeof RollRequestForm>> = {}) {
  mockUseSkillCatalog.mockReturnValue({ data: catalog, isPending: false, isError: false, refetch: vi.fn() })
  mockMutate.mockClear()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  const onRequested = vi.fn()
  const onNoActiveScene = vi.fn()
  render(<RollRequestForm campaignId="c1" investigators={investigators} onRequested={onRequested} onNoActiveScene={onNoActiveScene} {...props} />, { wrapper })
  return { onRequested, onNoActiveScene }
}

async function chooseTarget(name: string) {
  await userEvent.click(screen.getByRole('combobox', { name: 'What to roll' }))
  await userEvent.click(screen.getByRole('option', { name }))
}

describe('RollRequestForm', () => {
  it('is a form labelled by its "Request a roll" heading, defaulting to the first skill (RR-UX-2, RR-A11Y-1)', () => {
    setup()

    const form = screen.getByRole('form', { name: 'Request a roll' })
    expect(within(form).getByRole('heading', { level: 2, name: 'Request a roll' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'What to roll' })).toHaveTextContent('Fighting')
    expect(screen.getByRole('group', { name: 'For everyone' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Who rolls' })).toBeInTheDocument()
  })

  it('asks for the specialization of a specialized skill and stays disabled until it is given (RR-UX-2)', async () => {
    setup()

    await chooseTarget('Language')
    expect(screen.getByRole('textbox', { name: 'Language' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Harvey Walters' }))
    expect(screen.getByRole('button', { name: 'Request roll' })).toBeDisabled()

    await userEvent.type(screen.getByRole('textbox', { name: 'Language' }), 'Latin')
    expect(screen.getByRole('button', { name: 'Request roll' })).toBeEnabled()
  })

  it('offers the closed family specializations as a list (RR-UX-2)', async () => {
    setup()

    await chooseTarget('Fighting')

    await userEvent.click(screen.getByRole('combobox', { name: 'Fighting specialization' }))
    expect(screen.getByRole('option', { name: 'Brawl' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sword' })).toBeInTheDocument()
  })

  it('disables Difficulty and both dice with the Luck hint while Luck is chosen, hiding the per-Investigator changes (RR-UX-3, RR-A11Y-2)', async () => {
    setup()

    await chooseTarget('Luck')

    const everyone = screen.getByRole('group', { name: 'For everyone' })
    expect(everyone).toHaveAttribute('aria-describedby', expect.stringContaining('luck'))
    expect(screen.getByText('Luck rolls are always Regular, with no Bonus or Penalty Dice.')).toBeInTheDocument()
    expect(within(everyone).getByRole('radio', { name: 'Regular' })).toBeDisabled()
    expect(within(everyone).getByRole('combobox', { name: 'Bonus Dice' })).toBeDisabled()
    expect(within(everyone).getByRole('combobox', { name: 'Penalty Dice' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Harvey Walters' }))
    expect(screen.queryByRole('button', { name: /Change Difficulty and dice/ })).not.toBeInTheDocument()
  })

  it('shows the checked rows with their effective dice and reads "Request roll from {n}" with several checked (RR-UX-4, RR-UX-5)', async () => {
    setup()

    await chooseTarget('Spot Hidden')
    await userEvent.click(screen.getByRole('radio', { name: 'Hard' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Harvey Walters' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Lucy Ward' }))

    expect(screen.getAllByText('Hard . no Bonus or Penalty Dice')).toHaveLength(2)
    expect(screen.queryByText('Choose at least one Investigator.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request roll from 2' })).toBeEnabled()
  })

  it('is disabled with the "Choose at least one Investigator." hint while none is checked (RR-UX-5)', () => {
    setup()

    const submit = screen.getByRole('button', { name: 'Request roll' })
    expect(submit).toBeDisabled()
    const hint = screen.getByText('Choose at least one Investigator.')
    expect(submit).toHaveAttribute('aria-describedby', hint.id)
  })

  it('changes only one row and marks it "(changed)"; "Use the defaults" restores it (RR-UX-4)', async () => {
    setup()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Harvey Walters' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Lucy Ward' }))
    await userEvent.click(screen.getByRole('button', { name: 'Change Difficulty and dice for Lucy Ward' }))

    const group = screen.getByRole('group', { name: 'Changes for Lucy Ward' })
    await userEvent.click(within(group).getByRole('combobox', { name: 'Penalty Dice' }))
    await userEvent.click(screen.getByRole('option', { name: '1' }))

    expect(screen.getByText('Regular . 1 Penalty Die (changed)')).toBeInTheDocument()
    expect(screen.getByText('Regular . no Bonus or Penalty Dice')).toBeInTheDocument()

    await userEvent.click(within(group).getByRole('button', { name: 'Use the defaults' }))
    expect(screen.queryByText(/\(changed\)/)).not.toBeInTheDocument()
  })

  it('requests with defaults and overrides, then clears and announces while keeping the target (RR-UX-6, RR-A11Y-4)', async () => {
    mockMutate.mockImplementation((_input: unknown, options: { onSuccess: () => void }) => options.onSuccess())
    const { onRequested } = setup()

    await chooseTarget('Language')
    await userEvent.type(screen.getByRole('textbox', { name: 'Language' }), 'Latin')
    await userEvent.type(screen.getByRole('textbox', { name: 'Message (optional)' }), 'Something moves upstairs.')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Harvey Walters' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Lucy Ward' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Cy Holloway' }))
    await userEvent.click(screen.getByRole('button', { name: 'Request roll from 3' }))

    expect(mockMutate).toHaveBeenCalledWith(
      {
        target: { kind: 'Skill', skill: 'Language', specialization: 'Latin', characteristic: null },
        message: 'Something moves upstairs.',
        difficulty: 'Regular',
        bonusDice: 0,
        penaltyDice: 0,
        investigators: [{ investigatorId: 'i1' }, { investigatorId: 'i2' }, { investigatorId: 'i3' }],
      },
      expect.anything(),
    )
    expect(onRequested).toHaveBeenCalledWith('Language (Latin) roll requested from Harvey Walters, Lucy Ward and Cy Holloway.')
    expect(screen.getByRole('checkbox', { name: 'Harvey Walters' })).not.toBeChecked()
    expect(screen.getByRole('textbox', { name: 'Message (optional)' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'What to roll' })).toHaveTextContent('Language')
    expect(screen.getByRole('combobox', { name: 'What to roll' })).toHaveFocus()
  })

  it('shows the refusal reason inline and keeps every choice on a 400 (RR-UX-6)', async () => {
    mockMutate.mockImplementation((_input: unknown, options: { onError: (error: Error) => void }) =>
      options.onError(new RollRequestRefusedError('an Investigator is no longer present.')),
    )
    setup()

    await chooseTarget('Spot Hidden')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Harvey Walters' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Message (optional)' }), 'Something moves upstairs.')
    await userEvent.click(screen.getByRole('button', { name: 'Request roll' }))

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't request that roll: an Investigator is no longer present.")
    expect(screen.getByRole('checkbox', { name: 'Harvey Walters' })).toBeChecked()
    expect(screen.getByRole('textbox', { name: 'Message (optional)' })).toHaveValue('Something moves upstairs.')
  })

  it('hands a finished Scene to the page on a 409 (RR-UX-6)', async () => {
    mockMutate.mockImplementation((_input: unknown, options: { onError: (error: Error) => void }) => options.onError(new NoActiveSceneError()))
    const { onNoActiveScene } = setup()

    await chooseTarget('Spot Hidden')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Harvey Walters' }))
    await userEvent.click(screen.getByRole('button', { name: 'Request roll' }))

    expect(onNoActiveScene).toHaveBeenCalled()
  })

  it('refuses a message over 2000 characters and disables the submit (RR-UX-2 message rule)', async () => {
    setup()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Harvey Walters' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Message (optional)' }), { target: { value: 'x'.repeat(2001) } })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Harvey Walters' }))

    expect(screen.getByText('Messages can be at most 2000 characters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request roll' })).toBeDisabled()
  })
})
