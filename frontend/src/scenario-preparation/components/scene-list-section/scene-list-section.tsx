import { Link } from '@tanstack/react-router'
import { useId, useRef } from 'react'

import { MoveControls } from '@/scenario-preparation/components/move-controls/move-controls'
import { SceneStatusBadge } from '@/scenario-preparation/components/scene-status-badge/scene-status-badge'
import { SceneTimes } from '@/scenario-preparation/components/scene-times/scene-times'
import { usePreparedOrderReordering } from '@/scenario-preparation/hooks/usePreparedOrderReordering'
import { useReorderScenes, useScenes } from '@/scenario-preparation/hooks/useScenes'
import type { MoveDirection } from '@/scenario-preparation/services/preparedOrder'
import { StaleSceneOrderError } from '@/scenario-preparation/services/sceneApi'
import type { SceneSummary } from '@/scenario-preparation/types/Scene'
import { Alert } from '@/shared/components/ui/alert'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface SceneListSectionProps {
  campaignId: string
  scenarioId: string
}

/**
 * The Keeper's "Scenes" section on the Scenario page: the Scenario's Scenes in prepared order, each a link to its page
 * with its status and times, and Move up / Move down per row (specs/scenario-preparation/ux.md section 12). Mounted
 * for the Keeper only.
 */
export function SceneListSection({ campaignId, scenarioId }: SceneListSectionProps) {
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const list = useScenes(campaignId, scenarioId, true)
  const reordering = usePreparedOrderReordering({
    items: list.data,
    dataUpdatedAt: list.dataUpdatedAt,
    headingRef,
    reorder: useReorderScenes(campaignId, scenarioId),
    isStale: (error) => error instanceof StaleSceneOrderError,
    staleMessage: 'The Scenes changed in another window. Check the order and try again.',
    buttonIdPrefix: 'scene',
  })

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
          Scenes
        </h2>
        <Link
          to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/new"
          params={{ campaignId, scenarioId }}
          className={buttonVariants({ size: 'sm' })}
        >
          Create Scene
        </Link>
      </div>
      <p role="status" className="sr-only">
        {reordering.announcement}
      </p>
      {reordering.alert && (
        <Alert variant="destructive" role="alert">
          {reordering.alert}
        </Alert>
      )}
      <SceneListBody
        campaignId={campaignId}
        scenarioId={scenarioId}
        scenes={list.data}
        isPending={list.isPending}
        isError={list.isError}
        onRetry={() => void list.refetch()}
        saving={reordering.pending}
        onMove={reordering.move}
      />
    </section>
  )
}

interface SceneListBodyProps {
  campaignId: string
  scenarioId: string
  scenes: SceneSummary[] | undefined
  isPending: boolean
  isError: boolean
  onRetry: () => void
  saving: boolean
  onMove: (sceneId: string, direction: MoveDirection) => void
}

function SceneListBody({ campaignId, scenarioId, scenes, isPending, isError, onRetry, saving, onMove }: SceneListBodyProps) {
  if (isPending) {
    return (
      <Card aria-busy="true" className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-full max-w-sm" />
        <Skeleton className="h-5 w-full max-w-xs" />
      </Card>
    )
  }

  if (isError || !scenes) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm">We couldn&apos;t load the Scenes.</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }

  if (scenes.length === 0) {
    return <p className="text-sm text-muted-foreground">No Scenes yet.</p>
  }

  return (
    <Card>
      <ol className="list-decimal divide-y pr-2 pl-10">
        {scenes.map((scene, index) => (
          <li key={scene.id} className="py-1 pl-1">
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
                <Link
                  to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId"
                  params={{ campaignId, scenarioId, sceneId: scene.id }}
                  className="min-h-6 text-sm font-medium break-words hover:underline"
                >
                  {scene.title}
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <SceneStatusBadge status={scene.status} />
                  <SceneTimes startedAt={scene.startedAt} finishedAt={scene.finishedAt} />
                </div>
              </div>
              {scenes.length > 1 && (
                <MoveControls
                  itemId={scene.id}
                  title={scene.title}
                  isFirst={index === 0}
                  isLast={index === scenes.length - 1}
                  saving={saving}
                  buttonIdPrefix="scene"
                  onMove={onMove}
                />
              )}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}
