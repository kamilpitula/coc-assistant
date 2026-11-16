import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act, useRef, type RefObject } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AskPushRefusedError, PushNotAllowedError } from '@/roll-requests/services/rollRequestApi'
import type { RequestedRoll, WaitingRequestedRoll } from '@/roll-requests/types/RollRequest'

import { RollsYouCanPush } from './rolls-you-can-push'

// specs/roll-requests/ux.md section 19.1; RR-UX-25, RR-UX-26, RR-UX-28, RR-A11Y-18, RR-A11Y-19.
const { mockAskMutate } = vi.hoisted(() => ({ mockAskMutate: vi.fn() }))

vi.mock('@/roll-requests/hooks/useRollRequests', () => ({
  useAskToPush: () => ({ mutate: mockAskMutate, isPending: false }),
}))

interface AskCallbacks {
  onSuccess: (result: RequestedRoll) => void
  onError: (error: Error) => void
}

function failedRoll(overrides: Partial<RequestedRoll> = {}): RequestedRoll {
  return {
    investigatorId: 'harvey',
    investigatorName: 'Harvey Walters',
    targetValue: 60,
    usesBaseValue: false,
    canEarnExperienceCheck: true,
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    status: 'Rolled',
    pushJustification: null,
    pushBonusDice: null,
    pushPenaltyDice: null,
    canBePushed: true,
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
    ...overrides,
  }
}

function pushableRow(rollRequestId: string, roll: RequestedRoll, skill = 'Spot Hidden'): WaitingRequestedRoll {
  return {
    rollRequestId,
    target: { kind: 'Skill', skill, specialization: null, characteristic: null },
    message: 'A creak on the stairs.',
    createdAt: '2026-11-15T19:14:00Z',
    roll,
  }
}

function setup(pushable: WaitingRequestedRoll[], investigatorName: string | null = 'Harvey Walters') {
  mockAskMutate.mockReset()
  function Host() {
    const headingRef = useRef<HTMLHeadingElement>(null)
    return (
      <RollsYouCanPush
        campaignId="c1"
        investigatorName={investigatorName}
        pushable={pushable}
        headingRef={headingRef as RefObject<HTMLHeadingElement | null>}
        onAsked={vi.fn()}
        onUnpushable={vi.fn()}
      />
    )
  }
  return render(<Host />)
}

function captureAsk() {
  let callbacks: AskCallbacks | undefined
  mockAskMutate.mockImplementation((_input: unknown, options: AskCallbacks) => {
    callbacks = options
  })
  return () => {
    if (!callbacks) {
      throw new Error('expected the push to be asked')
    }
    return callbacks
  }
}

