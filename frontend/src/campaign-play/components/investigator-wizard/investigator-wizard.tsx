import { Link, useRouterState } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react'

import { AgeEffectsStep } from '@/campaign-play/components/age-effects-step/age-effects-step'
import { CharacterSheetView } from '@/campaign-play/components/character-sheet-view/character-sheet-view'
import { CharacteristicsStep } from '@/campaign-play/components/characteristics-step/characteristics-step'
import { IdentityStep } from '@/campaign-play/components/identity-step/identity-step'
import { InvestigatorCreationStepper } from '@/campaign-play/components/investigator-creation-stepper/investigator-creation-stepper'
import { InvestigatorNotFound } from '@/campaign-play/components/investigator-not-found/investigator-not-found'
import { InvestigatorStatusBadge } from '@/campaign-play/components/investigator-status-badge/investigator-status-badge'
import { InvestigatorSummary } from '@/campaign-play/components/investigator-summary/investigator-summary'
import { OccupationSkillsStep } from '@/campaign-play/components/occupation-skills-step/occupation-skills-step'
import { OccupationStep } from '@/campaign-play/components/occupation-step/occupation-step'
import { PersonalInterestsStep } from '@/campaign-play/components/personal-interests-step/personal-interests-step'
import { StartOverDialog } from '@/campaign-play/components/start-over-dialog/start-over-dialog'
import { WorthCheckingAlert } from '@/campaign-play/components/worth-checking-alert/worth-checking-alert'
import { ValidationErrorSummary } from '@/campaign-play/components/validation-error-summary/validation-error-summary'
import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import { useMyCharacterSheet } from '@/campaign-play/hooks/useMyInvestigator'
import { useOccupationCatalog, useSkillCatalog } from '@/campaign-play/hooks/useRuleData'
import { useWizardMoves, type PendingAction, type WizardMove } from '@/campaign-play/hooks/useWizardMoves'
import { validateCharacterSheet } from '@/campaign-play/services/characterSheetValidation'
import { fieldId } from '@/campaign-play/services/fieldIds'
import { valuesLeft } from '@/campaign-play/services/quickFireValues'
import { inlineErrorsForStep, isFieldTouched, mergeClientAndServerErrors } from '@/campaign-play/services/visibleErrors'
import { stepOfField, stepStates, WIZARD_STEPS, type WizardStep } from '@/campaign-play/services/wizardProgress'
import { characterSheetFormReducer, inputsForSave, inputsFromSheet } from '@/campaign-play/state/characterSheetForm'
import type { CreationMethod } from '@/campaign-play/types/Campaign'
import type { CharacterSheetInputs, CharacterSheetView as CharacterSheetData, ValidationError } from '@/campaign-play/types/CharacterSheet'
import type { MyCharacterSheet } from '@/campaign-play/types/Investigator'
import type { OccupationCatalog, SkillCatalog } from '@/campaign-play/types/RuleData'
import '@/campaign-play/types/navigationState'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useUnsavedChangesPrompt } from '@/shared/hooks/useUnsavedChangesPrompt'

interface InvestigatorWizardProps {
  campaignId: string
  step: WizardStep
}

/**
 * The Player's Investigator page: the creation wizard for a Draft or Changes Requested Investigator, and a read-only
 * sheet once it is Submitted or Approved (specs/character-sheet/ux.md sections 4 to 7, scope of section 9).
 */
export function InvestigatorWizard({ campaignId, step }: InvestigatorWizardProps) {
  const sheet = useMyCharacterSheet(campaignId)
  const campaign = useCampaign(campaignId)
  const occupations = useOccupationCatalog(campaignId)
  const skills = useSkillCatalog(campaignId)

  if (sheet.isPending || campaign.isPending || occupations.isPending || skills.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    )
  }

  if (sheet.isError || campaign.isError || occupations.isError || skills.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load your Investigator.</p>
        <Button type="button" variant="outline" onClick={() => void sheet.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!sheet.data || !campaign.data || !occupations.data || !skills.data) {
    return <InvestigatorNotFound campaignId={campaignId} />
  }

  if (sheet.data.status === 'Submitted' || sheet.data.status === 'Approved') {
    return <ReadOnlyInvestigator campaignId={campaignId} sheet={sheet.data} />
  }

  // Remounting per step resets the step's touched fields, error summary, and focus (A11Y-1).
  return (
    <WizardForm
      key={`${sheet.data.investigatorId}-${step}`}
      campaignId={campaignId}
      step={step}
      sheet={sheet.data}
      allowedMethods={campaign.data.allowedCreationMethods}
      occupationCatalog={occupations.data}
      skillCatalog={skills.data}
    />
  )
}

function useFocusedHeading() {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])
  return heading
}

