import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { useDeleteInvestigator, useMyCharacterSheet, useRollCharacteristics, useRollEduImprovementCheck, useRollLuck, useSaveCharacterSheet, useSubmitInvestigator } from '@/campaign-play/hooks/useMyInvestigator'
import { InvestigatorConflictError } from '@/campaign-play/services/investigatorApi'
import { errorsOfStep } from '@/campaign-play/services/visibleErrors'
import { stepStates, WIZARD_STEPS, type WizardStep } from '@/campaign-play/services/wizardProgress'
import { inputsFromSheet } from '@/campaign-play/state/characterSheetForm'
import type { CharacterSheetInputs, ValidationError } from '@/campaign-play/types/CharacterSheet'
import { CHARACTERISTIC_CODES } from '@/campaign-play/types/CharacterSheet'
import type { MyCharacterSheet } from '@/campaign-play/types/Investigator'
import '@/campaign-play/types/navigationState'

/** The creation roll groups (specs/character-sheet/ux.md section 6.8), each with its own endpoint and results. */
export type CreationRollGroup = 'characteristics' | 'luck' | 'eduImprovementCheck'

/** The descriptor table (D8): what sending each group's roll means and what counts as its results. */
const ROLL_GROUPS: Record<
  CreationRollGroup,
  {
    /** True when the reloaded sheet already has this group's results, so a 409 means "already rolled". */
    hasResults: (sheet: MyCharacterSheet) => boolean
  }
> = {
  characteristics: {
    hasResults: (sheet) =>
      CHARACTERISTIC_CODES.every((code) => sheet.characterSheet.characteristics[code].assigned !== null),
  },
  luck: {
    hasResults: (sheet) => sheet.characterSheet.luckRolls.some((roll) => roll !== null),
  },
  eduImprovementCheck: {
    hasResults: (sheet) => sheet.characterSheet.ageEffects.eduImprovementChecks.length > 0,
  },
}

/** How the Player leaves a step (specs/character-sheet/ux.md sections 4.3 and 5.1). */
export type WizardMove =
  | { kind: 'continue' }
  | { kind: 'back' }
  | { kind: 'exit' }
  | { kind: 'stepper'; target: WizardStep }

export type PendingAction = WizardMove['kind'] | 'submit' | 'delete'

/** Where a creation roll stands (specs/character-sheet/ux.md section 6.8); one roll is pending at a time. */
export type RollStatus = {
  state: 'idle' | 'pending' | 'rolled' | 'saveFailed' | 'rollFailed' | 'saveConflict' | 'rollConflict' | 'alreadyRolled'
  /** The group the status belongs to; null before any roll. */
  group: CreationRollGroup | null
}

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
  const rollers = {
    characteristics: useRollCharacteristics(campaignId),
    luck: useRollLuck(campaignId),
    eduImprovementCheck: useRollEduImprovementCheck(campaignId),
  }
  const sheetQuery = useMyCharacterSheet(campaignId)
  const submit = useSubmitInvestigator(campaignId)
  const remove = useDeleteInvestigator(campaignId)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [failedMove, setFailedMove] = useState<SavingAction | null>(null)
  const [moveConflict, setMoveConflict] = useState(false)
  const [actionFailed, setActionFailed] = useState(false)
  const [rollStatus, setRollStatus] = useState<RollStatus>({ state: 'idle', group: null })

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
    setMoveConflict(false)
    try {
      const saved = await save.mutateAsync(inputs)
      onSaved(inputs)
      finishMove(requested, saved)
    } catch (error) {
      if (error instanceof InvestigatorConflictError) {
        await reloadSheet()
        setMoveConflict(true)
      } else {
        setFailedMove(requested)
      }
    } finally {
      setPending(null)
    }
  }

  // ux.md 6.7: Submit to Keeper saves the step's inputs first; a failed save submits nothing. A 409 reloads instead
  // of offering a retry, which would resend the refused inputs.
  const saveBeforeSubmit = async (inputs: CharacterSheetInputs): Promise<boolean> => {
    try {
      await save.mutateAsync(inputs)
      onSaved(inputs)
      return true
    } catch (error) {
      if (error instanceof InvestigatorConflictError) {
        await reloadSheet()
        setMoveConflict(true)
      } else {
        setFailedMove({ kind: 'submit' })
      }

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

  /** Reloads the sheet and resets the form to it, after a 409 (ux.md section 6.8). */
  const reloadSheet = async (): Promise<MyCharacterSheet | null> => {
    const fresh = (await sheetQuery.refetch()).data ?? null
    if (fresh) {
      onSaved(inputsFromSheet(fresh.characterSheet))
    }

    return fresh
  }

  /** Saves the step's inputs first, without leaving the step; a 409 reloads the sheet instead. */
  const saveBeforeRoll = async (toSave: CharacterSheetInputs, group: CreationRollGroup): Promise<boolean> => {
    try {
      await save.mutateAsync(toSave)
      onSaved(toSave)
      return true
    } catch (error) {
      if (error instanceof InvestigatorConflictError) {
        await reloadSheet()
        setRollStatus({ state: 'saveConflict', group })
      } else {
        setRollStatus({ state: 'saveFailed', group })
      }

      return false
    }
  }

  /** Sends the roll without the dialog, after a 409 shows what the reload found. */
  const reloadAfterRollConflict = async (group: CreationRollGroup): Promise<void> => {
    const fresh = await reloadSheet()
    const hasResults = fresh !== null && ROLL_GROUPS[group].hasResults(fresh)
    setRollStatus({ state: hasResults ? 'alreadyRolled' : 'rollConflict', group })
  }

  /** Sends the group's roll; the caller saved first, or the save already succeeded on a retry. */
  const sendRoll = async (group: CreationRollGroup): Promise<void> => {
    try {
      const rolled = await rollers[group].mutateAsync()
      onSaved(inputsFromSheet(rolled.characterSheet))
      setRollStatus({ state: 'rolled', group })
    } catch (error) {
      if (error instanceof InvestigatorConflictError) {
        await reloadAfterRollConflict(group)
      } else {
        setRollStatus({ state: 'rollFailed', group })
      }
    }
  }

  /**
   * Rolls the group's missing results (ux.md section 6.8): saves the step's inputs and stays, then sends the roll.
   * A 409 reloads the sheet and keeps the Player on the step. One confirmation sends one roll.
   */
  const roll = async (group: CreationRollGroup, toSave: CharacterSheetInputs): Promise<void> => {
    if (rollStatus.state === 'pending') {
      return
    }

    setRollStatus({ state: 'pending', group })
    if (await saveBeforeRoll(toSave, group)) {
      await sendRoll(group)
    }
  }

  /** Retries a failed roll without the dialog (the save already succeeded). */
  const retryRoll = async (): Promise<void> => {
    if (rollStatus.state === 'pending' || rollStatus.group === null) {
      return
    }

    const { group } = rollStatus
    setRollStatus({ state: 'pending', group })
    await sendRoll(group)
  }

  return { move, submitToKeeper, retry, startOver, toStep, roll, retryRoll, pending, failedMove, moveConflict, actionFailed, rollStatus }
}
