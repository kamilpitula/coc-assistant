import { useEffect, useRef, useState, type ReactNode } from 'react'

import { CreationRollAction } from '@/campaign-play/components/creation-roll-action/creation-roll-action'
import { FieldGroupError } from '@/campaign-play/components/field-group-error/field-group-error'
import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import type { RollStatus } from '@/campaign-play/hooks/useWizardMoves'
import { deductionField, eduCheckField } from '@/campaign-play/services/characterSheetValidation'
import { errorId, fieldId, groupDescribedBy } from '@/campaign-play/services/fieldIds'
import { eduBeforeEachCheck, hasUsableEdu } from '@/campaign-play/state/characterSheetForm'
import type {
  AgeBracket,
  CharacterSheetRules,
  CharacterSheetView,
  EduImprovementCheckView,
} from '@/campaign-play/types/CharacterSheet'
import type { WizardStepProps } from '@/campaign-play/types/WizardStepProps'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'

interface AgeEffectsStepProps extends WizardStepProps {
  rules: CharacterSheetRules
  bracket: AgeBracket | null
  /** The saved sheet: the stored EDU checks and the EDU roll for the next check's dialog. */
  sheet: CharacterSheetView
  /** The EDU improvement check roll and its states (ux.md section 6.3). */
  roll: { status: RollStatus; onRoll: () => void; onRetry: () => void }
}

/** The DOM id of the next EDU roll trigger, so error summary links focus it. */
const EDU_TRIGGER_ID = fieldId('eduImprovementCheckRoll')
const EDU_ERROR_ID = errorId('eduImprovementCheckRoll')

/** True when the sheet keeps a Player-entered Roll Record for the check: a legacy typed-in total. Server rolls never count. */
function enteredCheckByYou(sheet: CharacterSheetView, checkNumber: number): boolean {
  return sheet.rollRecords.some(
    (record) => record.purpose === `EduImprovement[${checkNumber}].Check` && record.source === 'PlayerEntered',
  )
}