function ReadOnlyInvestigator({ campaignId, sheet }: { campaignId: string; sheet: MyCharacterSheet }) {
  const heading = useFocusedHeading()
  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">
        {sheet.characterSheet.identity.name ?? 'Your Investigator'}
      </h1>
      <InvestigatorStatusBadge status={sheet.status} audience="Player" />
      <CharacterSheetView sheet={sheet.characterSheet} playerName={sheet.playerName} />
      <Link to="/campaigns/$campaignId" params={{ campaignId }} className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}>
        Back to Campaign
      </Link>
    </section>
  )
}

interface WizardFormProps {
  campaignId: string
  step: WizardStep
  sheet: MyCharacterSheet
  allowedMethods: CreationMethod[]
  occupationCatalog: OccupationCatalog
  skillCatalog: SkillCatalog
}

/** The saved inputs, starting a new Draft on the only method a Campaign allows (ux.md section 6.2; UX-10). */
function initialInputs(sheet: CharacterSheetData, allowedMethods: CreationMethod[]): CharacterSheetInputs {
  const inputs = inputsFromSheet(sheet)
  return inputs.creationMethod === null && allowedMethods.length === 1 ? { ...inputs, creationMethod: allowedMethods[0] } : inputs
}

/** With Quick fire there are no budgets; the rail counts the skill values and personal interests left (ux.md 4.2). */
function quickFireLeft(sheet: MyCharacterSheet): { values: number; interests: number } | undefined {
  const { characterSheet, rules } = sheet
  if (characterSheet.creationMethod !== 'QuickFire') {
    return undefined
  }

  return {
    values: valuesLeft(rules.quickFireSkillValues, characterSheet.quickFire.values.map((value) => value.value)).length,
    interests: Math.max(0, rules.quickFirePersonalInterestCount - characterSheet.quickFire.personalInterests.length),
  }
}

function WizardForm({ campaignId, step, sheet, allowedMethods, occupationCatalog, skillCatalog }: WizardFormProps) {
  const heading = useFocusedHeading()
  const summary = useRef<HTMLDivElement>(null)
  const statusMessage = useRouterState({ select: (state) => state.location.state.statusMessage })
  const [inputs, dispatch] = useReducer(characterSheetFormReducer, sheet.characterSheet, (saved) => initialInputs(saved, allowedMethods))
  const [savedInputs, setSavedInputs] = useState(() => JSON.stringify(inputsFromSheet(sheet.characterSheet)))
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set())
  const [clientErrors, setClientErrors] = useState<ValidationError[] | null>(null)
  const [summaryErrors, setSummaryErrors] = useState<ValidationError[] | null>(null)
  const states = stepStates(sheet.characterSheet, sheet.validationErrors)
  const [showAllErrors, setShowAllErrors] = useState(states[step] === 'needsAttention')
  const bracket = sheet.characterSheet.ageEffects.bracket

  useUnsavedChangesPrompt(JSON.stringify(inputs) !== savedInputs)

  const showSummary = (errors: ValidationError[]) => {
    setShowAllErrors(true)
    setSummaryErrors(errors)
  }

  useEffect(() => {
    if (summaryErrors) {
      summary.current?.focus()
    }
  }, [summaryErrors])

  const moves = useWizardMoves({
    campaignId,
    step,
    sheet,
    onStayWithErrors: (errors) => {
      setClientErrors(null)
      showSummary(errors)
    },
    onSaved: (saved) => {
      dispatch({ type: 'reset', inputs: saved })
      setSavedInputs(JSON.stringify(saved))
    },
    onSubmitRejected: showSummary,
  })

  const currentErrors = clientErrors ? mergeClientAndServerErrors(clientErrors, sheet.validationErrors) : sheet.validationErrors
  const inlineErrors = inlineErrorsForStep(currentErrors, step, (field) => showAllErrors || isFieldTouched(field, touched))

  const handleBlur = (field: string, nextFocus: EventTarget | null) => {
    // Moving to a wizard action saves and validates on the server; showing or hiding errors now would shift the layout
    // under the pointer between mousedown and mouseup, so the action's click would be lost.
    if (nextFocus instanceof HTMLElement && nextFocus.dataset.wizardAction !== undefined) {
      return
    }
    setTouched((previous) => new Set(previous).add(field))
    setClientErrors(validateCharacterSheet(inputs, sheet.rules, bracket))
  }

  const go = (move: WizardMove) => void moves.move(move, inputsForSave(inputs, step, bracket, sheet.rules))

  const selectError = (field: string) => {
    const owner = stepOfField(field)
    if (owner === step) {
      document.getElementById(fieldId(field))?.focus()
    } else {
      moves.toStep(owner)
    }
  }

  const stepProps = { inputs, errors: inlineErrors, onAction: dispatch, onBlur: handleBlur }
  const skillStepProps = { ...stepProps, rules: sheet.rules, sheet: sheet.characterSheet, occupationCatalog, skillCatalog }
  const warnings = sheet.validationErrors.filter((error) => error.severity === 'Warning' && stepOfField(error.field) === step)
  const problemCount = sheet.validationErrors.filter((error) => error.severity === 'Error').length

  return (
    <div className="flex flex-col gap-6">
      <InvestigatorCreationStepper campaignId={campaignId} current={step} states={states} onSelect={(target) => go({ kind: 'stepper', target })} />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">
            {WIZARD_STEPS.find((candidate) => candidate.id === step)?.label}
          </h1>
          <p role="status" className="text-sm empty:hidden">
            {statusMessage}
          </p>
          {sheet.status === 'ChangesRequested' && <KeeperComment comment={sheet.changeRequestComment} />}
          {summaryErrors && summaryErrors.length > 0 && (
            <ValidationErrorSummary ref={summary} errors={summaryErrors} onSelect={selectError} />
          )}
          {moves.failedMove && <SaveFailed onRetry={() => go(moves.failedMove!)} />}
          {moves.actionFailed && (
            <Alert variant="destructive" role="alert">
              <CircleAlert aria-hidden="true" />
              <AlertDescription>We couldn&apos;t update your Investigator. Try again.</AlertDescription>
            </Alert>
          )}

          {step === 'identity' && <IdentityStep {...stepProps} playerName={sheet.playerName} />}
          {step === 'characteristics' && (
            <CharacteristicsStep {...stepProps} rules={sheet.rules} bracket={bracket} warnings={warnings} allowedMethods={allowedMethods} />
          )}
          {step === 'age' && <AgeEffectsStep {...stepProps} rules={sheet.rules} bracket={bracket} />}
          {step === 'occupation' && <OccupationStep {...skillStepProps} />}
          {step === 'occupation-skills' && <OccupationSkillsStep {...skillStepProps} />}
          {step === 'personal-interests' && (
            <>
              <WorthCheckingAlert warnings={warnings} />
              <PersonalInterestsStep {...skillStepProps} />
            </>
          )}
          {step === 'sheet' && (
            <CharacterSheetView sheet={sheet.characterSheet} playerName={sheet.playerName} changeLinksFor={campaignId} />
          )}

          <StepActions step={step} pending={moves.pending} onMove={go} onSubmit={() => void moves.submitToKeeper()} />
          {sheet.status === 'Draft' && <StartOverDialog pending={moves.pending === 'delete'} onConfirm={() => void moves.startOver()} />}
        </div>
        <InvestigatorSummary
          derived={sheet.characterSheet.derived}
          quickFireLeft={quickFireLeft(sheet)}
          problemCount={problemCount}
          onShowProblems={() => showSummary(sheet.validationErrors.filter((error) => error.severity === 'Error'))}
        />
      </div>
    </div>
  )
}

