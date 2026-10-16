import { describe, expect, it } from 'vitest'

import { campaignQueryKeys } from './campaignApi'
import { queryKeysForTopics } from './liveTopics'

// specs/campaign-play/spec.md, Live connection contract: CampaignDataChanged topics map to the queries to refetch.
describe('queryKeysForTopics', () => {
  it('refetches the roster for the members topic', () => {
    expect(queryKeysForTopics('c1', ['members'])).toEqual([campaignQueryKeys.members('c1')])
  })

  it('refetches the Wall page and the preview for the wallEntries topic', () => {
    expect(queryKeysForTopics('c1', ['wallEntries'])).toEqual([
      campaignQueryKeys.wall('c1'),
      campaignQueryKeys.wallPreview('c1'),
    ])
  })

  it('refetches the Keeper investigators and the roster for the investigators topic', () => {
    expect(queryKeysForTopics('c1', ['investigators'])).toEqual([
      campaignQueryKeys.investigators('c1'),
      campaignQueryKeys.members('c1'),
    ])
  })

  it('refetches the own Investigator and the roster for the myInvestigator topic', () => {
    expect(queryKeysForTopics('c1', ['myInvestigator'])).toEqual([
      campaignQueryKeys.myInvestigator('c1'),
      campaignQueryKeys.members('c1'),
    ])
  })

  it('ignores topics this client does not know yet, so a newer server never breaks it', () => {
    expect(queryKeysForTopics('c1', ['somethingNew', 'members'])).toEqual([campaignQueryKeys.members('c1')])
  })

  it('collapses the roster when several topics map to it', () => {
    expect(queryKeysForTopics('c1', ['investigators', 'myInvestigator', 'members'])).toEqual([
      campaignQueryKeys.investigators('c1'),
      campaignQueryKeys.members('c1'),
      campaignQueryKeys.myInvestigator('c1'),
    ])
  })

  it('refetches each query once when a topic repeats', () => {
    expect(queryKeysForTopics('c1', ['members', 'members'])).toEqual([campaignQueryKeys.members('c1')])
  })
})
