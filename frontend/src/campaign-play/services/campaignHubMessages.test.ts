import { describe, expect, it } from 'vitest'

import { parseCampaignDataChanged, parsePresenceChanged, parsePresenceSnapshot } from './campaignHubMessages'

// specs/campaign-play/spec.md, Live connection contract: the hub messages are validated at the boundary.
describe('campaign hub messages', () => {
  it('reads a Presence snapshot into Connected members', () => {
    expect(
      parsePresenceSnapshot({ campaignId: 'c1', members: [{ memberId: 'm1', presence: 'Connected' }] }),
    ).toEqual({ campaignId: 'c1', members: [{ memberId: 'm1', presence: 'Connected' }] })
  })

  it('reads a Presence change', () => {
    expect(parsePresenceChanged({ campaignId: 'c1', memberId: 'm1', presence: 'NotConnected' })).toEqual({
      campaignId: 'c1',
      memberId: 'm1',
      presence: 'NotConnected',
    })
  })

  it('rejects a Presence value outside the contract', () => {
    expect(parsePresenceChanged({ campaignId: 'c1', memberId: 'm1', presence: 'Online' })).toBeNull()
  })

  it('reads a data change with its topics', () => {
    expect(parseCampaignDataChanged({ campaignId: 'c1', topics: ['members'] })).toEqual({
      campaignId: 'c1',
      topics: ['members'],
    })
  })

  it('rejects a malformed data change', () => {
    expect(parseCampaignDataChanged({ campaignId: 'c1' })).toBeNull()
  })
})
