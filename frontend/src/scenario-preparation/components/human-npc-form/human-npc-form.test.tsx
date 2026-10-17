import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { gangsterHumanNpc, knottHumanNpc, thugHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'
import type { HumanNpcInput, ValidationProblem } from '@/scenario-preparation/types/HumanNpc'

import { HumanNpcForm } from './human-npc-form'

// specs/scenario-preparation/ux.md sections 25.2 and 25.4; SP-UX-33, SP-UX-34, SP-UX-35, SP-UX-40, SP-UX-43, SP-A11Y-18 to SP-A11Y-24.

const { mockUseSkillCatalog, mockUseOccupationCatalog } = vi.hoisted(() => ({ mockUseSkillCatalog: vi.fn(), mockUseOccupationCatalog: vi.fn() }))

vi.mock('@/campaign-play/hooks/useRuleData', () => ({ useSkillCatalog: mockUseSkillCatalog, useOccupationCatalog: mockUseOccupationCatalog }))

function show(overrides: Partial<React.ComponentProps<typeof HumanNpcForm>> = {}) {
  const props = {
    campaignId: 'c1',
    humanNpc: knottHumanNpc,
    pending: false,
    problems: [] as ValidationProblem[],
    failureMessage: null,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
  const view = render(<HumanNpcForm {...props} />)
  return { ...props, ...view }
}

const submitted = (onSubmit: unknown): HumanNpcInput => (onSubmit as { mock: { calls: unknown[][] } }).mock.calls[0][0] as HumanNpcInput

describe('HumanNpcForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSkillCatalog.mockReturnValue({ data: undefined, isError: false, refetch: vi.fn() })
    mockUseOccupationCatalog.mockReturnValue({ data: { occupations: [{ name: 'Antiquarian' }, { name: 'Landlord' }] } })
  })

  it('is prefilled, starts on the Name field, and offers the Era Occupations as suggestions (SP-A11Y-22)', () => {
    const { container } = show()

    expect(screen.getByLabelText('Name')).toHaveValue('Mr. Knott')
    expect(screen.getByLabelText('Name')).toHaveFocus()
    expect(screen.getByLabelText('Age')).toHaveValue(62)
    expect(screen.getByLabelText('Profession or role')).toHaveValue('Landlord')
    expect(screen.getByText('Choose a suggestion or type your own.')).toBeInTheDocument()
    expect(screen.getByText('Any age from 0 to 150.')).toBeInTheDocument()
    expect([...container.querySelectorAll('datalist option')].map((option) => option.getAttribute('value'))).toEqual(['Antiquarian', 'Landlord'])
  })

  it('shows Details and Keeper notes as fieldsets and the narrative labels without "NPC" alone (SP-A11Y-18)', () => {
    show()

    expect(screen.getByRole('group', { name: 'Details' })).toBeInTheDocument()
    for (const label of ['Short description', 'Goal', 'Relationship to the Investigators', 'What the Human NPC knows', 'What the Human NPC hides', 'Behavior cue']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.getByText('Keeper notes')).toBeInTheDocument()
  })

  it('offers one Add button per section not added in the "Add a section" group (SP-UX-33)', () => {
    show()

    const group = screen.getByRole('group', { name: 'Add a section' })
    expect(within(group).getAllByRole('button').map((button) => button.textContent)).toEqual(['Add Characteristics', 'Add Skills', 'Add Combat', 'Add Spells'])
  })

  it('checks only Name and Age on the client and focuses the first invalid field (ux 25.2)', async () => {
    const { onSubmit } = show()

    await userEvent.clear(screen.getByLabelText('Name'))
    await userEvent.clear(screen.getByLabelText('Age'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Enter a name.')).toBeInTheDocument()
    expect(screen.getByText('Enter an age.')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveFocus()
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
  })

  it('saves the edited profile as a request without derived values', async () => {
    const { onSubmit } = show()

    await userEvent.type(screen.getByLabelText('Goal'), ' now')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const input = submitted(onSubmit)
    expect(input).toMatchObject({ name: 'Mr. Knott', age: 62, characteristics: null, skills: null, combat: null, spells: null })
    expect(input.details.goal).toBe('Rent the Corbitt House now')
    expect(JSON.stringify(input)).not.toMatch(/difficulty|derived/i)
  })

  it('adds a section in its fixed position, focuses its first field, announces it, and drops its button (SP-UX-33, SP-A11Y-22, SP-A11Y-23)', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Add Characteristics' }))

    expect(screen.getByRole('group', { name: 'Characteristics' })).toBeInTheDocument()
    expect(screen.getByLabelText('STR Strength')).toHaveFocus()
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Characteristics section added.')
    expect(screen.queryByRole('button', { name: 'Add Characteristics' })).not.toBeInTheDocument()
  })

  it('keeps sections in their fixed order whatever order they were added in', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Add Spells' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add Characteristics' }))

    const legends = screen.getAllByRole('group').map((group) => group.querySelector('legend')?.textContent)
    expect(legends.filter((legend) => legend === 'Characteristics' || legend === 'Spells')).toEqual(['Characteristics', 'Spells'])
  })

  it('removes an empty section at once and puts focus on its Add button (SP-A11Y-22)', async () => {
    show()
    await userEvent.click(screen.getByRole('button', { name: 'Add Skills' }))

    await userEvent.click(screen.getByRole('button', { name: 'Remove Skills section' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Skills' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Skills' })).toHaveFocus()
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Skills section removed.')
  })

  it('asks before removing a section with values, keeps it on "Keep section", and removes it on confirmation (SP-UX-33)', async () => {
    const { onSubmit } = show({ humanNpc: gangsterHumanNpc })

    await userEvent.click(screen.getByRole('button', { name: 'Remove Spells section' }))
    expect(screen.getByRole('alertdialog', { name: 'Remove the Spells section?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Keep section' }))
    expect(screen.getByRole('group', { name: 'Spells' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remove Spells section' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove section' }))
    expect(screen.queryByRole('group', { name: 'Spells' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(submitted(onSubmit).spells).toBeNull()
  })

  it('adds a skill row, focuses its first field, and includes unsaved skills as weapon skills (SP-UX-44)', async () => {
    show({ humanNpc: { ...gangsterHumanNpc, skills: [], combat: { ...gangsterHumanNpc.combat!, weapons: [] } } })

    await userEvent.click(screen.getByRole('button', { name: 'Add skill' }))
    expect(within(screen.getByRole('group', { name: 'Skill 1' })).getByLabelText('Skill')).toHaveFocus()
    await userEvent.type(screen.getByLabelText('Skill'), 'Throw')
    await userEvent.click(screen.getByRole('button', { name: 'Add weapon' }))
    await userEvent.click(within(screen.getByRole('group', { name: 'Weapon 1' })).getByRole('combobox', { name: 'Skill' }))

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Throw'])
  })

  it('lists server problems in an error summary that takes focus, with one link per problem to its field (SP-UX-35, SP-A11Y-20)', async () => {
    const problems: ValidationProblem[] = [
      { path: 'characteristics.str', messages: ['Enter STR from 0 to 100.'] },
      { path: 'combat.weapons[1].damage', messages: ['Enter the damage.'] },
    ]
    show({ humanNpc: gangsterHumanNpc, problems })

    const summary = screen.getByRole('alert')
    expect(summary).toHaveFocus()
    expect(within(summary).getByRole('heading', { name: 'There are 2 problems' })).toBeInTheDocument()
    expect(screen.getAllByText('Enter STR from 0 to 100.')).toHaveLength(2)
    await userEvent.click(within(summary).getByRole('link', { name: 'Enter the damage.' }))
    expect(within(screen.getByRole('group', { name: 'Weapon 2' })).getByLabelText('Damage')).toHaveFocus()
    expect(screen.getByLabelText('STR Strength')).toHaveAttribute('aria-invalid', 'true')
  })

  it('opens a weapon\'s "More details" for a server problem so the summary link reaches a visible field (SP-UX-43)', () => {
    show({
      humanNpc: gangsterHumanNpc,
      problems: [{ path: 'combat.weapons[1].ammunition', messages: ['Ammunition must be 1,000 characters or fewer.'] }],
    })

    expect(screen.getByRole('button', { name: 'More details for Fists' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Ammunition', { selector: '#field-combat-weapons-1-ammunition' })).toBeVisible()
  })

  it('disables Save and reads "Saving..." while the request is in flight (SP-UX-40)', () => {
    show({ pending: true })

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
  })

  it('shows a failure alert and keeps the typed values', () => {
    show({ failureMessage: "We couldn't save the Human NPC. Try again." })

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't save the Human NPC. Try again.")
    expect(screen.getByLabelText('Name')).toHaveValue('Mr. Knott')
  })

  it('cancels without confirmation', async () => {
    const { onCancel } = show({ humanNpc: thugHumanNpc })

    await userEvent.type(screen.getByLabelText('Goal'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalled()
  })

  it('keeps the Save and Cancel bar sticky (SP-A11Y-24)', () => {
    show()

    expect(screen.getByRole('button', { name: 'Save' }).parentElement).toHaveClass('sticky', 'bottom-0')
  })
})
