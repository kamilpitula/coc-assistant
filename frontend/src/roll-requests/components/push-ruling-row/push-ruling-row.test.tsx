import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { RequestedRoll, RollRequest } from '@/roll-requests/types/RollRequest'

import { PushRulingRow } from './push-ruling-row'

// specs/roll-requests/ux.md section 19.2; RR-UX-27, RR-UX-28, RR-A11Y-18, RR-A11Y-19.
function pushAskedRoll(): RequestedRoll {
  return {
    investigatorId: 'harvey',
    investigatorName: 'Harvey Walters',
    targetValue: 60,
    usesBaseValue: false,
    canEarnExperienceCheck: true,
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 1,
    status: 'PushAsked',
    pushJustification: 'I search every shelf.',
    pushBonusDice: null,
    pushPenaltyDice: null,
    canBePushed: false,
    rolls: [
      {
        dice: '1D100',
        result: 81,
        faces: [80, 1],
        rolledBy: 'Harvey Walters',
        rolledAt: '2026-11-15T19:14:00Z',
        percentile: { unitsFace: 1, tensFaces: [80], keptTens: 80, result: 81, successLevel: 'Failure', isSuccess: false },
        earnsExperienceCheck: false,
        isPushed: false,
      },
    ],
  }
}

function request(): RollRequest {
  return {
    id: 'r1',
    target: { kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null },
    message: null,
    visibility: 'Public',
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    createdAt: '2026-11-15T19:14:00Z',
    requestedRolls: [pushAskedRoll()],
  }
}

function setup(props: Partial<React.ComponentProps<typeof PushRulingRow>> = {}) {
  const onApprove = vi.fn()
  const onDecline = vi.fn()
  const view = render(
    <PushRulingRow
      request={request()}
      roll={pushAskedRoll()}
      busy={false}
      approving={false}
      declining={false}
      failed={null}
      onApprove={onApprove}
      onDecline={onDecline}
      {...props}
    />,
  )
  return { ...view, onApprove, onDecline }
}

describe('PushRulingRow', () => {
  it('shows the ruling row with the justification and the first result (RR-UX-27)', () => {
    setup()

    const item = screen.getByRole('listitem')
    expect(item.textContent).toContain('Harvey Walters . Spot Hidden . asks to push . first roll 81: Failure')
    expect(within(item).getByText('"I search every shelf."')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve push of Spot Hidden for Harvey Walters' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens the dice with the original dice preset, moves focus in, and confirms with the chosen dice (RR-UX-27, RR-A11Y-19)', async () => {
    const { onApprove } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Approve push of Spot Hidden for Harvey Walters' }))

    const group = screen.getByRole('group', { name: "Dice for Harvey Walters's pushed roll" })
    expect(screen.getByRole('button', { name: 'Approve push of Spot Hidden for Harvey Walters' })).toHaveAttribute('aria-expanded', 'true')
    expect(within(group).getByRole('combobox', { name: 'Bonus Dice' })).toHaveFocus()
    await userEvent.click(within(group).getByRole('combobox', { name: 'Bonus Dice' }))
    await userEvent.click(screen.getByRole('option', { name: '1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm approval of Spot Hidden push for Harvey Walters' }))

    expect(onApprove).toHaveBeenCalledWith(1, 1)
  })

  it('closes the dice when "Approve push" is activated again and keeps focus on it (RR-A11Y-19)', async () => {
    setup()

    const toggle = screen.getByRole('button', { name: 'Approve push of Spot Hidden for Harvey Walters' })
    await userEvent.click(toggle)
    expect(screen.getByRole('group', { name: "Dice for Harvey Walters's pushed roll" })).toBeInTheDocument()

    await userEvent.click(toggle)

    expect(screen.queryByRole('group', { name: "Dice for Harvey Walters's pushed roll" })).not.toBeInTheDocument()
    expect(toggle).toHaveFocus()
  })

  it('declines immediately and disables every button while busy (RR-UX-28)', async () => {
    const { onDecline } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Decline push of Spot Hidden for Harvey Walters' }))

    expect(onDecline).toHaveBeenCalledTimes(1)
  })

  it('reads the in-flight labels and shows the inline failures', async () => {
    const view = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Approve push of Spot Hidden for Harvey Walters' }))

    view.rerender(
      <PushRulingRow
        request={request()}
        roll={pushAskedRoll()}
        busy
        approving
        declining={false}
        failed={null}
        onApprove={vi.fn()}
        onDecline={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Confirm approval of Spot Hidden push for Harvey Walters' })).toHaveTextContent('Approving...')

    view.rerender(
      <PushRulingRow
        request={request()}
        roll={pushAskedRoll()}
        busy
        approving={false}
        declining={false}
        failed="decline"
        onApprove={vi.fn()}
        onDecline={vi.fn()}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't decline that push. Try again.")
  })
})
