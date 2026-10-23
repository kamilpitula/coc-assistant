import { itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'

/** A Handout belongs to a Scene or to an Item (CONTEXT.md, Handout). */
export interface SceneHandoutOwner {
  type: 'scene'
  campaignId: string
  scenarioId: string
  sceneId: string
}

export interface ItemHandoutOwner {
  type: 'item'
  campaignId: string
  itemId: string
}

/** Whose Handouts a screen, a hook, or an API call is about. */
export type HandoutOwner = SceneHandoutOwner | ItemHandoutOwner

interface ScenePageParams {
  campaignId: string
  scenarioId: string
  sceneId: string
}

interface ItemPageParams {
  campaignId: string
  itemId: string
}

/** The owner's page as router link options: a Scene page or an Item page. */
export type OwnerPageLink =
  | { to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId'; params: ScenePageParams }
  | { to: '/campaigns/$campaignId/items/$itemId'; params: ItemPageParams }

export type AddHandoutPageLink =
  | { to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/new'; params: ScenePageParams }
  | { to: '/campaigns/$campaignId/items/$itemId/handouts/new'; params: ItemPageParams }

export type HandoutPageLink =
  | { to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/$handoutId'; params: ScenePageParams & { handoutId: string } }
  | { to: '/campaigns/$campaignId/items/$itemId/handouts/$handoutId'; params: ItemPageParams & { handoutId: string } }

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
  ownerPage: OwnerPageLink
  /** The "Add Handout" page. */
  addHandoutPage: AddHandoutPageLink
  /** One Handout's page. */
  handoutPage: (handoutId: string) => HandoutPageLink
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

function describeItem({ campaignId, itemId }: ItemHandoutOwner): HandoutOwnerDescription {
  const params = { campaignId, itemId }
  const detailKey = itemQueryKeys.detail(campaignId, itemId)

  return {
    handoutsUrl: `/api/campaigns/${campaignId}/items/${itemId}/handouts`,
    handoutsKey: [...detailKey, 'handouts'],
    detailKey,
    ownerPage: { to: '/campaigns/$campaignId/items/$itemId', params },
    addHandoutPage: { to: '/campaigns/$campaignId/items/$itemId/handouts/new', params },
    handoutPage: (handoutId) => ({ to: '/campaigns/$campaignId/items/$itemId/handouts/$handoutId', params: { ...params, handoutId } }),
  }
}

/** The description of the owner's type. */
export function describeHandoutOwner(owner: HandoutOwner): HandoutOwnerDescription {
  return owner.type === 'scene' ? describeScene(owner) : describeItem(owner)
}
