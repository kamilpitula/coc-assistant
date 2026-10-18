import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  bareMythosCreature,
  dissolvingGhoul,
  ghoulMythosCreature,
  narrativeGhoul,
  overriddenGhoul,
} from '@/scenario-preparation/test-support/mythosCreatureFixtures'
import type { MythosCreatureInput } from '@/scenario-preparation/types/MythosCreature'
import type { ValidationProblem } from '@/scenario-preparation/types/ValidationProblem'

import { MythosCreatureForm } from './mythos-creature-form'

// specs/scenario-preparation/ux.md sections 25.2 and 25.5; SP-UX-33 to SP-UX-35, SP-UX-40, SP-UX-45 to SP-UX-47, SP-A11Y-18 to SP-A11Y-24, SP-A11Y-28.

const { mockUseSkillCatalog } = vi.hoisted(() => ({ mockUseSkillCatalog: vi.fn() }))

vi.mock('@/campaign-play/hooks/useRuleData', () => ({ useSkillCatalog: mockUseSkillCatalog }))

function show(overrides: Partial<React.ComponentProps<typeof MythosCreatureForm>> = {}) {
  const props = {
    campaignId: 'c1',
    mythosCreature: bareMythosCreature,
    pending: false,
    problems: [] as ValidationProblem[],
    failureMessage: null,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
  const view = render(<MythosCreatureForm {...props} />)
  return { ...props, ...view }
}

const submitted = (onSubmit: unknown): MythosCreatureInput => (onSubmit as { mock: { calls: unknown[][] } }).mock.calls[0][0] as MythosCreatureInput

const indexLinks = () =>
  within(screen.getByRole('navigation', { name: 'On this page' }))
    .getAllByRole('link')
    .map((link) => link.textContent)

describe('MythosCreatureForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSkillCatalog.mockReturnValue({ data: undefined, isError: false, refetch: vi.fn() })
  })

  it('is prefilled, starts on the Name field, and shows Details and Keeper notes as fieldsets (SP-A11Y-18, SP-A11Y-22)', () => {
    show({ mythosCreature: narrativeGhoul })

    expect(screen.getByLabelText('Name')).toHaveValue('Ghoul')
    expect(screen.getByLabelText('Name')).toHaveFocus()
    expect(screen.getByRole('group', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Keeper notes' })).toBeInTheDocument()
    expect(screen.getByLabelText('Origin')).toHaveValue('Crypts under Arkham')
    for (const label of ['Description and sensory cues', 'Origin', 'Goal and typical behavior', 'Signs and traces', 'Defeat outcome', 'Specimen range notes']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.getByLabelText('Defeat outcome')).toHaveAccessibleDescription('What happens at zero Hit Points or when it loses a conflict.')
  })

  it('offers the Creature Kind as Not set or one of four, with the no-game-effect hint, and sends the choice', async () => {
    const { onSubmit } = show({ mythosCreature: narrativeGhoul })
    const kind = screen.getByLabelText('Creature Kind')
    expect(kind).toHaveTextContent('Mythos')
    expect(kind).toHaveAccessibleDescription('It only organizes your profiles and has no game effect.')

    await userEvent.click(kind)
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Not set', 'Beast', 'Folklore', 'Mythos', 'Unique'])
    await userEvent.click(screen.getByRole('option', { name: 'Folklore' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(submitted(onSubmit).details.creatureKind).toBe('Folklore')
  })

  it('sends null for Not set', async () => {
    const { onSubmit } = show({ mythosCreature: narrativeGhoul })

    await userEvent.click(screen.getByLabelText('Creature Kind'))
    await userEvent.click(screen.getByRole('option', { name: 'Not set' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(submitted(onSubmit).details.creatureKind).toBeNull()
  })

  it('offers one Add button per section not added in the "Add a section" group (SP-UX-33)', () => {
    show({ mythosCreature: narrativeGhoul })

    const group = screen.getByRole('group', { name: 'Add a section' })
    expect(within(group).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Add Characteristics',
      'Add Movement',
      'Add Combat',
      'Add Defenses',
      'Add Skills',
      'Add Spells',
      'Add Powers',
      'Add Sanity loss',
    ])
  })

  it('shows the section index under the header and lets a link move focus to its section (SP-UX-45, SP-A11Y-28)', async () => {
    show({ mythosCreature: ghoulMythosCreature })

    expect(indexLinks()).toEqual(['Details', 'Characteristics', 'Movement', 'Combat', 'Defenses', 'Skills', 'Spells', 'Powers', 'Sanity loss', 'Keeper notes'])
    await userEvent.click(within(screen.getByRole('navigation', { name: 'On this page' })).getByRole('link', { name: 'Combat' }))

    expect(screen.getByRole('group', { name: 'Combat' })).toHaveFocus()
  })

  it('keeps the section index in step with the sections added and removed (SP-UX-45)', async () => {
    show({ mythosCreature: narrativeGhoul })
    expect(indexLinks()).toEqual(['Details', 'Keeper notes'])

    await userEvent.click(screen.getByRole('button', { name: 'Add Sanity loss' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add Characteristics' }))
    expect(indexLinks()).toEqual(['Details', 'Characteristics', 'Sanity loss', 'Keeper notes'])

    await userEvent.click(screen.getByRole('button', { name: 'Remove Sanity loss section' }))
    expect(indexLinks()).toEqual(['Details', 'Characteristics', 'Keeper notes'])
  })

  it('checks only the Name on the client and focuses it (ux 25.2)', async () => {
    const { onSubmit } = show({ mythosCreature: narrativeGhoul })

    await userEvent.clear(screen.getByLabelText('Name'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Enter a name.')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveFocus()
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
  })

  it('saves the edited profile as a request without difficulty or derived values', async () => {
    const { onSubmit } = show({ mythosCreature: ghoulMythosCreature })

    await userEvent.type(screen.getByLabelText('Origin'), ' and tunnels')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const input = submitted(onSubmit)
    expect(input).toMatchObject({ name: 'Ghoul' })
    expect(input.details.origin).toBe('Crypts under Arkham and tunnels')
    expect(input.characteristics?.values.STR).toBe(80)
    expect(input.sanityLoss).toEqual({ value: '0/1D6' })
    expect(JSON.stringify(input)).not.toMatch(/difficulty|derived/i)
  })

  it('adds a section, focuses its first field, announces it, and drops its button (SP-UX-33, SP-A11Y-22, SP-A11Y-23)', async () => {
    show({ mythosCreature: narrativeGhoul })

    await userEvent.click(screen.getByRole('button', { name: 'Add Characteristics' }))

    expect(screen.getByRole('group', { name: 'Characteristics' })).toBeInTheDocument()
    expect(screen.getByLabelText('STR Strength')).toHaveFocus()
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Characteristics section added.')
    expect(screen.queryByRole('button', { name: 'Add Characteristics' })).not.toBeInTheDocument()
  })

  it('keeps sections in their fixed order whatever order they were added in', async () => {
    show({ mythosCreature: narrativeGhoul })

    await userEvent.click(screen.getByRole('button', { name: 'Add Powers' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add Movement' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add Combat' }))

    const legends = screen.getAllByRole('group').map((group) => group.querySelector(':scope > legend')?.textContent)
    expect(legends.filter((legend) => ['Movement', 'Combat', 'Powers'].includes(legend ?? ''))).toEqual(['Movement', 'Combat', 'Powers'])
  })

  it('removes an empty section at once and puts focus on its Add button (SP-A11Y-22)', async () => {
    show({ mythosCreature: narrativeGhoul })
    await userEvent.click(screen.getByRole('button', { name: 'Add Skills' }))

    await userEvent.click(screen.getByRole('button', { name: 'Remove Skills section' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Skills' })).toHaveFocus()
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Skills section removed.')
  })

  it('asks before removing a section with values, keeps it on "Keep section", and removes it on confirmation (SP-UX-33)', async () => {
    const { onSubmit } = show({ mythosCreature: ghoulMythosCreature })

    await userEvent.click(screen.getByRole('button', { name: 'Remove Powers section' }))
    expect(screen.getByRole('alertdialog', { name: 'Remove the Powers section?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Keep section' }))
    expect(screen.getByRole('group', { name: 'Powers' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remove Powers section' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove section' }))
    expect(screen.queryByRole('group', { name: 'Powers' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(submitted(onSubmit).powers).toBeNull()
  })

  it('adds an attack prefilled with Fighting and focuses its name, then saves it (SP-UX-34)', async () => {
    const { onSubmit } = show({ mythosCreature: narrativeGhoul })
    await userEvent.click(screen.getByRole('button', { name: 'Add Combat' }))

    await userEvent.click(screen.getByRole('button', { name: 'Add attack' }))
    const attack = screen.getByRole('group', { name: 'Attack 1' })
    expect(within(attack).getByLabelText('Name')).toHaveFocus()
    expect(within(attack).getByLabelText('Skill')).toHaveValue('Fighting')
    await userEvent.type(within(attack).getByLabelText('Name'), 'Claw')
    await userEvent.type(within(attack).getByLabelText('Value'), '40')
    await userEvent.type(within(attack).getByLabelText('Damage'), '1D6+DB')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(submitted(onSubmit).combat?.attacks).toEqual([{ name: 'Claw', skill: 'Fighting', skillValue: 40, damage: '1D6+DB', effect: null, manoeuvre: false }])
  })

  it('offers the Era skills as suggestions in the Skills section', async () => {
    mockUseSkillCatalog.mockReturnValue({ data: { skills: [{ skill: 'Stealth' }], closedFamilies: [] }, isError: false, refetch: vi.fn() })
    const { container } = show({ mythosCreature: narrativeGhoul })

    await userEvent.click(screen.getByRole('button', { name: 'Add Skills' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add skill' }))

    expect([...container.querySelectorAll('datalist option')].map((option) => option.getAttribute('value'))).toEqual(['Stealth'])
  })

  it('saves a Hit Points override with its reason and sends Hit Points not applicable on its own (SP-UX-46)', async () => {
    const { onSubmit } = show({ mythosCreature: overriddenGhoul })
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(submitted(onSubmit).characteristics?.overrides.hitPoints).toEqual({ value: 40, reason: 'Swollen with stolen life' })
  })

  it('shows Hit Points not applicable as chosen and sends the flag (SP-UX-46)', async () => {
    const { onSubmit } = show({ mythosCreature: dissolvingGhoul })

    expect(screen.getByRole('radio', { name: 'Not applicable' })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(submitted(onSubmit).characteristics).toMatchObject({ hitPointsNotApplicable: true })
  })

  it('lists server problems in an error summary that takes focus, with one link per problem to its field (SP-UX-35, SP-A11Y-20)', async () => {
    const problems: ValidationProblem[] = [
      { path: 'characteristics.values.str', messages: ['Enter STR from 0 to 2,000.'] },
      { path: 'combat.attacks[1].damage', messages: ['Enter the damage, or mark the attack as a manoeuvre.'] },
    ]
    show({ mythosCreature: ghoulMythosCreature, problems })

    const summary = screen.getByRole('alert')
    expect(summary).toHaveFocus()
    expect(within(summary).getByRole('heading', { name: 'There are 2 problems' })).toBeInTheDocument()
    expect(screen.getAllByText('Enter STR from 0 to 2,000.')).toHaveLength(2)
    await userEvent.click(within(summary).getByRole('link', { name: 'Enter the damage, or mark the attack as a manoeuvre.' }))
    expect(within(screen.getByRole('group', { name: 'Attack 2' })).getByLabelText('Damage')).toHaveFocus()
    expect(screen.getByLabelText('STR Strength')).toHaveAttribute('aria-invalid', 'true')
  })

  it("opens an attack's More details for a server problem so the summary link reaches a visible field (SP-UX-47)", () => {
    const quiet = { ...ghoulMythosCreature.combat!.attacks[0], effect: null, manoeuvre: false }
    show({
      mythosCreature: { ...ghoulMythosCreature, combat: { ...ghoulMythosCreature.combat!, attacks: [quiet] } },
      problems: [{ path: 'combat.attacks[0].effect', messages: ['Effect must be 1,000 characters or fewer.'] }],
    })

    expect(screen.getByRole('button', { name: 'More details for Claw' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Effect', { selector: '#field-combat-attacks-0-effect' })).toBeVisible()
  })

  it('names a problem that has no field in the summary without a link', () => {
    show({ mythosCreature: ghoulMythosCreature, problems: [{ path: 'skills', messages: ['Add at most 100 skills.'] }] })

    expect(within(screen.getByRole('alert')).getByText('Add at most 100 skills.')).toBeInTheDocument()
    expect(within(screen.getByRole('alert')).queryByRole('link')).not.toBeInTheDocument()
  })

  it('disables Save and reads "Saving..." while the request is in flight (SP-UX-40)', () => {
    show({ pending: true })

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
  })

  it('shows a failure alert and keeps the typed values', () => {
    show({ failureMessage: "We couldn't save the Mythos Creature. Try again." })

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't save the Mythos Creature. Try again.")
    expect(screen.getByLabelText('Name')).toHaveValue('Ghoul')
  })

  it('cancels without confirmation', async () => {
    const { onCancel } = show({ mythosCreature: ghoulMythosCreature })

    await userEvent.type(screen.getByLabelText('Origin'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalled()
  })

  it('keeps the Save and Cancel bar sticky (SP-A11Y-24)', () => {
    show()

    expect(screen.getByRole('button', { name: 'Save' }).parentElement).toHaveClass('sticky', 'bottom-0')
  })
})
