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
 * The Scene History (specs/scene-play/ux.md section 23): every Active and Finished Scene of the Campaign, newest
 * started first. The Keeper sees every Reveal with its recipients and who was present; a Player sees only the Reveals
 * that reached their Investigator. The page refetches silently on its live topics and announces nothing.
 */
export function SceneHistoryPage({ campaignId }: SceneHistoryPageProps) {
  const history = useSceneHistory(campaignId)

  if (history.isError) {
    return <LoadFailed onRetry={() => void history.refetch()} />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-2xl font-semibold break-words">Scene History</h1>
        <p className="text-sm text-muted-foreground">{descriptionOf(history.data)}</p>
        {history.data !== undefined && <NoInvestigatorNote history={history.data} />}
      </div>
      {history.data === undefined ? (
        <Skeleton aria-busy="true" className="h-40 w-full max-w-2xl" />
      ) : history.data.scenes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No Scene has been played yet.</p>
      ) : (
        <HistoryScenes campaignId={campaignId} history={history.data} />
      )}
    </div>
  )
}

function descriptionOf(history: SceneHistory | undefined): string {
  if (history?.kind === 'player' && history.investigatorName !== null) {
    return `Every Scene played in this Campaign and what reached ${history.investigatorName}, newest first.`
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

function HistoryScenes({ campaignId, history }: { campaignId: string; history: SceneHistory }) {
  const investigatorName = history.kind === 'player' ? history.investigatorName : null

  return (
    <>
      {history.scenes.map((scene) => (
        <SceneHistoryScene key={scene.sceneId} campaignId={campaignId} scene={scene} investigatorName={investigatorName} />
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