describe('RollsYouCanPush', () => {
  it('lists failed pushable rolls with "Push this roll" (RR-UX-25)', () => {
    setup([pushableRow('r1', failedRoll())])

    expect(screen.getByRole('heading', { level: 3, name: 'Rolls you can push' })).toBeInTheDocument()
    const item = screen.getByRole('listitem')
    expect(item.textContent).toContain('Spot Hidden . 81: Failure')
    expect(within(item).getByRole('button', { name: 'Push Spot Hidden roll' })).toHaveTextContent('Push this roll')
  })

  it('names the toggle with the request time when two rows share a target (RR-A11Y-18)', () => {
    setup([pushableRow('r1', failedRoll()), pushableRow('r2', failedRoll(), 'Spot Hidden')])

    expect(screen.getAllByRole('button', { name: /Push Spot Hidden roll, requested/ })).toHaveLength(2)
  })

  it('opens the justification group with focus in the Textarea, and "Never mind" returns focus (RR-A11Y-18, RR-A11Y-19)', async () => {
    setup([pushableRow('r1', failedRoll())])

    await userEvent.click(screen.getByRole('button', { name: 'Push Spot Hidden roll' }))

    const group = screen.getByRole('group', { name: 'Push justification for Spot Hidden' })
    expect(within(group).getByRole('textbox', { name: 'Tell the Keeper how Harvey Walters tries again.' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Ask the Keeper' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Never mind' }))

    expect(screen.queryByRole('group', { name: 'Push justification for Spot Hidden' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Push Spot Hidden roll' })).toHaveFocus()
  })

  it('asks with the trimmed justification and shows the Push asked row (RR-UX-26)', async () => {
    const onAsked = vi.fn()
    mockAskMutate.mockReset()
    render(
      <RollsYouCanPush
        campaignId="c1"
        investigatorName="Harvey Walters"
        pushable={[pushableRow('r1', failedRoll())]}
        headingRef={{ current: null }}
        onAsked={onAsked}
        onUnpushable={vi.fn()}
      />,
    )
    const getAsk = captureAsk()

    await userEvent.click(screen.getByRole('button', { name: 'Push Spot Hidden roll' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Tell the Keeper how Harvey Walters tries again.' }), 'Trying again, shelf by shelf.')
    expect(screen.getByRole('group', { name: 'Push justification for Spot Hidden' })).toHaveTextContent('29 / 2000')
    await userEvent.click(screen.getByRole('button', { name: 'Ask the Keeper' }))

    expect(mockAskMutate).toHaveBeenCalledWith(
      { rollRequestId: 'r1', investigatorId: 'harvey', justification: 'Trying again, shelf by shelf.' },
      expect.anything(),
    )
    getAsk().onSuccess(failedRoll({ status: 'PushAsked', pushJustification: 'Trying again, shelf by shelf.' }))
    await act(async () => {})
    expect(onAsked).toHaveBeenCalledWith('Spot Hidden')
  })

  it('refuses an over-long justification with the error and keeps "Ask the Keeper" disabled (RR-UX-26)', async () => {
    setup([pushableRow('r1', failedRoll())])

    await userEvent.click(screen.getByRole('button', { name: 'Push Spot Hidden roll' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Tell the Keeper how Harvey Walters tries again.' }), { target: { value: 'x'.repeat(2001) } })

    expect(screen.getByText('Justifications can be at most 2000 characters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ask the Keeper' })).toBeDisabled()
    expect(mockAskMutate).not.toHaveBeenCalled()
  })

  it('shows the server refusal and keeps the text (RR-UX-26)', async () => {
    setup([pushableRow('r1', failedRoll())])
    const getAsk = captureAsk()

    await userEvent.click(screen.getByRole('button', { name: 'Push Spot Hidden roll' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Tell the Keeper how Harvey Walters tries again.' }), 'Trying again.')
    await userEvent.click(screen.getByRole('button', { name: 'Ask the Keeper' }))

    getAsk().onError(new AskPushRefusedError('Tell the Keeper how Harvey Walters tries again.'))
    await act(async () => {})
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't ask for that push: Tell the Keeper how Harvey Walters tries again..")
    expect(screen.getByRole('textbox', { name: 'Tell the Keeper how Harvey Walters tries again.' })).toHaveValue('Trying again.')
  })

  it('reports a 409 through the panel status and shows the Push asked row once asked (RR-UX-26)', async () => {
    const onUnpushable = vi.fn()
    render(
      <RollsYouCanPush
        campaignId="c1"
        investigatorName="Harvey Walters"
        pushable={[pushableRow('r1', failedRoll())]}
        headingRef={{ current: null }}
        onAsked={vi.fn()}
        onUnpushable={onUnpushable}
      />,
    )
    const getAsk = captureAsk()

    await userEvent.click(screen.getByRole('button', { name: 'Push Spot Hidden roll' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Tell the Keeper how Harvey Walters tries again.' }), 'Trying again.')
    await userEvent.click(screen.getByRole('button', { name: 'Ask the Keeper' }))

    getAsk().onError(new PushNotAllowedError())
    await act(async () => {})
    expect(onUnpushable).toHaveBeenCalledWith('Spot Hidden')
  })
})