function joinWithOr(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`
}

function joinWithAnd(parts: string[]): string {
  if (parts.length < 2) {
    return parts.join('')
  }
  const separator = parts.length > 2 ? ', and ' : ' and '
  return `${parts.slice(0, -1).join(', ')}${separator}${parts[parts.length - 1]}`
}

/** The intro line of ux.md section 6.3, built only from the bracket's rule data. */
function ageEffectsIntro(age: number, bracket: AgeBracket): string {
  const parts = [
    bracket.physicalDeductionTotal > 0
      ? `you lose ${bracket.physicalDeductionTotal} points from ${joinWithOr(bracket.physicalDeductionCharacteristics)}`
      : null,
    bracket.appearanceModifier < 0 ? `APP is reduced by ${-bracket.appearanceModifier}` : null,
    bracket.eduImprovementChecks > 0
      ? `you make ${bracket.eduImprovementChecks} EDU ${bracket.eduImprovementChecks === 1 ? 'check' : 'checks'}`
      : null,
  ].filter((part): part is string => part !== null)

  return `At age ${age} ${joinWithAnd(parts)}.`
}

/** Age effects: the deduction split and the app-rolled EDU improvement checks (specs/character-sheet/ux.md section 6.3). */
export function AgeEffectsStep({ inputs, errors, rules, bracket, sheet, roll, onAction, onBlur }: AgeEffectsStepProps) {
  if (!bracket || inputs.identity.age === null) {
    return <p className="text-sm">Your age effects appear once a valid age is saved on the Identity step.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <p>{ageEffectsIntro(inputs.identity.age, bracket)}</p>
      {bracket.physicalDeductionTotal > 0 && (
        <DeductionSplit inputs={inputs} errors={errors} bracket={bracket} onAction={onAction} onBlur={onBlur} />
      )}
      <EduCheckGroups inputs={inputs} errors={errors} rules={rules} bracket={bracket} sheet={sheet} roll={roll} />
    </div>
  )
}

type DeductionSplitProps = Omit<AgeEffectsStepProps, 'rules' | 'sheet' | 'roll'> & { bracket: AgeBracket }

function DeductionSplit({ inputs, errors, bracket, onAction, onBlur }: DeductionSplitProps) {
  const deducted = bracket.physicalDeductionCharacteristics.reduce(
    (sum, code) => sum + (inputs.ageEffects.deductions[code] ?? 0),
    0,
  )
  const groupField = 'ageEffects.deductions'

  return (
    <fieldset
      id={fieldId(groupField)}
      tabIndex={-1}
      aria-describedby={groupDescribedBy(groupField, errors[groupField])}
      className="flex flex-col gap-3"
    >
      <legend className="mb-2 font-medium">Deduction split</legend>
      <div className="flex flex-wrap gap-4">
        {bracket.physicalDeductionCharacteristics.map((code) => {
          const assigned = inputs.characteristics[code] ?? null
          const deduction = inputs.ageEffects.deductions[code] ?? null
          return (
            <div key={code} className="flex flex-col gap-1">
              <WizardField
                field={deductionField(code)}
                label={`Deduct from ${code}`}
                type="number"
                value={deduction}
                error={errors[deductionField(code)]}
                onChange={(value) => onAction({ type: 'deduction', code, value })}
                onBlur={onBlur}
                className="w-36"
              />
              {assigned !== null && (
                <span className="text-sm text-muted-foreground">
                  {code} {assigned} -&gt; {assigned - (deduction ?? 0)}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-sm font-medium">Still to deduct: {bracket.physicalDeductionTotal - deducted}</p>
      <FieldGroupError field={groupField} error={errors[groupField]} />
    </fieldset>
  )
}

type EduCheckGroupsProps = Omit<AgeEffectsStepProps, 'onAction' | 'onBlur'> & { bracket: AgeBracket }

/**
 * The EDU improvement check groups (ux.md section 6.3): one group per required check, each with the roll action until
 * it is rolled, then the result line. Only the next unrolled check has the action.
 */
function EduCheckGroups({ inputs, errors, rules, bracket, sheet, roll }: EduCheckGroupsProps) {
  const saved = sheet.ageEffects.eduImprovementChecks
  // The next unrolled check: the first required index with no check record. An empty saved list starts at 0.
  const nextIndex =
    Array.from({ length: bracket.eduImprovementChecks }, (_, index) => index).find(
      (index) => (saved[index]?.check ?? null) === null,
    ) ?? bracket.eduImprovementChecks
  const announced = roll.status.state === 'rolled' || roll.status.state === 'alreadyRolled'
  // The check the Player sent: the announcement and focus name it even before the reloaded sheet arrives.
  // Without a click in this mount, the last rolled check stands in.
  const [sentIndex, setSentIndex] = useState<number | null>(null)
  const wasAnnounced = useRef(false)
  const announcedIndex = sentIndex ?? Math.max(0, nextIndex - 1)

  // After a roll, focus moves to the group of the check just rolled (ux.md 6.8; A11Y-13).
  useEffect(() => {
    if (announced && !wasAnnounced.current) {
      document.getElementById(fieldId(eduCheckField(announcedIndex)))?.focus()
    }
    wasAnnounced.current = announced
  }, [announced, announcedIndex])

  if (bracket.eduImprovementChecks === 0) {
    return null
  }

  const usable = hasUsableEdu(inputs, sheet.characteristicRolls, rules)
  // The padded dummy carries the next check's EDU through the earlier gains without changing it.
  const eduBefore = eduBeforeEachCheck(
    inputs.characteristics.EDU ?? null,
    [...saved, { check: null, gain: null, eduBefore: null, eduAfter: null }],
    rules.eduMaximum,
  )
  // Sending the roll records which check went out, so the announcement names it.
  const sendRoll = (index: number) => () => {
    setSentIndex(index)
    roll.onRoll()
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: bracket.eduImprovementChecks }, (_, index) =>
        index < nextIndex ? (
          <RolledEduCheck
            key={index}
            index={index}
            count={bracket.eduImprovementChecks}
            check={saved[index] ?? { check: null, gain: null, eduBefore: null, eduAfter: null }}
            sheet={sheet}
            errors={errors}
          />
        ) : index === nextIndex && usable ? (
          <NextEduCheck
            key={index}
            index={index}
            count={bracket.eduImprovementChecks}
            eduBefore={eduBefore[index] ?? null}
            rules={rules}
            bracket={bracket}
            pointMethod={inputs.creationMethod === 'PointBuy' || inputs.creationMethod === 'QuickFire'}
            errors={errors}
            roll={{ ...roll, onRoll: sendRoll(index) }}
          />
        ) : null,
      )}
      {!usable && nextIndex < bracket.eduImprovementChecks && (
        <p className="text-sm text-muted-foreground">Enter a valid age and your EDU to roll EDU checks.</p>
      )}
      {usable &&
        nextIndex < bracket.eduImprovementChecks &&
        Array.from({ length: bracket.eduImprovementChecks - nextIndex - 1 }, (_, offset) => (
          <p key={offset} className="text-sm text-muted-foreground">
            Roll EDU check {nextIndex + 1} first.
          </p>
        ))}
      <EduRollAlerts roll={roll} rolledNumber={announcedIndex + 1} />
    </div>
  )
}

interface RolledEduCheckProps {
  index: number
  count: number
  check: EduImprovementCheckView
  sheet: CharacterSheetView
  errors: Record<string, string>
}

/**
 * The result line of a rolled check: the EDU change, "No improvement", or nothing when a legacy check that should
 * have improved EDU has no gain; that check is never filled in, and its error explains what to do.
 */
function checkResultLine(check: EduImprovementCheckView): ReactNode | null {
  if (check.check === null) {
    return null
  }
  const gainMissing = check.gain === null && check.eduBefore !== null && check.check > check.eduBefore
  if (gainMissing) {
    return null
  }
  if (check.eduAfter !== null && check.eduBefore !== null && check.eduAfter > check.eduBefore) {
    return (
      <p className="text-sm font-medium">
        EDU {check.eduBefore} -&gt; {check.eduAfter}
      </p>
    )
  }
  return <p className="text-sm font-medium">No improvement</p>
}

/** A rolled check: the roll line with the "(entered by you)" marker for legacy typed-in checks, then the result line. */
function RolledEduCheck({ index, count, check, sheet, errors }: RolledEduCheckProps) {
  const groupField = eduCheckField(index)
  const marker = enteredCheckByYou(sheet, index + 1) ? ' (entered by you)' : ''

  return (
    <fieldset
      id={fieldId(groupField)}
      tabIndex={-1}
      aria-describedby={groupDescribedBy(groupField, errors[groupField])}
      className="flex flex-col gap-3 rounded-lg border p-4"
    >
      <legend className="px-1 font-medium">
        EDU check {index + 1} of {count}
      </legend>
      {check.check !== null && (
        <p className="text-sm">
          D100 {check.check}
          {marker}
        </p>
      )}
      {checkResultLine(check)}
      <FieldGroupError field={groupField} error={errors[groupField]} />
      <FieldGroupError field={`${groupField}.check`} error={errors[`${groupField}.check`]} />
      <FieldGroupError field={`${groupField}.gain`} error={errors[`${groupField}.gain`]} />
    </fieldset>
  )
}

interface NextEduCheckProps {
  index: number
  count: number
  eduBefore: number | null
  rules: CharacterSheetRules
  bracket: AgeBracket
  /** True under Point buy or Quick fire, where the dialog also says the EDU can't change. */
  pointMethod: boolean
  errors: Record<string, string>
  roll: { status: RollStatus; onRoll: () => void; onRetry: () => void }
}

/** The next unrolled check: the roll action with its dialog (ux.md sections 6.3 and 6.8). */
function NextEduCheck({ index, count, eduBefore, rules, bracket, pointMethod, errors, roll }: NextEduCheckProps) {
  const groupField = eduCheckField(index)
  const inlineError = errors[`${groupField}.check`] ?? errors[groupField]
  const body =
    `The app rolls ${rules.eduImprovementCheckDice} against your EDU of ${eduBefore}, ` +
    `and ${rules.eduImprovementGainDice} more if it improves. You can't roll it again. ` +
    `Afterwards your age must stay between ${bracket.minimumAge} and ${bracket.maximumAge}` +
    `${pointMethod ? " and your EDU can't change" : ''}.`

  return (
    <fieldset
      id={fieldId(groupField)}
      tabIndex={-1}
      aria-describedby={groupDescribedBy(groupField, errors[groupField])}
      className="flex flex-col gap-3 rounded-lg border p-4"
    >
      <legend className="px-1 font-medium">
        EDU check {index + 1} of {count}
      </legend>
      <CreationRollAction
        id={EDU_TRIGGER_ID}
        describedBy={inlineError ? EDU_ERROR_ID : undefined}
        label={`Roll EDU check ${index + 1}`}
        body={body}
        pending={roll.status.state === 'pending'}
        onRoll={roll.onRoll}
      />
      {inlineError && (
        <p id={EDU_ERROR_ID} className="text-sm text-destructive">
          {inlineError}
        </p>
      )}
    </fieldset>
  )
}

