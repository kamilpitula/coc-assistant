import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import { RollRequestForm } from '@/roll-requests/components/roll-request-form/roll-request-form'
import { WaitingRolls } from '@/roll-requests/components/waiting-rolls/waiting-rolls'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { ActiveSceneWall } from '@/scene-play/components/active-scene-wall/active-scene-wall'
import { InvestigatorsPresentSection } from '@/scene-play/components/investigators-present-section/investigators-present-section'
import { KeeperNotesSection } from '@/scene-play/components/keeper-notes-section/keeper-notes-section'
import { MaterialLoadState } from '@/scene-play/components/material-load-state/material-load-state'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { Card } from '@/shared/components/ui/card'

interface RunViewProps {
  campaignId: string
  scene: KeeperActiveScene
  /** Called after the Investigators present are saved with the number of waiting rolls it cancelled. */
  onPresentSaved: (cancelledCount: number) => void
  /** Called after a Wall Entry is added from Run, so the page can say "Wall Entry added.". */
  onWallEntryAdded: () => void
  /** A roll was requested, so the page says "{target} roll requested from {names}.". */
  onRollRequested: (message: string) => void
  /** Called when a present change found the Scene finished, so the page can refetch. */
  onFinishedMeanwhile: () => void
}

/**
 * Run (specs/scene-play/ux.md sections 21.3 and 21.8, amended by specs/roll-requests/ux.md section 2): Keeper notes,
 * Request a roll, Waiting rolls, Investigators present, and the Wall as bordered cards, in that DOM order. Each column
 * stacks its own cards, so a tall Wall never pushes "Request a roll" away from the notes. From 1024px the right
 * column renders visually first (Wall above Investigators present) while the DOM order stays unchanged. Handouts,
 * Non-Player Entities, and Items never show here.
 */
export function RunView({ campaignId, scene, onPresentSaved, onWallEntryAdded, onFinishedMeanwhile, onRollRequested }: RunViewProps) {
  const campaign = useCampaign(campaignId)

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
        <div className="min-w-0">
          <RunCard>
            <KeeperNotesRegion campaignId={campaignId} scene={scene} />
          </RunCard>
        </div>
        <div className="min-w-0">
          <RunCard>
            <RollRequestForm
              campaignId={campaignId}
              investigators={scene.investigatorsPresent}
              onRequested={onRollRequested}
              // A 409 refetches the Active Scene, which lands on the no-Active-Scene state when the Scene is gone.
              onNoActiveScene={onFinishedMeanwhile}
            />
          </RunCard>
        </div>
        <div className="min-w-0">
          <RunCard>
            <WaitingRolls campaignId={campaignId} />
          </RunCard>
        </div>
      </div>
      <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
        <div className="min-w-0">
          <RunCard>
            <InvestigatorsPresentSection campaignId={campaignId} scene={scene} onSaved={onPresentSaved} onFinishedMeanwhile={onFinishedMeanwhile} />
          </RunCard>
        </div>
        {campaign.data && (
          <div className="min-w-0 lg:order-first">
            <ActiveSceneWall campaignId={campaignId} viewerRole={campaign.data.role} onWallEntryAdded={onWallEntryAdded} />
          </div>
        )}
      </div>
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
