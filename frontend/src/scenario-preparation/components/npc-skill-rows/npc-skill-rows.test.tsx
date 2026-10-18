import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { SkillCatalog } from '@/campaign-play/types/RuleData'
import { stateFromHumanNpc } from '@/scenario-preparation/services/humanNpcForm'
import { gangsterHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { NpcSkillRows } from './npc-skill-rows'

// specs/scenario-preparation/ux.md section 25.4; SP-UX-33, SP-UX-34, SP-A11Y-27.

const catalog = {
  era: '1920s',
  skills: [{ skill: 'Spot Hidden', specialization: null, base: { kind: 'fixed', value: 25 } }],
  closedFamilies: [
    { skill: 'Fighting', specializations: [{ specialization: 'Brawl', base: { kind: 'fixed', value: 25 } }] },
    { skill: 'Firearms', specializations: [{ specialization: 'Handgun', base: { kind: 'fixed', value: 20 } }] },
  ],
  openFamilies: [],
  specializationSuggestions: {},
} as SkillCatalog

function show(overrides: Partial<React.ComponentProps<typeof NpcSkillRows>> = {}) {
  const props = {
    state: stateFromHumanNpc(gangsterHumanNpc),
    dispatch: vi.fn(),
    errorOf: () => undefined,
    skillCatalog: catalog,
    catalogFailed: false,
    onRetryCatalog: vi.fn(),
    ...overrides,
  }
  render(<NpcSkillRows {...props} />)
  return props
}

describe('NpcSkillRows', () => {
  it('shows each skill as a group named "Skill n" with name, value, and Remove (SP-A11Y-27)', () => {
    show()

    const first = screen.getByRole('group', { name: 'Skill 1' })
    expect(within(first).getByLabelText('Skill')).toHaveValue('Spot Hidden')
    expect(within(first).getByLabelText('Value')).toHaveValue(55)
    expect(within(first).getByRole('button', { name: 'Remove skill Spot Hidden' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove skill Firearms (Handgun)' })).toBeInTheDocument()
    expect(screen.getByText(/Choose a skill from the list or type your own/)).toBeInTheDocument()
  })

  it('offers Specialization only for Fighting and Firearms (SP-UX ux 25.4)', () => {
    show()

    expect(within(screen.getByRole('group', { name: 'Skill 1' })).queryByText('Specialization')).not.toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Skill 2' })).getByText('Specialization')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Skill 3' })).getByText('Specialization')).toBeInTheDocument()
  })

  it('names an unnamed row by number', () => {
    const state = stateFromHumanNpc({ ...gangsterHumanNpc, skills: [{ name: null, specialization: null, value: null, difficulty: 'Regular' }] })

    show({ state })

    expect(screen.getByRole('button', { name: 'Remove skill 1' })).toBeInTheDocument()
  })

  it('suggests the Era skills in a datalist while still accepting any name', () => {
    const { container } = render(
      <NpcSkillRows
        state={stateFromHumanNpc(gangsterHumanNpc)}
        dispatch={vi.fn()}
        errorOf={() => undefined}
        skillCatalog={catalog}
        catalogFailed={false}
        onRetryCatalog={vi.fn()}
      />,
    )

    const options = [...container.querySelectorAll('datalist option')].map((option) => option.getAttribute('value'))
    expect(options).toEqual(expect.arrayContaining(['Spot Hidden', 'Fighting', 'Firearms']))
  })

  it('dispatches edits, additions, and removals', async () => {
    const { dispatch } = show()

    await userEvent.type(within(screen.getByRole('group', { name: 'Skill 1' })).getByLabelText('Value'), '7')
    await userEvent.click(screen.getByRole('button', { name: 'Add skill' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove skill Spot Hidden' }))

    expect(dispatch).toHaveBeenCalledWith({ type: 'setSkillValue', index: 0, value: 557 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'addSkill' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'removeSkill', index: 0 })
  })

  it('falls back to a text Specialization and explains the failure when the skill list did not load', async () => {
    const props = show({ skillCatalog: undefined, catalogFailed: true })

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load the skill list. You can still type skill names.")
    expect(within(screen.getByRole('group', { name: 'Skill 2' })).getByRole('textbox', { name: 'Specialization' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(props.onRetryCatalog).toHaveBeenCalled()
  })

  it('shows a server message next to its field', () => {
    show({ errorOf: (path) => (path === 'skills[1].specialization' ? 'Choose a Firearms specialization from the list.' : undefined) })

    expect(screen.getByText('Choose a Firearms specialization from the list.')).toBeInTheDocument()
  })

  it('replaces Add with the limit message at 100 rows (SP-UX-34)', () => {
    const skills = Array.from({ length: 100 }, (_, index) => ({ name: `S${index}`, specialization: null, value: 10, difficulty: 'Regular' as const }))

    show({ state: stateFromHumanNpc({ ...gangsterHumanNpc, skills }) })

    expect(screen.queryByRole('button', { name: 'Add skill' })).not.toBeInTheDocument()
    expect(screen.getByText("You've reached the limit of 100 skills.")).toBeInTheDocument()
  })
})
