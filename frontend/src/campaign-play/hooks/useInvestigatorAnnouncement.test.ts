import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { CampaignMember } from '@/campaign-play/types/CampaignMember'

import { useInvestigatorAnnouncement } from './useInvestigatorAnnouncement'

// specs/campaign-overview/ux.md section 5.2: announcements derive from the roster before and after a refetch.

const keeper: CampaignMember = { memberId: 'k', displayName: 'Eleanor Hart', role: 'Keeper', isYou: true, investigator: null }
const inProgress: CampaignMember = { memberId: 'a', displayName: 'Ana Ruiz', role: 'Player', isYou: false, investigator: { visibility: 'InProgress' } }
const submitted: CampaignMember = {
  ...inProgress,
  investigator: { visibility: 'Visible', name: 'Dr. Ames', status: 'Submitted' },
}

function setup(members: CampaignMember[] | undefined, fetched: boolean) {
  return renderHook((props: { members: CampaignMember[] | undefined; fetched: boolean }) => useInvestigatorAnnouncement(props.members, props.fetched), {
    initialProps: { members, fetched },
  })
}

describe('useInvestigatorAnnouncement', () => {
  it('announces nothing for the roster shown before the first fetch since opening, nor for that fetch', () => {
    const { result, rerender } = setup([keeper, inProgress], false)

    rerender({ members: [keeper, submitted], fetched: false })
    expect(result.current).toBe('')

    rerender({ members: [keeper, submitted], fetched: true })
    expect(result.current).toBe('')
  })

  it('announces a change found by a later refetch', () => {
    const { result, rerender } = setup([keeper, inProgress], true)

    rerender({ members: [keeper, submitted], fetched: true })

    expect(result.current).toBe('Dr. Ames by Ana Ruiz was submitted.')
  })

  it('clears the announcement when a later refetch changes nothing worth announcing', () => {
    const { result, rerender } = setup([keeper, inProgress], true)
    rerender({ members: [keeper, submitted], fetched: true })

    rerender({ members: [keeper, { ...submitted, displayName: 'Ana R.' }], fetched: true })

    expect(result.current).toBe('')
  })
})
