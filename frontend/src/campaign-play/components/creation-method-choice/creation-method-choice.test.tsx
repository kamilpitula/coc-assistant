import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CreationMethodChoice } from './creation-method-choice'

const allMethods = ['StandardRolling', 'PointBuy', 'QuickFire'] as const

/** specs/character-sheet/ux.md sections 5.5 and 6.2; UX-8, UX-10, and A11Y-8. */
describe('CreationMethodChoice', () => {
  it('UX-10: shows the only allowed method as text instead of a choice', () => {
    render(<CreationMethodChoice allowed={['PointBuy']} value="PointBuy" needsConfirmation={false} clearsSkills={() => false} onChange={vi.fn()} />)

    expect(screen.getByText('Creation method: Point buy')).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('offers the allowed methods and switches at once while nothing is entered', async () => {
    const onChange = vi.fn()
    render(<CreationMethodChoice allowed={[...allMethods]} value={null} needsConfirmation={false} clearsSkills={() => false} onChange={onChange} />)

    const group = screen.getByRole('radiogroup', { name: 'Creation method' })
    expect(group).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Standard rolling' }))

    expect(onChange).toHaveBeenCalledWith('StandardRolling')
  })

  it('UX-8: asks before clearing values; cancelling keeps the method and returns focus', async () => {
    const onChange = vi.fn()
    render(<CreationMethodChoice allowed={[...allMethods]} value="PointBuy" needsConfirmation clearsSkills={() => false} onChange={onChange} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Quick fire' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Switch to Quick fire?' })
    expect(dialog).toHaveTextContent('Your characteristic values will be cleared.')
    expect(screen.getByRole('button', { name: 'Keep current method' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Keep current method' }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('radio', { name: 'Point buy' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Point buy' })).toHaveFocus()
  })

  it('UX-8: switches and clears after confirmation, warning when skill values go too', async () => {
    const onChange = vi.fn()
    render(<CreationMethodChoice allowed={[...allMethods]} value="PointBuy" needsConfirmation clearsSkills={(method) => method === 'QuickFire'} onChange={onChange} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Quick fire' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Your skill values will be cleared too.')
    await userEvent.click(screen.getByRole('button', { name: 'Switch and clear' }))

    expect(onChange).toHaveBeenCalledWith('QuickFire')
  })

  it('UX-32: shows the locked method as text with the reason, and no radios, once characteristics are rolled', () => {
    render(<CreationMethodChoice allowed={[...allMethods]} value="StandardRolling" locked needsConfirmation={false} clearsSkills={() => false} onChange={vi.fn()} />)

    expect(screen.getByText('Creation method: Standard rolling')).toBeInTheDocument()
    expect(screen.getByText('Locked because your characteristics are rolled.')).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('UX-32: tells a Draft that starting over is the way to another method', () => {    render(
      <CreationMethodChoice
        allowed={[...allMethods]}
        value="StandardRolling"
        locked
        canStartOver
        needsConfirmation={false}
        clearsSkills={() => false}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Locked because your characteristics are rolled. To use another method, start over.')).toBeInTheDocument()
  })

  it('UX-38 and G1: shows the method as text with the EDU reason once an EDU check is rolled', () => {
    render(
      <CreationMethodChoice
        allowed={[...allMethods]}
        value="PointBuy"
        locked
        lockReason="eduCheck"
        canStartOver
        needsConfirmation={false}
        clearsSkills={() => false}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Creation method: Point buy')).toBeInTheDocument()
    expect(screen.getByText('Locked because you rolled an EDU check. To use another method, start over.')).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })
})
