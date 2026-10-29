import { useEffect, useRef, useState } from 'react'

import { useCampaignMembers } from '@/campaign-play/hooks/useCampaignMembers'
import { InvestigatorsPresentFieldset } from '@/scene-play/components/investigators-present-fieldset/investigators-present-fieldset'
import { useChangeInvestigatorsPresent } from '@/scene-play/hooks/useActiveScene'
import { presentRefusalFor } from '@/scene-play/services/presentRefusal'
import { approvedInvestigatorsFrom, initialSelection, toggled } from '@/scene-play/services/presentSelection'
import { EMPTY_SELECTION_MESSAGE } from '@/scene-play/services/startSceneForm'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { Alert } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'

interface InvestigatorsPresentSectionProps {
  campaignId: string
  scene: KeeperActiveScene
  /** Called after a successful save, so the page can say "Investigators present saved.". */
  onSaved: () => void
  /** Called when the Keeper leaves a change that found the Scene finished, so the page can refetch. */
  onFinishedMeanwhile: () => void
}

/** The Keeper's Investigators present: a list with "Change", which swaps in the start page's fieldset (specs/scene-play/ux.md section 3). */
export function InvestigatorsPresentSection({ campaignId, scene, onSaved, onFinishedMeanwhile }: InvestigatorsPresentSectionProps) {
  const members = useCampaignMembers(campaignId)
  const change = useChangeInvestigatorsPresent(campaignId)
  const approved = approvedInvestigatorsFrom(members.data)
  const [isEditing, setIsEditing] = useState(false)
  const [selection, setSelection] = useState<string[]>([])
  const [emptyError, setEmptyError] = useState(false)
  const [returned, setReturned] = useState(false)
  const changeRef = useRef<HTMLButtonElement>(null)
  const firstCheckboxRef = useRef<HTMLButtonElement>(null)
  const refusal = presentRefusalFor(change.error)

  // Each button is mounted after the state change, so focus moves in an effect (SPL-A11Y-3).
  useEffect(() => {
    if (isEditing) {
      firstCheckboxRef.current?.focus()
    } else if (returned) {
      changeRef.current?.focus()
    }
  }, [isEditing, returned])

  const open = () => {
    change.reset()
    setSelection(initialSelection(approved, scene))
    setEmptyError(false)
    setReturned(false)
    setIsEditing(true)
  }

  const close = (saved: boolean) => {
    if (!saved && refusal?.kind === 'finished') {
      onFinishedMeanwhile()
    }
    setReturned(true)
    setIsEditing(false)
  }

  const save = () => {
    if (selection.length === 0) {
      setEmptyError(true)
      firstCheckboxRef.current?.focus()
      return
    }

    change.mutate(
      approved.filter((investigator) => selection.includes(investigator.id)).map((investigator) => investigator.id),
      {
        onSuccess: () => {
          onSaved()
          close(true)
        },
      },
    )
  }

  return (
    <section aria-labelledby="investigators-present-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="investigators-present-heading" className="text-lg font-semibold">
          Investigators present
        </h2>
        {!isEditing && (
          <Button ref={changeRef} type="button" variant="outline" size="sm" onClick={open}>
            Change
          </Button>
        )}
      </div>
      {isEditing ? (
        <div className="flex flex-col gap-4">
          <InvestigatorsPresentFieldset
            investigators={approved}
            selected={selection}
            error={emptyError ? EMPTY_SELECTION_MESSAGE : undefined}
            firstCheckboxRef={firstCheckboxRef}
            disabled={change.isPending}
            onToggle={(id, checked) => {
              setSelection((current) => toggled(current, id, checked))
              setEmptyError(false)
            }}
          />
          {refusal && (
            <Alert variant="destructive" role="alert">
              {refusal.message}
            </Alert>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={change.isPending} onClick={save}>
              {change.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <ul className="list-disc pl-5 text-sm">
          {scene.investigatorsPresent.map((investigator) => (
            <li key={investigator.id} className="break-words">
              {investigator.name ?? 'Unnamed Investigator'}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
