import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState, type RefObject } from 'react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { ScenarioForm } from '@/scenario-preparation/components/scenario-form/scenario-form'
import { ScenarioNotFound } from '@/scenario-preparation/components/scenario-not-found/scenario-not-found'
import { useEditScenario, useScenario } from '@/scenario-preparation/hooks/useScenarios'
import { ScenarioValidationError } from '@/scenario-preparation/services/scenarioApi'
import type { Scenario } from '@/scenario-preparation/types/Scenario'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface ScenarioPageProps {
  campaignId: string
  scenarioId: string
}

/**
 * One Scenario for its Keeper: a view with "Edit", or the form (specs/scenario-preparation/ux.md section 5). A Player,
 * an unknown id, and another Campaign's id all get the not-found page; a Player's client makes no request.
 */
export function ScenarioPage({ campaignId, scenarioId }: ScenarioPageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const scenario = useScenario(campaignId, scenarioId, isKeeper)

  if (!isKeeper || scenario.data === null) {
    return <ScenarioNotFound campaignId={campaignId} />
  }

  if (scenario.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this Scenario.</p>
        <Button type="button" variant="outline" onClick={() => void scenario.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!scenario.data) {
    return (
      <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return <ScenarioDetail campaignId={campaignId} scenario={scenario.data} />
}

interface ScenarioDetailProps {
  campaignId: string
  scenario: Scenario
}

function ScenarioDetail({ campaignId, scenario }: ScenarioDetailProps) {
  const navigationMessage = useRouterState({ select: (state) => state.location.state.statusMessage })
  const edit = useEditScenario(campaignId, scenario.id)
  const [isEditing, setIsEditing] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [returnedFromEdit, setReturnedFromEdit] = useState(false)
  const editButtonRef = useRef<HTMLButtonElement>(null)

  // The Edit button is mounted again when the form closes, so focus goes back to it afterwards.
  useEffect(() => {
    if (!isEditing && returnedFromEdit) {
      editButtonRef.current?.focus()
    }
  }, [isEditing, returnedFromEdit])

  const startEditing = () => {
    edit.reset()
    setJustSaved(false)
    setReturnedFromEdit(false)
    setIsEditing(true)
  }

  const stopEditing = (saved: boolean) => {
    setJustSaved(saved)
    setReturnedFromEdit(true)
    setIsEditing(false)
  }

  const validationError = edit.error instanceof ScenarioValidationError ? edit.error : null

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <p role="status" className="text-sm empty:hidden">
        {justSaved ? 'Scenario saved.' : navigationMessage}
      </p>
      <h1 className="text-2xl font-semibold break-words">{scenario.title}</h1>
      {isEditing ? (
        <ScenarioForm
          initialValues={{ title: scenario.title, keeperNotes: scenario.keeperNotes }}
          submitLabel="Save"
          busyLabel="Saving..."
          pending={edit.isPending}
          failureMessage={edit.isError && validationError === null ? "We couldn't save the Scenario. Try again." : null}
          serverErrors={validationError?.fieldErrors}
          autoFocusTitle
          cancel={
            <Button type="button" variant="outline" onClick={() => stopEditing(false)}>
              Cancel
            </Button>
          }
          onSubmit={(values) => edit.mutate(values, { onSuccess: () => stopEditing(true) })}
        />
      ) : (
        <ScenarioNotes scenario={scenario} editButtonRef={editButtonRef} onEdit={startEditing} />
      )}
    </div>
  )
}

interface ScenarioNotesProps {
  scenario: Scenario
  editButtonRef: RefObject<HTMLButtonElement | null>
  onEdit: () => void
}

function ScenarioNotes({ scenario, editButtonRef, onEdit }: ScenarioNotesProps) {
  return (
    <>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Keeper notes</h2>
        {scenario.keeperNotes === '' ? (
          <p className="text-sm text-muted-foreground">No Keeper notes yet.</p>
        ) : (
          <p className="text-sm break-words whitespace-pre-line">{scenario.keeperNotes}</p>
        )}
      </section>
      <Button ref={editButtonRef} type="button" variant="outline" className="self-start" onClick={onEdit}>
        Edit
      </Button>
    </>
  )
}
