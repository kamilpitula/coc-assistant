import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { bracket17, bracket25, emptyInputs, problem, rules, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'

import { CharacteristicsStep } from './characteristics-step'

const noop = { onAction: vi.fn(), onBlur: vi.fn(), allowedMethods: ['PointBuy' as const] }

/** specs/character-sheet/ux.md section 6.2 (Point buy with its Luck rows); UX-9, UX-10, UX-20. */
describe('CharacteristicsStep', () => {
  it('UX-10: names the only available method as text, without a choice', () => {
    render(<CharacteristicsStep inputs={validInputs} errors={{}} rules={rules} bracket={bracket25} warnings={[]} {...noop} />)

    expect(screen.getByText('Creation method: Point buy')).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('offers the eight characteristics with the points used', () => {
    render(<CharacteristicsStep inputs={validInputs} errors={{}} rules={rules} bracket={bracket25} warnings={[]} {...noop} />)

    for (const code of ['STR', 'CON', 'DEX', 'APP', 'POW', 'SIZ', 'INT', 'EDU']) {
      expect(screen.getByLabelText(code)).toBeInTheDocument()
    }
    expect(screen.getByText('Points used: 460 of 460')).toBeInTheDocument()
  })

  it('UX-20: takes Luck as a 3D6 roll outside the points, with one row at age 25', () => {
    render(<CharacteristicsStep inputs={validInputs} errors={{}} rules={rules} bracket={bracket25} warnings={[]} {...noop} />)

    expect(screen.getByRole('heading', { name: 'Luck' })).toBeInTheDocument()
    expect(screen.getByText("Luck isn't bought with points. Roll 3D6 at the table and enter the total.")).toBeInTheDocument()
    expect(screen.getByLabelText('Luck, 3D6 total')).toHaveValue(11)
    expect(screen.getByText('= 55')).toBeInTheDocument()
    expect(screen.queryByLabelText('Luck, second roll, 3D6 total')).not.toBeInTheDocument()
  })

  it('UX-20: adds the second Luck row and the kept value in the two-roll age bracket', () => {
    const inputs = { ...validInputs, identity: { ...validInputs.identity, age: 17 }, luckRolls: [11, 13] }
    render(<CharacteristicsStep inputs={inputs} errors={{}} rules={rules} bracket={bracket17} warnings={[]} {...noop} />)

    expect(screen.getByLabelText('Luck, second roll, 3D6 total')).toHaveValue(13)
    expect(screen.getByText('Your age lets you roll Luck twice and keep the higher result.')).toBeInTheDocument()
    expect(screen.getByText('Luck kept: 65')).toBeInTheDocument()
  })

  it('reports characteristic and Luck changes', async () => {
    const onAction = vi.fn()
    render(<CharacteristicsStep inputs={emptyInputs} errors={{}} rules={rules} bracket={bracket25} warnings={[]} onAction={onAction} onBlur={vi.fn()} allowedMethods={['PointBuy']} />)

    await userEvent.type(screen.getByLabelText('STR'), '6')
    await userEvent.type(screen.getByLabelText('Luck, 3D6 total'), '9')

    expect(onAction).toHaveBeenCalledWith({ type: 'characteristic', code: 'STR', value: 6 })
    expect(onAction).toHaveBeenCalledWith({ type: 'luckRoll', index: 0, value: 9 })
  })

  it('lists warnings under "Worth checking" without announcing them as an alert', () => {
    const warning = problem('PointBuyBelowRecommendation', 'characteristics.INT', 'INT is below the recommended 40. Check with your Keeper.', 'Warning')
    render(<CharacteristicsStep inputs={validInputs} errors={{}} rules={rules} bracket={bracket25} warnings={[warning]} {...noop} />)

    const heading = screen.getByRole('heading', { name: 'Worth checking' })
    expect(within(heading.parentElement!).getByText(warning.message)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the total error on the characteristics group', () => {
    render(
      <CharacteristicsStep
        inputs={validInputs}
        errors={{ characteristics: 'Your characteristics must add up to 460. They add up to 450.' }}
        rules={rules}
        bracket={bracket25}
        warnings={[]}
        {...noop}
      />,
    )

    expect(screen.getByRole('group', { name: 'Characteristics' })).toHaveAccessibleDescription(
      'Your characteristics must add up to 460. They add up to 450.',
    )
  })

  it("offers the Campaign's methods and switches at once while nothing is entered", async () => {
    const onAction = vi.fn()
    const inputs = { ...emptyInputs, creationMethod: null }
    render(<CharacteristicsStep inputs={inputs} errors={{}} rules={rules} bracket={bracket25} warnings={[]} onAction={onAction} onBlur={vi.fn()} allowedMethods={['StandardRolling', 'PointBuy', 'QuickFire']} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Standard rolling' }))

    expect(onAction).toHaveBeenCalledWith({ type: 'creationMethod', method: 'StandardRolling' })
  })

  it('UX-9: Standard rolling takes a raw total per characteristic and shows the computed value', async () => {
    const onAction = vi.fn()
    const inputs = { ...emptyInputs, creationMethod: 'StandardRolling' as const, characteristicRolls: { SIZ: 7 } }
    render(<CharacteristicsStep inputs={inputs} errors={{}} rules={rules} bracket={bracket25} warnings={[]} onAction={onAction} onBlur={vi.fn()} allowedMethods={['StandardRolling']} />)

    expect(screen.getByLabelText('STR, 3D6 total')).toBeInTheDocument()
    expect(screen.getByLabelText('SIZ, 2D6 total')).toHaveValue(7)
    expect(screen.getAllByText('(2D6 + 6) x 5')).toHaveLength(3)
    expect(screen.getByText('= 65')).toBeInTheDocument()
    expect(screen.queryByText(/Points used/)).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('STR, 3D6 total'), '9')

    expect(onAction).toHaveBeenCalledWith({ type: 'characteristicRoll', code: 'STR', value: 9 })
  })

  it('Quick fire assigns pool values with eight Selects and lists the values left', async () => {
    const onAction = vi.fn()
    const inputs = { ...emptyInputs, creationMethod: 'QuickFire' as const, characteristics: { STR: 80, CON: 50 } }
    render(<CharacteristicsStep inputs={inputs} errors={{}} rules={rules} bracket={bracket25} warnings={[]} onAction={onAction} onBlur={vi.fn()} allowedMethods={['QuickFire']} />)

    expect(screen.getByText('Values left to assign: 70, 60, 60, 50, 50, 40')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox', { name: 'DEX' }))
    expect(screen.queryByRole('option', { name: '80' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: '70' }))

    expect(onAction).toHaveBeenCalledWith({ type: 'characteristic', code: 'DEX', value: 70 })
  })
})