/** The EDU copy of the 6.8 roll announcements and failures (ux.md sections 6.3 and 6.8). */
function EduRollAlerts({
  roll,
  rolledNumber,
}: {
  roll: { status: RollStatus; onRoll: () => void; onRetry: () => void }
  /** The number of the check just rolled, so the announcement names it. */
  rolledNumber: number
}) {
  switch (roll.status.state) {
    case 'rolled':
      return (
        <p role="status" className="text-sm">
          EDU check {rolledNumber} rolled.
        </p>
      )
    case 'alreadyRolled':
      return (
        <p role="status" className="text-sm">
          Your EDU check was already rolled.
        </p>
      )
    case 'saveFailed':
      return (
        <Alert variant="destructive" role="alert" className="flex flex-col gap-2">
          <AlertDescription>We couldn&apos;t save your Investigator. Your changes are still here - try again.</AlertDescription>
          <Button type="button" variant="outline" className="self-start" onClick={roll.onRoll}>
            Try again
          </Button>
        </Alert>
      )
    case 'rollFailed':
      return (
        <Alert variant="destructive" role="alert" className="flex flex-col gap-2">
          <AlertDescription>We couldn&apos;t roll your EDU check. Try again.</AlertDescription>
          <Button type="button" variant="outline" className="self-start" onClick={roll.onRetry}>
            Try again
          </Button>
        </Alert>
      )
    case 'saveConflict':
      return (
        <Alert role="alert">
          <AlertDescription>Your Investigator changed elsewhere, so we reloaded it.</AlertDescription>
        </Alert>
      )
    case 'rollConflict':
      return (
        <Alert variant="destructive" role="alert">
          <AlertDescription>We couldn&apos;t roll your EDU check. Reload the page and try again.</AlertDescription>
        </Alert>
      )
    default:
      return null
  }
}
