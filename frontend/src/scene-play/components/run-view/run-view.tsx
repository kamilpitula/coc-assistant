import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { InvestigatorsPresentSection } from '@/scene-play/components/investigators-present-section/investigators-present-section'
import { KeeperNotesSection } from '@/scene-play/components/keeper-notes-section/keeper-notes-section'
import { MaterialLoadState } from '@/scene-play/components/material-load-state/material-load-state'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { Card } from '@/shared/components/ui/card'

interface RunViewProps {
  campaignId: string
  scene: KeeperActiveScene
  /** Called after the Investigators present are saved, so the page can say "Investigators present saved.". */
  onPresentSaved: () => void
  /** Called when a present change found the Scene finished, so the page can refetch. */
  onFinishedMeanwhile: () => void
}

/**
 * Run (specs/scene-play/ux.md section 21.3): Keeper notes and Investigators present as bordered cards, one column
 * below 1024px and two above. Handouts, Non-Player Entities, and Items never show here; the Wall region lands with
 * PBI-SPL-007 and play tools with the first one.
 */
export function RunView({ campaignId, scene, onPresentSaved, onFinishedMeanwhile }: RunViewProps) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <RunCard>
        <KeeperNotesRegion campaignId={campaignId} scene={scene} />
      </RunCard>
      <RunCard>
        <InvestigatorsPresentSection campaignId={campaignId} scene={scene} onSaved={onPresentSaved} onFinishedMeanwhile={onFinishedMeanwhile} />
      </RunCard>
    </div>
  )
}

function RunCard({ children }: { children: React.ReactNode }) {
  return <Card className="min-w-0 p-4">{children}</Card>
}

/** Keeper notes with section 12's loading and failure states; the rest of Run is unaffected by either. */
function KeeperNotesRegion({ campaignId, scene }: { campaignId: string; scene: KeeperActiveScene }) {
  const material = useScene(campaignId, scene.scenarioId, scene.sceneId, true)

  if (material.isError || !material.data) {
    return <MaterialLoadState isError={material.isError} onRetry={() => void material.refetch()} />
  }

  return <KeeperNotesSection notes={material.data.keeperNotes} />
}
