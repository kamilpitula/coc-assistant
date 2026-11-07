import { describe, expect, it } from 'vitest'

import { itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import { cluesQueryKeys } from '@/scene-play/services/cluesApi'
import { heldItemsQueryKeys } from '@/scene-play/services/itemHolderApi'
import { sceneHistoryQueryKeys } from '@/scene-play/services/sceneHistoryApi'

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

  it('refetches the Active Scene and the Scene queries for the activeScene topic', () => {
    expect(queryKeysForTopics('c1', ['activeScene'])).toEqual([activeSceneQueryKeys.detail('c1'), sceneQueryKeys.inCampaign('c1')])
  })

  it('refetches the Scene History for the sceneHistory topic (SPL-UX-68)', () => {
    expect(queryKeysForTopics('c1', ['sceneHistory'])).toEqual([sceneHistoryQueryKeys.detail('c1')])
  })

  it('refetches the Active Scene and the own Clues for the myClues topic, and the Scene History too (SPL-UX-28, SPL-UX-68)', () => {
    expect(queryKeysForTopics('c1', ['myClues'])).toEqual([
      activeSceneQueryKeys.detail('c1'),
      cluesQueryKeys.mine('c1'),
      sceneHistoryQueryKeys.detail('c1'),
    ])
  })

  it('refetches the Active Scene, every Keeper Clues query, and the Scene History for the sceneReveals topic', () => {
    expect(queryKeysForTopics('c1', ['sceneReveals'])).toEqual([
      activeSceneQueryKeys.detail('c1'),
      cluesQueryKeys.investigators('c1'),
      sceneQueryKeys.inCampaign('c1'),
      itemQueryKeys.all('c1'),
      heldItemsQueryKeys.all('c1'),
      sceneHistoryQueryKeys.detail('c1'),
    ])
  })

  it('refetches the own held Items for the myItems topic, and nothing else (PBI-SPL-003)', () => {
    expect(queryKeysForTopics('c1', ['myItems'])).toEqual([heldItemsQueryKeys.mine('c1')])
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
