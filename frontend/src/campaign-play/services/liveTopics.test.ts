import { describe, expect, it } from 'vitest'

import { campaignQueryKeys } from './campaignApi'
import { queryKeysForTopics } from './liveTopics'

// specs/campaign-play/spec.md, Live connection contract: CampaignDataChanged topics map to the queries to refetch.
describe('queryKeysForTopics', () => {
  it('refetches the roster for the members topic', () => {
    expect(queryKeysForTopics('c1', ['members'])).toEqual([campaignQueryKeys.members('c1')])
  })

  it('ignores topics this client does not know yet, so a newer server never breaks it', () => {
    expect(queryKeysForTopics('c1', ['wallEntries', 'members', 'somethingNew'])).toEqual([campaignQueryKeys.members('c1')])
  })

  it('refetches each query once when a topic repeats', () => {
    expect(queryKeysForTopics('c1', ['members', 'members'])).toEqual([campaignQueryKeys.members('c1')])
  })
})
