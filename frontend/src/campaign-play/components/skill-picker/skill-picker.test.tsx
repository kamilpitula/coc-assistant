import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { skill, skillCatalog } from '@/campaign-play/test-support/characterSheetFixtures'

import { SkillPicker } from './skill-picker'

/** specs/character-sheet/ux.md sections 6.4 and 6.5 (skill-picker); project_ruleset.md section 4.2 for specializations. */
describe('SkillPicker', () => {
  it('offers any skill except Credit Rating and Cthulhu Mythos and reports the pick', async () => {
    const onChange = vi.fn()
    render(<SkillPicker field="occupation.skillChoices[7][0]" label="Skill of your choice" value={null} skillCatalog={skillCatalog} onChange={onChange} />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Skill of your choice' }))
    expect(screen.queryByRole('option', { name: 'Credit Rating' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Cthulhu Mythos' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: 'Library Use' }))

    expect(onChange).toHaveBeenCalledWith(skill('Library Use'))
  })

  it('limits the pick to the options a slot offers', async () => {
    const onChange = vi.fn()
    const options = [skill('Art/Craft', 'Acting'), skill('Disguise')]
    render(<SkillPicker field="occupation.skillChoices[0][0]" label="Choose 1" value={null} options={options} skillCatalog={skillCatalog} onChange={onChange} />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Choose 1' }))
    expect(screen.getAllByRole('option')).toHaveLength(2)
    await userEvent.click(screen.getByRole('option', { name: 'Art/Craft (Acting)' }))

    expect(onChange).toHaveBeenCalledWith(skill('Art/Craft', 'Acting'))
  })

  it('project_ruleset 4.2: takes a closed family specialization from its list', async () => {
    const onChange = vi.fn()
    render(<SkillPicker field="occupation.custom.skills[0]" label="Occupation skill 1" value={skill('Firearms')} skillCatalog={skillCatalog} onChange={onChange} />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Firearms specialization' }))
    await userEvent.click(screen.getByRole('option', { name: 'Rifle/Shotgun' }))

    expect(onChange).toHaveBeenCalledWith(skill('Firearms', 'Rifle/Shotgun'))
  })

  it('takes an open family specialization as text with suggestions, attaching its error', async () => {
    const onChange = vi.fn()
    render(
      <SkillPicker
        field="occupation.skillChoices[1][0]"
        label="Art/Craft specialization"
        value={skill('Art/Craft')}
        options={[skill('Art/Craft')]}
        specializationOnly
        skillCatalog={skillCatalog}
        errors={{ 'occupation.skillChoices[1][0].specialization': 'Enter a specialization for Art/Craft.' }}
        onChange={onChange}
      />,
    )

    const input = screen.getByRole('combobox', { name: 'Art/Craft specialization' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(document.querySelectorAll('datalist option')).toHaveLength(2)
    await userEvent.type(input, 'P')

    expect(onChange).toHaveBeenLastCalledWith(skill('Art/Craft', 'P'))
  })
})
