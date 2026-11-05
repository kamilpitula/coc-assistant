import { Link } from '@tanstack/react-router'
import { useRef, useState, type Ref } from 'react'

import { SceneStatusBadge } from '@/scenario-preparation/components/scene-status-badge/scene-status-badge'
import { SceneTimes } from '@/scenario-preparation/components/scene-times/scene-times'
import { FinishSceneDialog } from '@/scene-play/components/finish-scene-dialog/finish-scene-dialog'
import { useFinishActiveScene } from '@/scene-play/hooks/useActiveScene'
import { NoActiveSceneError } from '@/scene-play/services/activeSceneApi'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { Button } from '@/shared/components/ui/button'

interface ActiveSceneHeaderProps {
  campaignId: string
  scene: KeeperActiveScene
  /** The sub-tabs other than Run hide the Scenario and location line (specs/scene-play/ux.md section 21.2). */
  compact: boolean
  headingRef: Ref<HTMLHeadingElement>
  /** The Scene was finished here: the page shows "{title} finished." and the no-Active-Scene state. */
  onFinished: (title: string) => void
  /** The Scene had been finished elsewhere: the page says so and refetches. */
  onAlreadyFinished: () => void
}

/**
 * The Keeper's scene header on the Active Scene (specs/scene-play/ux.md section 21.2): the title with "Finish Scene"
 * beside it, the status line, and on Run only the Scenario with "Open in Scenario" and the location. "Finish Scene"
 * is on every sub-tab; its dialog and outcomes are section 3's.
 */
export function ActiveSceneHeader({ campaignId, scene, compact, headingRef, onFinished, onAlreadyFinished }: ActiveSceneHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold break-words outline-none">
          {scene.title}
        </h1>
        <FinishControl campaignId={campaignId} title={scene.title} onFinished={onFinished} onAlreadyFinished={onAlreadyFinished} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <SceneStatusBadge status="Active" />
        <SceneTimes startedAt={scene.startedAt} finishedAt={null} />
      </div>
      {!compact && (
        <>
          <p className="flex flex-wrap items-baseline gap-x-3 text-sm text-muted-foreground">
            <span className="break-words">Scenario: {scene.scenarioTitle}</span>
            <Link
              to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId"
              params={{ campaignId, scenarioId: scene.scenarioId, sceneId: scene.sceneId }}
              className="text-foreground underline"
            >
              Open in Scenario
            </Link>
          </p>
          {scene.location !== '' && (
            <dl className="flex flex-wrap gap-x-3 text-sm">
              <dt className="font-medium">Location</dt>
              <dd className="break-words">{scene.location}</dd>
            </dl>
          )}
        </>
      )}
    </div>
  )
}

interface FinishControlProps {
  campaignId: string
  title: string
  onFinished: (title: string) => void
  onAlreadyFinished: () => void
}

function FinishControl({ campaignId, title, onFinished, onAlreadyFinished }: FinishControlProps) {
  const [open, setOpen] = useState(false)
  const finish = useFinishActiveScene(campaignId)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const closedByFinish = useRef(false)

  const confirm = () =>
    finish.mutate(undefined, {
      onSuccess: () => {
        closedByFinish.current = true
        setOpen(false)
        onFinished(title)
      },
      onError: (error) => {
        if (error instanceof NoActiveSceneError) {
          closedByFinish.current = true
          setOpen(false)
          onAlreadyFinished()
        }
      },
    })

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        className="text-destructive"
        onClick={() => {
          finish.reset()
          closedByFinish.current = false
          setOpen(true)
        }}
      >
        Finish Scene
      </Button>
      <FinishSceneDialog
        open={open}
        sceneTitle={title}
        pending={finish.isPending}
        failed={finish.isError && !(finish.error instanceof NoActiveSceneError)}
        onConfirm={confirm}
        onCancel={() => {
          finish.reset()
          setOpen(false)
        }}
        onCloseAutoFocus={(event) => {
          // After a finish the page moves focus to the h1; after Cancel it returns to the button.
          event.preventDefault()
          if (!closedByFinish.current) {
            buttonRef.current?.focus()
          }
        }}
      />
    </>
  )
}