function KeeperComment({ comment }: { comment: string | null }) {
  return (
    <Alert>
      <AlertTitle>Your Keeper asked for changes</AlertTitle>
      <AlertDescription className="whitespace-pre-line">{comment}</AlertDescription>
    </Alert>
  )
}

function SaveFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive" role="alert" className="flex flex-col gap-2">
      <CircleAlert aria-hidden="true" />
      <AlertDescription>We couldn&apos;t save your Investigator. Your changes are still here - try again.</AlertDescription>
      <Button type="button" variant="outline" className="self-start" onClick={onRetry}>
        Try again
      </Button>
    </Alert>
  )
}

interface StepActionsProps {
  step: WizardStep
  pending: PendingAction | null
  onMove: (move: WizardMove) => void
  onSubmit: () => void
}

/** Back, Save and exit, and Save and continue or Submit to Keeper (ux.md section 4.3); none is sticky (A11Y-7). */
function StepActions({ step, pending, onMove, onSubmit }: StepActionsProps) {
  const busy = pending !== null
  const label = (action: PendingAction, idle: string, working = 'Saving...'): ReactNode => (pending === action ? working : idle)

  return (
    <div className="flex flex-wrap items-center gap-3">
      {step !== 'identity' && (
        <Button type="button" variant="secondary" data-wizard-action disabled={busy} onClick={() => onMove({ kind: 'back' })}>
          {label('back', 'Back')}
        </Button>
      )}
      <Button type="button" variant="link" data-wizard-action disabled={busy} onClick={() => onMove({ kind: 'exit' })}>
        {label('exit', 'Save and exit')}
      </Button>
      {step === 'sheet' ? (
        <Button type="button" data-wizard-action disabled={busy} onClick={onSubmit}>
          {label('submit', 'Submit to Keeper', 'Submitting...')}
        </Button>
      ) : (
        <Button type="button" data-wizard-action disabled={busy} onClick={() => onMove({ kind: 'continue' })}>
          {label('continue', 'Save and continue')}
        </Button>
      )}
    </div>
  )
}
