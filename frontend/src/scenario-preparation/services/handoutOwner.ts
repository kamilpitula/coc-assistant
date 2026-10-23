import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'

/** A Handout belongs to a Scene (CONTEXT.md, Handout). */
export interface SceneHandoutOwner {
  type: 'scene'
  campaignId: string
  scenarioId: string
  sceneId: string
}

/** Whose Handouts a screen, a hook, or an API call is about. */
export type HandoutOwner = SceneHandoutOwner

/**
 * What differs between the owners of Handouts (design record PBI-SP-008, D3): where their API lives, how their queries are keyed,
 * which query every Handout write reloads, and where their pages are. One description per owner type, so no component switches
 * on the type.
 */
export interface HandoutOwnerDescription {
  /** The API base of the owner's Handouts, without a trailing slash. */
  handoutsUrl: string
  /** The query-key prefix of the owner's Handouts: a Handout is keyed under its owner, so reloading the owner reaches it. */
  handoutsKey: readonly string[]
  /** The key of the owner's own detail query, which every Handout write reloads. */
  detailKey: readonly string[]
  /** The owner's page, as router link options. */
  ownerPage: { to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId'; params: { campaignId: string; scenarioId: string; sceneId: string } }
  /** The "Add Handout" page. */
  addHandoutPage: {
    to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/new'
    params: { campaignId: string; scenarioId: string; sceneId: string }
  }
  /** One Handout's page. */
  handoutPage: (handoutId: string) => {
    to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/$handoutId'
    params: { campaignId: string; scenarioId: string; sceneId: string; handoutId: string }
  }
}

function describeScene({ campaignId, scenarioId, sceneId }: SceneHandoutOwner): HandoutOwnerDescription {
  const params = { campaignId, scenarioId, sceneId }
  const detailKey = sceneQueryKeys.detail(campaignId, scenarioId, sceneId)

  return {
    handoutsUrl: `/api/campaigns/${campaignId}/scenarios/${scenarioId}/scenes/${sceneId}/handouts`,
    handoutsKey: [...detailKey, 'handouts'],
    detailKey,
    ownerPage: { to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId', params },
    addHandoutPage: { to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/new', params },
    handoutPage: (handoutId) => ({
      to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/$handoutId',
      params: { ...params, handoutId },
    }),
  }
}

/** The description of the owner's type. */
export function describeHandoutOwner(owner: HandoutOwner): HandoutOwnerDescription {
  return describeScene(owner)
}
