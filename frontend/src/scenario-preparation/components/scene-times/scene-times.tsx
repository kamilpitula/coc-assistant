import { formatSceneTime } from '@/scenario-preparation/services/sceneTime'

interface SceneTimesProps {
  startedAt: string | null
  finishedAt: string | null
}

function Moment({ label, iso }: { label: string; iso: string }) {
  return (
    <span>
      {label} <time dateTime={iso}>{formatSceneTime(iso)}</time>
    </span>
  )
}

/** "Started ..." and "Finished ...", each only once it is set (SP-UX-21, SP-A11Y-11). */
export function SceneTimes({ startedAt, finishedAt }: SceneTimesProps) {
  if (!startedAt && !finishedAt) {
    return null
  }

  return (
    <span className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
      {startedAt && <Moment label="Started" iso={startedAt} />}
      {finishedAt && <Moment label="Finished" iso={finishedAt} />}
    </span>
  )
}
