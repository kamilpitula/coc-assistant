import { useScene } from '@/scenario-preparation/hooks/useScenes'
import type { SceneHandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { sceneHandoutContext } from '@/scenario-preparation/services/handoutOwnerContext'

/**
 * The Scene that owns the Handouts on a screen, with what the Handouts may do now. `scene` is the Scene query, so the caller can
 * show its loading, error, and not-found states; `context` is null until the Scene has loaded. Enabled only for the Keeper.
 */
export function useSceneHandoutContext(owner: SceneHandoutOwner, enabled: boolean) {
  const scene = useScene(owner.campaignId, owner.scenarioId, owner.sceneId, enabled)
  const context = scene.data ? sceneHandoutContext(scene.data, () => void scene.refetch()) : null

  return { scene, context }
}
