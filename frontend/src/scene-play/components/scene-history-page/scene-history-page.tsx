import { useCampaignMembers } from '@/campaign-play/hooks/useCampaignMembers'
import type { CampaignMember } from '@/campaign-play/types/CampaignMember'
import { SceneHistoryScene } from '@/scene-play/components/scene-history-scene/scene-history-scene'
import { useSceneHistory } from '@/scene-play/hooks/useSceneHistory'
import type { SceneHistory } from '@/scene-play/types/SceneHistory'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface SceneHistoryPageProps {
  campaignId: string
}

/**
 * The Scene History (specs/scene-play/ux.md section 23.11): every Active and Finished Scene of the Campaign, newest
 * started first. The Keeper sees every Reveal with its recipients, who was present, and every Roll Request; a Player
 * sees only the Reveals that reached their Investigator and the Public Roll Requests. The page shows its Skeleton
 * until the Campaign members (for the Keeper's display name) have loaded too. It refetches silently on its live
 * topics and announces nothing.
 */
export function SceneHistoryPage({ campaignId }: SceneHistoryPageProps) {
  const history = useSceneHistory(campaignId)
  const members = useCampaignMembers(campaignId)

  if (history.isError || members.isError) {
    return (
      <LoadFailed
        onRetry={() => {
          void history.refetch()
          void members.refetch()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-2xl font-semibold break-words">Scene History</h1>
        <p className="text-sm text-muted-foreground">{descriptionOf(history.data)}</p>
        {history.data !== undefined && <NoInvestigatorNote history={history.data} />}
      </div>
      {history.data === undefined || members.data === undefined ? (
        <Skeleton aria-busy="true" className="h-40 w-full max-w-2xl" />
      ) : history.data.scenes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No Scene has been played yet.</p>
      ) : (
        <HistoryScenes campaignId={campaignId} history={history.data} requestedByDisplayName={keeperName(members.data ?? [])} />
      )}
    </div>
  )
}

function descriptionOf(history: SceneHistory | undefined): string {
  if (history?.kind === 'player' && history.investigatorName !== null) {
    return `Every Scene played in this Campaign, what reached ${history.investigatorName}, and the Public rolls, newest first.`
  }
  return 'Every Scene played in this Campaign, newest first.'
}

/** A Player without an Approved Investigator sees the Scenes with no Reveals and one muted note. */
function NoInvestigatorNote({ history }: { history: SceneHistory }) {
  if (history.kind !== 'player' || history.investigatorName !== null) {
    return null
  }

  return (
    <Alert>
      <AlertDescription>You don&apos;t have an Approved Investigator in this Campaign yet, so no Reveals are shown.</AlertDescription>
    </Alert>
  )
}

/** The display name of the member with the Keeper role; only the Keeper can request a roll. */
function keeperName(members: CampaignMember[]): string {
  return members.find((member) => member.role === 'Keeper')?.displayName ?? ''
}

function HistoryScenes({
  campaignId,
  history,
  requestedByDisplayName,
}: {
  campaignId: string
  history: SceneHistory
  requestedByDisplayName: string
}) {
  const investigatorName = history.kind === 'player' ? history.investigatorName : null

  return (
    <>
      {history.scenes.map((scene) => (
        <SceneHistoryScene
          key={scene.sceneId}
          campaignId={campaignId}
          scene={scene}
          investigatorName={investigatorName}
          requestedByDisplayName={requestedByDisplayName}
        />
      ))}
    </>
  )
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive" role="alert" className="flex max-w-2xl flex-col items-start gap-3">
      <AlertDescription>We couldn&apos;t load the Scene History.</AlertDescription>
      <Button type="button" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </Alert>
  )
}
