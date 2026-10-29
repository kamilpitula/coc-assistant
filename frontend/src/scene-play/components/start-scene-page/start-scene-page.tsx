import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type Ref } from 'react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import { useCampaignMembers } from '@/campaign-play/hooks/useCampaignMembers'
import { SceneNotFound } from '@/scenario-preparation/components/scene-not-found/scene-not-found'
import { useScenario } from '@/scenario-preparation/hooks/useScenarios'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { InvestigatorsPresentFieldset } from '@/scene-play/components/investigators-present-fieldset/investigators-present-fieldset'
import { useActiveScene, useStartScene } from '@/scene-play/hooks/useActiveScene'
import { approvedInvestigatorsFrom, initialSelection, toggled } from '@/scene-play/services/presentSelection'
import { refusalFor, validateStart, type StartErrors } from '@/scene-play/services/startSceneForm'
import type { Scene } from '@/scenario-preparation/types/Scene'
import type { ApprovedInvestigator, KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { Alert } from '@/shared/components/ui/alert'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Label } from '@/shared/components/ui/label'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface StartScenePageProps {
  campaignId: string
  scenarioId: string
  sceneId: string
}

/**
 * The Keeper starts a Prepared Scene (specs/scene-play/ux.md section 2): choose the Investigators present and, while another
 * Scene is Active, whether to finish it first. A Player, an unknown Scene, and another Scenario's or Campaign's Scene all get
 * the not-found page; a Player's client makes no request.
 */
export function StartScenePage({ campaignId, scenarioId, sceneId }: StartScenePageProps) {
  const campaign = useCampaign(campaignId)

  return campaign.data?.role === 'Keeper' ? (
    <KeeperStartScene campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} />
  ) : (
    <SceneNotFound campaignId={campaignId} />
  )
}

function KeeperStartScene({ campaignId, scenarioId, sceneId }: StartScenePageProps) {
  const scene = useScene(campaignId, scenarioId, sceneId, true)
  const scenario = useScenario(campaignId, scenarioId, true)
  const members = useCampaignMembers(campaignId)
  const active = useActiveScene(campaignId)

  if (scene.data === null) {
    return <SceneNotFound campaignId={campaignId} />
  }

  if ([scene, scenario, members, active].some((query) => query.isError)) {
    return <LoadFailed onRetry={() => [scene, scenario, members, active].forEach((query) => void query.refetch())} />
  }

  if (!scene.data || !scenario.data || members.data === undefined || active.data === undefined) {
    return <StartSceneSkeleton />
  }

  return (
    <StartSceneContent
      campaignId={campaignId}
      scenarioId={scenarioId}
      scene={scene.data}
      scenarioTitle={scenario.data.title}
      approved={approvedInvestigatorsFrom(members.data)}
      active={active.data?.kind === 'keeper' ? active.data : null}
      onSceneRefused={() => void scene.refetch()}
      onActiveChanged={() => void active.refetch()}
      onRosterChanged={() => void members.refetch()}
    />
  )
}

interface StartSceneContentProps {
  campaignId: string
  scenarioId: string
  scene: Scene
  scenarioTitle: string
  approved: ApprovedInvestigator[]
  active: KeeperActiveScene | null
  onSceneRefused: () => void
  onActiveChanged: () => void
  onRosterChanged: () => void
}

function StartSceneContent({ campaignId, scenarioId, scene, scenarioTitle, approved, active, onSceneRefused, onActiveChanged, onRosterChanged }: StartSceneContentProps) {
  if (scene.status !== 'Prepared') {
    return <AlreadyStarted campaignId={campaignId} scenarioId={scenarioId} sceneId={scene.id} title={scene.title} isActive={scene.status === 'Active'} />
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <BackToScene campaignId={campaignId} scenarioId={scenarioId} sceneId={scene.id} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold break-words">Start {scene.title}</h1>
        <p className="text-sm text-muted-foreground break-words">Scenario: {scenarioTitle}</p>
      </div>
      {approved.length === 0 ? (
        <NoApprovedInvestigator campaignId={campaignId} />
      ) : (
        <StartSceneForm
          campaignId={campaignId}
          scenarioId={scenarioId}
          sceneId={scene.id}
          sceneTitle={scene.title}
          approved={approved}
          active={active}
          onSceneRefused={onSceneRefused}
          onActiveChanged={onActiveChanged}
          onRosterChanged={onRosterChanged}
        />
      )}
    </div>
  )
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm">We couldn&apos;t load this Scene.</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

function StartSceneSkeleton() {
  return (
    <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
    </div>
  )
}

function BackToScene({ campaignId, scenarioId, sceneId }: StartScenePageProps) {
  return (
    <Link
      to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId"
      params={{ campaignId, scenarioId, sceneId }}
      className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}
    >
      <ArrowLeft aria-hidden="true" />
      Back to the Scene
    </Link>
  )
}

interface AlreadyStartedProps extends StartScenePageProps {
  title: string
  isActive: boolean
}

