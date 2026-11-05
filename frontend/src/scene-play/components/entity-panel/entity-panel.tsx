import { EntityPanelBody } from '@/scenario-preparation/components/entity-panel-body/entity-panel-body'
import { useActiveScene } from '@/scene-play/hooks/useActiveScene'
import { SidePanelContent } from '@/shared/components/side-panel/side-panel-content'

interface EntityPanelProps {
  campaignId: string
  linkId: string
}

/**
 * A Scene's Non-Player Entity on the Active Scene (specs/navigation/ux.md section 3): the host adapter that resolves
 * the Keeper's Active Scene and renders the scene-scoped body with from="active-scene". A Player or a missing Scene
 * shows not-found and sends no Scene or profile request.
 */
export function EntityPanel({ campaignId, linkId }: EntityPanelProps) {
  const active = useActiveScene(campaignId)

  if (active.data === undefined) {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="loading" />
  }
  if (active.data?.kind !== 'keeper') {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="not-found" />
  }

  return (
    <EntityPanelBody
      campaignId={campaignId}
      scenarioId={active.data.scenarioId}
      sceneId={active.data.sceneId}
      linkId={linkId}
      from="active-scene"
    />
  )
}
