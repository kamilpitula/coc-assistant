import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { useDeleteInvestigator, useSaveCharacterSheet, useSubmitInvestigator } from '@/campaign-play/hooks/useMyInvestigator'
import { errorsOfStep } from '@/campaign-play/services/visibleErrors'
import { stepStates, WIZARD_STEPS, type WizardStep } from '@/campaign-play/services/wizardProgress'
import type { CharacterSheetInputs, ValidationError } from '@/campaign-play/types/CharacterSheet'
import type { MyCharacterSheet } from '@/campaign-play/types/Investigator'
import '@/campaign-play/types/navigationState'

/** How the Player leaves a step (specs/character-sheet/ux.md sections 4.3 and 5.1). */
export type WizardMove =
  | { kind: 'continue' }
  | { kind: 'back' }
  | { kind: 'exit' }
  | { kind: 'stepper'; target: WizardStep }

export type PendingAction = WizardMove['kind'] | 'submit' | 'delete'

/** An action that saves first and can be retried after its save failed: a move, or Submit to Keeper (ux.md 6.7). */
export type SavingAction = WizardMove | { kind: 'submit' }

const LATER_STEPS_MESSAGE = 'Some later steps need attention.'

function neighbour(step: WizardStep, offset: number): WizardStep {
  const index = WIZARD_STEPS.findIndex((candidate) => candidate.id === step)
  return WIZARD_STEPS[Math.min(WIZARD_STEPS.length - 1, Math.max(0, index + offset))].id
}

function targetOf(move: WizardMove, step: WizardStep): WizardStep | null {
  switch (move.kind) {
    case 'continue':
      return neighbour(step, 1)
    case 'back':
      return neighbour(step, -1)
    case 'stepper':
      return move.target
    default:
      return null
  }
}

/** True when a step after the current one needs attention now but did not before the save (ux.md section 5.4). */
function laterStepsNewlyNeedAttention(before: MyCharacterSheet, after: MyCharacterSheet, step: WizardStep): boolean {
  const previous = stepStates(before.characterSheet, before.validationErrors)
  const next = stepStates(after.characterSheet, after.validationErrors)
  const later = WIZARD_STEPS.slice(WIZARD_STEPS.findIndex((candidate) => candidate.id === step) + 1)
  return later.some(({ id }) => next[id] === 'needsAttention' && previous[id] !== 'needsAttention')
}

interface WizardMovesOptions {
  campaignId: string
  step: WizardStep
  sheet: MyCharacterSheet
  /** Called after a save that keeps the Player on the step, with the step's remaining errors. */
  onStayWithErrors: (errors: ValidationError[]) => void
  /** Called after a successful save, with what was saved. */
  onSaved: (saved: CharacterSheetInputs) => void
  /** Called when a submission is rejected, with every remaining error. */
  onSubmitRejected: (errors: ValidationError[]) => void
}

/** Saving, moving between steps, submitting, and starting over (ux.md sections 4.3, 5.1, 5.5, and 6.7). */
export function useWizardMoves({ campaignId, step, sheet, onStayWithErrors, onSaved, onSubmitRejected }: WizardMovesOptions) {
  const navigate = useNavigate()
  const save = useSaveCharacterSheet(campaignId)
  const submit = useSubmitInvestigator(campaignId)
  const remove = useDeleteInvestigator(campaignId)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [failedMove, setFailedMove] = useState<SavingAction | null>(null)
  const [actionFailed, setActionFailed] = useState(false)

  const toCampaignPage = (statusMessage: string) =>
    void navigate({ to: '/campaigns/$campaignId', params: { campaignId }, state: { statusMessage } })

  const toStep = (target: WizardStep, statusMessage?: string) =>
    void navigate({
      to: '/campaigns/$campaignId/investigator/$step',
      params: { campaignId, step: target },
      state: { statusMessage },
    })

  const finishMove = (move: WizardMove, saved: MyCharacterSheet) => {
    const stepErrors = errorsOfStep(saved.validationErrors, step)
    if (move.kind === 'continue' && stepErrors.length > 0) {
      onStayWithErrors(stepErrors)
      return
    }

    const target = targetOf(move, step)
    const message = laterStepsNewlyNeedAttention(sheet, saved, step) ? LATER_STEPS_MESSAGE : undefined
    if (target === null) {
      toCampaignPage('Draft saved.')
    } else {
      toStep(target, message)
    }
  }

  const move = async (requested: WizardMove, inputs: CharacterSheetInputs) => {
    setPending(requested.kind)
    setFailedMove(null)
    try {
      const saved = await save.mutateAsync(inputs)
      onSaved(inputs)
      finishMove(requested, saved)
    } catch {
      setFailedMove(requested)
    } finally {
      setPending(null)
    }
  }

  // ux.md 6.7: Submit to Keeper saves the step's inputs first; a failed save submits nothing.
  const saveBeforeSubmit = async (inputs: CharacterSheetInputs): Promise<boolean> => {
    try {
      await save.mutateAsync(inputs)
      onSaved(inputs)
      return true
    } catch {
      setFailedMove({ kind: 'submit' })
      return false
    }
  }

  const submitToKeeper = async (inputs: CharacterSheetInputs) => {
    setPending('submit')
    setActionFailed(false)
    setFailedMove(null)
    try {
      if (!(await saveBeforeSubmit(inputs))) {
        return
      }

      const result = await submit.mutateAsync()
      if (result.kind === 'invalid') {
        onSubmitRejected(result.validationErrors.filter((error) => error.severity === 'Error'))
      } else {
        toCampaignPage('Submitted. Your Keeper will review your Investigator.')
      }
    } catch {
      setActionFailed(true)
    } finally {
      setPending(null)
    }
  }

  const startOver = async () => {
    setPending('delete')
    setActionFailed(false)
    try {
      await remove.mutateAsync()
      toCampaignPage('Draft deleted.')
    } catch {
      setActionFailed(true)
    } finally {
      setPending(null)
    }
  }

  /** Repeats the action whose save failed, with the current inputs. */
  const retry = (inputs: CharacterSheetInputs) =>
    failedMove?.kind === 'submit' ? submitToKeeper(inputs) : failedMove ? move(failedMove, inputs) : Promise.resolve()

  return { move, submitToKeeper, retry, startOver, toStep, pending, failedMove, actionFailed }
}
