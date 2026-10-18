import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { stateFromMythosCreature } from '@/scenario-preparation/services/mythosCreatureForm'
import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterSkillRows } from './monster-skill-rows'

// specs/scenario-preparation/ux.md section 25.5 (Skills); SP-UX-34, SP-A11Y-27, SP-A11Y-29.

const base = { skillCatalog: undefined, catalogFailed: false, onRetryCatalog: () => undefined }

describe('MonsterSkillRows', () => {
  it('shows each skill as a group named "Skill n" with a name, a value, and Remove, and no specialization', () => {
    render(<MonsterSkillRows {...base} state={stateFromMythosCreature(ghoulMythosCreature)} dispatch={vi.fn()} errorOf={() => undefined} />)

    const group = screen.getByRole('group', { name: 'Skill 1' })
    expect(within(group).getByLabelText('Skill')).toHaveValue('Stealth')
    expect(within(group).getByLabelText('Value')).toHaveValue(70)
    expect(within(group).getByRole('button', { name: 'Remove skill Stealth' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Specialization')).not.toBeInTheDocument()
    expect(screen.getByText('Choose a skill from the list or type your own, with a value from 0 to 2,000.')).toBeInTheDocument()
  })

  it('offers the Era skills as suggestions and accepts any name', () => {
    const catalog = { skills: [{ skill: 'Stealth' }, { skill: 'Listen' }], closedFamilies: [{ skill: 'Fighting' }] } as never
    const { container } = render(
      <MonsterSkillRows {...base} skillCatalog={catalog} state={stateFromMythosCreature(ghoulMythosCreature)} dispatch={vi.fn()} errorOf={() => undefined} />,
    )

    expect([...container.querySelectorAll('datalist option')].map((option) => option.getAttribute('value'))).toEqual(['Fighting', 'Listen', 'Stealth'])
  })

  it('names an unnamed row by number and dispatches add, edit, and remove', async () => {
    const dispatch = vi.fn()
    const state = stateFromMythosCreature({ ...ghoulMythosCreature, skills: [{ name: null, value: null, difficulty: 'Regular' }] })
    render(<MonsterSkillRows {...base} state={state} dispatch={dispatch} errorOf={() => undefined} />)

    await userEvent.type(screen.getByLabelText('Skill'), 'S')
    await userEvent.type(screen.getByLabelText('Value'), '5')
    await userEvent.click(screen.getByRole('button', { name: 'Add skill' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove skill 1' }))

    expect(dispatch).toHaveBeenCalledWith({ type: 'setSkillName', index: 0, value: 'S' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'setSkillValue', index: 0, value: 5 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'addSkill' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'removeSkill', index: 0 })
  })

  it('shows the server message next to the field and a retry when the skill list cannot be loaded', async () => {
    const onRetryCatalog = vi.fn()
    render(
      <MonsterSkillRows
        {...base}
        catalogFailed
        onRetryCatalog={onRetryCatalog}
        state={stateFromMythosCreature(ghoulMythosCreature)}
        dispatch={vi.fn()}
        errorOf={(path) => (path === 'skills[0].value' ? 'Enter a value from 0 to 2,000.' : undefined)}
      />,
    )

    expect(screen.getByLabelText('Value')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load the skill list. You can still type skill names.")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetryCatalog).toHaveBeenCalled()
  })

  it('replaces Add skill with the limit message at 100 rows (SP-UX-34)', () => {
    const skills = Array.from({ length: 100 }, (_, index) => ({ name: `Skill ${index}`, value: 10, difficulty: 'Regular' as const }))
    render(<MonsterSkillRows {...base} state={stateFromMythosCreature({ ...ghoulMythosCreature, skills })} dispatch={vi.fn()} errorOf={() => undefined} />)

    expect(screen.queryByRole('button', { name: 'Add skill' })).not.toBeInTheDocument()
    expect(screen.getByText("You've reached the limit of 100 skills.")).toBeInTheDocument()
  })
})
