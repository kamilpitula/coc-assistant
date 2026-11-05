import { HandoutPanelBody } from '@/scenario-preparation/components/handout-panel-body/handout-panel-body'
import type { SceneHandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { useActiveScene } from '@/scene-play/hooks/useActiveScene'
import { SidePanelContent } from '@/shared/components/side-panel/side-panel-content'

interface HandoutPanelProps {
  campaignId: string
  handoutId: string
}

/**
 * The Active Scene's Handout panel (specs/navigation/ux.md section 3): the host adapter that resolves the Keeper's
 * Active Scene and renders the scene-scoped body with from="active-scene". A Player or a missing Scene shows
 * not-found and sends no Handout request.
 */
export function HandoutPanel({ campaignId, handoutId }: HandoutPanelProps) {
  const active = useActiveScene(campaignId)

  if (active.data === undefined) {
    return <SidePanelContent kindLabel="Handout" title={null} state="loading" />
  }
  if (active.data?.kind !== 'keeper') {
    return <SidePanelContent kindLabel="Handout" title={null} state="not-found" />
  }

  const owner: SceneHandoutOwner = { type: 'scene', campaignId, scenarioId: active.data.scenarioId, sceneId: active.data.sceneId }
  return <HandoutPanelBody owner={owner} handoutId={handoutId} from="active-scene" />
}