function AlreadyStarted({ campaignId, scenarioId, sceneId, title, isActive }: AlreadyStartedProps) {
  return (
    <section className="flex max-w-2xl flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold break-words">{title} has already been started</h1>
      {isActive ? (
        <Link to="/campaigns/$campaignId/active-scene" params={{ campaignId }} className={buttonVariants({ variant: 'link', className: 'px-0' })}>
          Open Active Scene
        </Link>
      ) : (
        <BackToScene campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} />
      )}
    </section>
  )
}

function NoApprovedInvestigator({ campaignId }: { campaignId: string }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm">No Investigator is Approved yet. Approve an Investigator before starting a Scene.</p>
      <Link to="/campaigns/$campaignId" params={{ campaignId }} className={buttonVariants({ variant: 'link', className: 'px-0' })}>
        Back to your Campaign
      </Link>
    </div>
  )
}

interface StartSceneFormProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  sceneTitle: string
  approved: ApprovedInvestigator[]
  active: KeeperActiveScene | null
  onSceneRefused: () => void
  onActiveChanged: () => void
  onRosterChanged: () => void
}

function StartSceneForm({ campaignId, scenarioId, sceneId, sceneTitle, approved, active, onSceneRefused, onActiveChanged, onRosterChanged }: StartSceneFormProps) {
  const navigate = useNavigate()
  const start = useStartScene(campaignId, sceneId)
  const [selection, setSelection] = useState(() => initialSelection(approved, active))
  const [finishChecked, setFinishChecked] = useState(false)
  const [errors, setErrors] = useState<StartErrors>({})
  const finishRef = useRef<HTMLButtonElement>(null)
  const firstInvestigatorRef = useRef<HTMLButtonElement>(null)
  const focusFinishPending = useRef(false)
  const refusal = refusalFor(start.error)
  const notice = active !== null && active.sceneId !== sceneId ? active : null

  // The notice of an Active Scene that appeared meanwhile is mounted before focus can move to its checkbox.
  useEffect(() => {
    if (focusFinishPending.current && notice) {
      finishRef.current?.focus()
      focusFinishPending.current = false
    }
  }, [notice])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateStart(selection, notice?.title ?? null, finishChecked)
    setErrors(found)
    if (found.finish || found.present) {
      ;(found.finish ? finishRef : firstInvestigatorRef).current?.focus()
      return
    }

    start.mutate(
      { presentInvestigatorIds: approved.filter((investigator) => selection.includes(investigator.id)).map((investigator) => investigator.id), finishActiveScene: finishChecked },
      {
        onSuccess: () =>
          void navigate({ to: '/campaigns/$campaignId/active-scene', params: { campaignId }, state: { statusMessage: `${sceneTitle} started.` } }),
        onError: (error) => {
          const kind = refusalFor(error)?.kind
          if (kind === 'not-prepared') {
            onSceneRefused()
          } else if (kind === 'another-active') {
            onActiveChanged()
            focusFinishPending.current = true
            finishRef.current?.focus()
          } else if (kind === 'investigators') {
            onRosterChanged()
          }
        },
      },
    )
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6">
      {notice && (
        <FinishFirstNotice
          title={notice.title}
          checked={finishChecked}
          error={errors.finish}
          checkboxRef={finishRef}
          onChange={(checked) => {
            setFinishChecked(checked)
            setErrors((current) => ({ ...current, finish: undefined }))
          }}
        />
      )}
      <InvestigatorsPresentFieldset
        investigators={approved}
        selected={selection}
        error={errors.present}
        firstCheckboxRef={firstInvestigatorRef}
        onToggle={(id, checked) => {
          setSelection((current) => toggled(current, id, checked))
          setErrors((current) => ({ ...current, present: undefined }))
        }}
      />
      {refusal && (
        <Alert variant="destructive" role="alert">
          <p>{refusal.message}</p>
          {refusal.kind === 'not-prepared' && (
            <BackToScene campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} />
          )}
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={start.isPending}>
          {start.isPending ? 'Starting...' : 'Start Scene'}
        </Button>
        <Link
          to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId"
          params={{ campaignId, scenarioId, sceneId }}
          className={buttonVariants({ variant: 'link' })}
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}

interface FinishFirstNoticeProps {
  title: string
  checked: boolean
  error: string | undefined
  checkboxRef: Ref<HTMLButtonElement>
  onChange: (checked: boolean) => void
}

function FinishFirstNotice({ title, checked, error, checkboxRef, onChange }: FinishFirstNoticeProps) {
  const errorId = 'finish-first-error'

  return (
    <section aria-labelledby="active-notice-heading" className="flex flex-col gap-2 rounded-lg border p-4">
      <h2 id="active-notice-heading" className="text-base font-semibold break-words">
        {title} is the Active Scene
      </h2>
      <p className="text-sm text-muted-foreground">Only one Scene can be Active. A Finished Scene can&apos;t be started again.</p>
      <div className="flex min-h-6 items-start gap-2">
        <Checkbox
          id="finish-first"
          ref={checkboxRef}
          className="mt-1"
          checked={checked}
          onCheckedChange={(next) => onChange(next === true)}
          aria-invalid={error !== undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <Label htmlFor="finish-first" className="font-normal leading-6 break-words">
          Finish {title} first
        </Label>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
