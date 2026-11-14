import { useQueryClient } from '@tanstack/react-query'
import { CircleAlert, EyeOff } from 'lucide-react'
import { useId, useRef, useState, type FormEvent, type Ref } from 'react'

import { useSkillCatalog } from '@/campaign-play/hooks/useRuleData'
import { familyOf, skillNames } from '@/campaign-play/services/skillBases'
import { CHARACTERISTIC_CODES } from '@/campaign-play/types/CharacterSheet'
import type { SkillCatalog } from '@/campaign-play/types/RuleData'
import { useRequestRoll } from '@/roll-requests/hooks/useRollRequests'
import { describeDice, hiddenRollStatus, joinInvestigatorNames, rollTargetName } from '@/roll-requests/services/rollRequestPresentation'
import { NoActiveSceneError, activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import { RollRequestRefusedError } from '@/roll-requests/services/rollRequestApi'
import {
  ROLL_REQUEST_MESSAGE_MAX_LENGTH,
  type CreateRollRequestInput,
  type RollRequest,
  type RollRequestTarget,
} from '@/roll-requests/types/RollRequest'
import { VisibilityChoice, type VisibilityChoiceValue } from '@/shared/components/visibility-choice/visibility-choice'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'

const DIFFICULTIES = ['Regular', 'Hard', 'Extreme'] as const
const DICE_COUNTS = [0, 1, 2] as const

type Difficulty = (typeof DIFFICULTIES)[number]

interface DiceChoice {
  difficulty: Difficulty
  bonusDice: number
  penaltyDice: number
}

const DEFAULT_DICE: DiceChoice = { difficulty: 'Regular', bonusDice: 0, penaltyDice: 0 }

interface PresentInvestigator {
  id: string
  name: string | null
}

interface RollRequestFormProps {
  campaignId: string
  /** The Investigators present in the Active Scene, in the Scene's order. */
  investigators: PresentInvestigator[]
  /** Says "{target} roll requested from {names}." in the page's status paragraph (specs/roll-requests/ux.md section 3). */
  onRequested: (message: string) => void
  /** The request found no Active Scene; the page shows the no-Active-Scene state with focus on its h1. */
  onNoActiveScene: () => void
}

function displayName(name: string | null): string {
  return name ?? 'Unnamed Investigator'
}

function firstName(name: string | null): string {
  return displayName(name).split(/\s+/)[0] ?? displayName(name)
}

function targetKeyOfSkill(name: string): string {
  return `skill:${name}`
}

function targetOf(key: string, specialization: string | null): RollRequestTarget {
  if (key === 'luck') {
    return { kind: 'Luck', skill: null, specialization: null, characteristic: null }
  }
  if (key.startsWith('characteristic:')) {
    return { kind: 'Characteristic', skill: null, specialization: null, characteristic: key.slice('characteristic:'.length) }
  }

  return { kind: 'Skill', skill: key.slice('skill:'.length), specialization, characteristic: null }
}

interface TargetSelection {
  target: RollRequestTarget
  needsSpecialization: boolean
  closedSpecializations: string[] | undefined
  isLuck: boolean
  skillName: string | null
}

function selectionOf(key: string, specialization: string | null, catalog: SkillCatalog | undefined): TargetSelection {
  const target = targetOf(key, specialization)
  const skillName = target.kind === 'Skill' ? target.skill : null
  const family = skillName !== null && catalog !== undefined ? familyOf(skillName, catalog) : 'none'
  const closed =
    family === 'closed' && skillName !== null && catalog !== undefined
      ? catalog.closedFamilies.find((candidate) => candidate.skill === skillName)
      : undefined

  return {
    target,
    needsSpecialization: family !== 'none',
    closedSpecializations: closed?.specializations.map(({ specialization: name }) => name),
    isLuck: target.kind === 'Luck',
    skillName,
  }
}

function buildInput(
  target: RollRequestTarget,
  message: string,
  visibility: VisibilityChoiceValue,
  defaults: DiceChoice,
  isLuck: boolean,
  checkedIds: string[],
  changes: Record<string, DiceChoice>,
): CreateRollRequestInput {
  return {
    target,
    ...(message === '' ? {} : { message }),
    visibility,
    ...(isLuck ? DEFAULT_DICE : defaults),
    investigators: checkedIds.map((id) => ({ investigatorId: id, ...(isLuck ? {} : (changes[id] ?? {})) })),
  }
}

/** The submit copy names the mode: "Request roll" for a Public request, "Roll now" for a hidden one (specs/roll-requests/ux.md section 3.1). */
function submitLabel(pending: boolean, hidden: boolean, checkedCount: number): string {
  if (pending) {
    return hidden ? 'Rolling...' : 'Requesting...'
  }

  if (!hidden) {
    return checkedCount > 1 ? `Request roll from ${checkedCount}` : 'Request roll'
  }

  return checkedCount > 1 ? `Roll now for ${checkedCount}` : 'Roll now'
}

function statusMessage(input: CreateRollRequestInput, names: string[]): string {
  return `${rollTargetName(input.target)} roll requested from ${joinInvestigatorNames(names)}.`
}

function canSubmit(ready: boolean, checkedCount: number, needsSpecialization: boolean, specializationGiven: boolean, messageTooLong: boolean, pending: boolean): boolean {
  return ready && checkedCount > 0 && (!needsSpecialization || specializationGiven) && !messageTooLong && !pending
}

function checkedNames(investigators: PresentInvestigator[], checkedIds: string[]): string[] {
  return checkedIds.map((id) => displayName(investigators.find((investigator) => investigator.id === id)?.name ?? null))
}

/**
 * "Request a roll" (specs/roll-requests/ux.md section 3): the Keeper picks a target, defaults, and who rolls.
 * Rows refresh from the Active Scene when a 400 says someone present is gone; every other choice stays.
 */
export function RollRequestForm({ campaignId, investigators, onRequested, onNoActiveScene }: RollRequestFormProps) {
  const catalog = useSkillCatalog(campaignId)
  const request = useRequestRoll(campaignId)
  const queryClient = useQueryClient()
  const headingId = useId()
  const hintId = useId()
  const targetTriggerRef = useRef<HTMLButtonElement>(null)

  const [targetKey, setTargetKey] = useState<string | null>(null)
  const [specialization, setSpecialization] = useState('')
  const [message, setMessage] = useState('')
  // The visibility stays as last chosen across requests and errors; it returns to Public only when the form unmounts.
  const [visibility, setVisibility] = useState<VisibilityChoiceValue>('Public')
  const [defaults, setDefaults] = useState<DiceChoice>(DEFAULT_DICE)
  const [checked, setChecked] = useState<string[]>([])
  const [changes, setChanges] = useState<Record<string, DiceChoice>>({})
  const [openFor, setOpenFor] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const names = catalog.data ? skillNames(catalog.data) : []
  const effectiveTargetKey = targetKey ?? (names.length > 0 ? targetKeyOfSkill(names[0]) : '')
  const trimmedSpecialization = specialization.trim()
  const selection = selectionOf(effectiveTargetKey, trimmedSpecialization === '' ? null : trimmedSpecialization, catalog.data)
  const presentIds = new Set(investigators.map((investigator) => investigator.id))
  const checkedPresent = checked.filter((id) => presentIds.has(id))
  const submittable = canSubmit(
    catalog.data !== undefined && !catalog.isError,
    checkedPresent.length,
    selection.needsSpecialization,
    trimmedSpecialization !== '',
    message.length > ROLL_REQUEST_MESSAGE_MAX_LENGTH,
    request.isPending,
  )

  const submit = () => {
    if (!submittable) {
      return
    }

    setFailure(null)
    const input = buildInput(selection.target, message, visibility, defaults, selection.isLuck, checkedPresent, changes)
    request.mutate(input, {
      onSuccess: (created: RollRequest) => {
        setMessage('')
        setChecked([])
        setChanges({})
        setOpenFor(null)
        setDefaults(DEFAULT_DICE)
        onRequested(visibility === 'KeeperOnly' ? hiddenRollStatus(created) : statusMessage(input, checkedNames(investigators, checkedPresent)))
        targetTriggerRef.current?.focus()
      },
      onError: (error) => {
        if (error instanceof NoActiveSceneError) {
          onNoActiveScene()
          return
        }
        if (error instanceof RollRequestRefusedError) {
          void queryClient.invalidateQueries({ queryKey: activeSceneQueryKeys.detail(campaignId) })
        }
        setFailure(error instanceof RollRequestRefusedError ? error.message : "We couldn't request that roll. Your choices are still here. Try again.")
      },
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submit()
  }

  return (
    <form aria-labelledby={headingId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <h2 id={headingId} className="text-lg font-semibold">
        Request a roll
      </h2>
      <TargetSection
        catalog={catalog.data}
        catalogFailed={catalog.isError}
        targetKey={effectiveTargetKey}
        triggerRef={targetTriggerRef}
        specialization={specialization}
        selection={selection}
        onTargetChange={(key) => {
          setTargetKey(key)
          setSpecialization('')
        }}
        onSpecializationChange={setSpecialization}
      />
      <MessageField value={message} onChange={setMessage} describedById={`${hintId}-counter`} />
      <RollSettings
        hintId={hintId}
        selection={selection}
        catalogLoaded={catalog.data !== undefined}
        defaults={defaults}
        onDefaultsChange={setDefaults}
        investigators={investigators}
        checked={checkedPresent}
        changes={changes}
        openFor={openFor}
        onToggle={(id, on) => setChecked((current) => (on ? [...current, id] : current.filter((candidate) => candidate !== id)))}
        onOpenChange={(id) => setOpenFor(openFor === id ? null : id)}
        onRowChange={(id, choice) => setChanges((current) => ({ ...current, [id]: choice }))}
        onUseDefaults={(id) => {
          setChanges((current) => {
            const next = { ...current }
            delete next[id]
            return next
          })
          setOpenFor(null)
        }}
      />
      <VisibilityChoice
        legend="Who can see this roll?"
        publicLabel="Public"
        publicDescription="Players roll it themselves and everyone sees the result."
        keeperOnlyLabel="Keeper only (hidden roll)"
        keeperOnlyDescription="The app rolls it now. Only you see it."
        value={visibility}
        onChange={setVisibility}
      />
      <SubmitSection
        checkedCount={checkedPresent.length}
        hidden={visibility === 'KeeperOnly'}
        hintId={hintId}
        failure={failure}
        pending={request.isPending}
        disabled={!submittable}
      />
    </form>
  )
}

function TargetSection({
  catalog,
  catalogFailed,
  targetKey,
  triggerRef,
  specialization,
  selection,
  onTargetChange,
  onSpecializationChange,
}: {
  catalog: SkillCatalog | undefined
  catalogFailed: boolean
  targetKey: string
  triggerRef: Ref<HTMLButtonElement>
  specialization: string
  selection: TargetSelection
  onTargetChange: (key: string) => void
  onSpecializationChange: (value: string) => void
}) {
  if (catalogFailed) {
    return (
      <p role="alert" className="text-sm text-destructive">
        We couldn&apos;t load the skills.
      </p>
    )
  }

  return (
    <>
      <TargetSelect catalog={catalog} value={targetKey} triggerRef={triggerRef} onChange={onTargetChange} />
      {selection.needsSpecialization && selection.skillName !== null && (
        <SpecializationField
          skill={selection.skillName}
          closedSpecializations={selection.closedSpecializations}
          value={specialization}
          onChange={onSpecializationChange}
        />
      )}
    </>
  )
}

function TargetSelect({
  catalog,
  value,
  triggerRef,
  onChange,
}: {
  catalog: SkillCatalog | undefined
  value: string
  triggerRef: Ref<HTMLButtonElement>
  onChange: (key: string) => void
}) {
  const names = catalog ? skillNames(catalog) : []

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="roll-request-target">What to roll</Label>
      <Select value={value === '' ? undefined : value} onValueChange={onChange} disabled={catalog === undefined}>
        <SelectTrigger id="roll-request-target" ref={triggerRef}>
          <SelectValue placeholder={catalog === undefined ? 'Loading the skills...' : 'Choose'} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Skills</SelectLabel>
            {names.map((name) => (
              <SelectItem key={name} value={targetKeyOfSkill(name)}>
                {name}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Characteristics</SelectLabel>
            {CHARACTERISTIC_CODES.map((code) => (
              <SelectItem key={code} value={`characteristic:${code}`}>
                {code}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Luck</SelectLabel>
            <SelectItem value="luck">Luck</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

function SpecializationField({
  skill,
  closedSpecializations,
  value,
  onChange,
}: {
  skill: string
  closedSpecializations: string[] | undefined
  value: string
  onChange: (value: string) => void
}) {
  if (closedSpecializations !== undefined) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="roll-request-specialization">{skill} specialization</Label>
        <Select value={value === '' ? undefined : value} onValueChange={onChange}>
          <SelectTrigger id="roll-request-specialization">
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
          <SelectContent>
            {closedSpecializations.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="roll-request-specialization">{skill}</Label>
      <Input id="roll-request-specialization" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function MessageField({ value, onChange, describedById }: { value: string; onChange: (value: string) => void; describedById: string }) {
  const tooLong = value.length > ROLL_REQUEST_MESSAGE_MAX_LENGTH

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${describedById}-message`}>Message (optional)</Label>
      <Textarea
        id={`${describedById}-message`}
        rows={2}
        value={value}
        aria-invalid={tooLong ? true : undefined}
        aria-describedby={describedById}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={describedById} className={tooLong ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
        {tooLong
          ? `Messages can be at most ${ROLL_REQUEST_MESSAGE_MAX_LENGTH} characters.`
          : `${value.length} / ${ROLL_REQUEST_MESSAGE_MAX_LENGTH}`}
      </p>
    </div>
  )
}

function RollSettings({
  hintId,
  selection,
  catalogLoaded,
  defaults,
  onDefaultsChange,
  investigators,
  checked,
  changes,
  openFor,
  onToggle,
  onOpenChange,
  onRowChange,
  onUseDefaults,
}: {
  hintId: string
  selection: TargetSelection
  catalogLoaded: boolean
  defaults: DiceChoice
  onDefaultsChange: (choice: DiceChoice) => void
  investigators: PresentInvestigator[]
  checked: string[]
  changes: Record<string, DiceChoice>
  openFor: string | null
  onToggle: (id: string, on: boolean) => void
  onOpenChange: (id: string) => void
  onRowChange: (id: string, choice: DiceChoice) => void
  onUseDefaults: (id: string) => void
}) {
  return (
    <>
      <DefaultsFieldset
        describedBy={selection.isLuck ? `${hintId}-luck` : undefined}
        disabled={!catalogLoaded || selection.isLuck}
        value={selection.isLuck ? DEFAULT_DICE : defaults}
        onChange={onDefaultsChange}
        luckHintId={selection.isLuck ? `${hintId}-luck` : undefined}
      />
      <WhoRollsFieldset
        investigators={investigators}
        checked={checked}
        changes={selection.isLuck ? {} : changes}
        defaults={defaults}
        fixedLuck={selection.isLuck}
        openFor={openFor}
        onToggle={onToggle}
        onOpenChange={onOpenChange}
        onRowChange={onRowChange}
        onUseDefaults={onUseDefaults}
      />
    </>
  )
}

function DefaultsFieldset({
  describedBy,
  disabled,
  value,
  onChange,
  luckHintId,
}: {
  describedBy: string | undefined
  disabled: boolean
  value: DiceChoice
  onChange: (choice: DiceChoice) => void
  luckHintId: string | undefined
}) {
  const difficultyLegendId = useId()
  const bonusId = useId()
  const penaltyId = useId()

  return (
    <fieldset aria-describedby={describedBy} className="flex flex-col gap-2">
      <legend className="text-sm font-medium">For everyone</legend>
      <p id={difficultyLegendId} className="text-sm font-medium">
        Difficulty
      </p>
      <RadioGroup
        aria-labelledby={difficultyLegendId}
        value={value.difficulty}
        onValueChange={(difficulty) => onChange({ ...value, difficulty: difficulty as Difficulty })}
        disabled={disabled}
        className="flex flex-wrap gap-4"
      >
        {DIFFICULTIES.map((difficulty) => (
          <div key={difficulty} className="flex items-center gap-2">
            <RadioGroupItem id={`${bonusId}-${difficulty}`} value={difficulty} />
            <Label htmlFor={`${bonusId}-${difficulty}`}>{difficulty}</Label>
          </div>
        ))}
      </RadioGroup>
      <div className="flex flex-wrap gap-3">
        <DiceSelect label="Bonus Dice" controlId={bonusId} value={value.bonusDice} disabled={disabled} onChange={(bonusDice) => onChange({ ...value, bonusDice })} />
        <DiceSelect label="Penalty Dice" controlId={penaltyId} value={value.penaltyDice} disabled={disabled} onChange={(penaltyDice) => onChange({ ...value, penaltyDice })} />
      </div>
      {luckHintId !== undefined && (
        <p id={luckHintId} className="text-sm text-muted-foreground">
          Luck rolls are always Regular, with no Bonus or Penalty Dice.
        </p>
      )}
    </fieldset>
  )
}

function DiceSelect({
  label,
  controlId,
  value,
  disabled,
  onChange,
}: {
  label: string
  controlId: string
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={controlId}>{label}</Label>
      <Select value={String(value)} onValueChange={(count) => onChange(Number(count))} disabled={disabled}>
        <SelectTrigger id={controlId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DICE_COUNTS.map((count) => (
            <SelectItem key={count} value={String(count)}>
              {count}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function WhoRollsFieldset({
  investigators,
  checked,
  changes,
  defaults,
  fixedLuck,
  openFor,
  onToggle,
  onOpenChange,
  onRowChange,
  onUseDefaults,
}: {
  investigators: PresentInvestigator[]
  checked: string[]
  changes: Record<string, DiceChoice>
  defaults: DiceChoice
  fixedLuck: boolean
  openFor: string | null
  onToggle: (id: string, on: boolean) => void
  onOpenChange: (id: string) => void
  onRowChange: (id: string, choice: DiceChoice) => void
  onUseDefaults: (id: string) => void
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">Who rolls</legend>
      {investigators.map((investigator) => (
        <InvestigatorRow
          key={investigator.id}
          investigator={investigator}
          checked={checked.includes(investigator.id)}
          summary={changes[investigator.id] ?? defaults}
          changed={!fixedLuck && changes[investigator.id] !== undefined}
          fixedLuck={fixedLuck}
          changeOpen={openFor === investigator.id}
          onToggle={(on) => onToggle(investigator.id, on)}
          onOpenChange={() => onOpenChange(investigator.id)}
          onRowChange={(choice) => onRowChange(investigator.id, choice)}
          onUseDefaults={() => onUseDefaults(investigator.id)}
        />
      ))}
    </fieldset>
  )
}

function InvestigatorRow({
  investigator,
  checked,
  summary,
  changed,
  fixedLuck,
  changeOpen,
  onToggle,
  onOpenChange,
  onRowChange,
  onUseDefaults,
}: {
  investigator: PresentInvestigator
  checked: boolean
  summary: DiceChoice
  changed: boolean
  fixedLuck: boolean
  changeOpen: boolean
  onToggle: (on: boolean) => void
  onOpenChange: () => void
  onRowChange: (choice: DiceChoice) => void
  onUseDefaults: () => void
}) {
  const name = displayName(investigator.name)
  const checkboxId = useId()
  const bonusId = useId()
  const penaltyId = useId()

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Checkbox id={checkboxId} checked={checked} onCheckedChange={(on) => onToggle(on === true)} />
        <Label htmlFor={checkboxId}>{name}</Label>
        {checked && (
          <span className="text-sm text-muted-foreground">
            {summary.difficulty} . {describeDice(summary.bonusDice, summary.penaltyDice)}
            {changed && ' (changed)'}
          </span>
        )}
        {checked && !fixedLuck && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            aria-expanded={changeOpen}
            aria-label={changeOpen ? `Done changing Difficulty and dice for ${name}` : `Change Difficulty and dice for ${name}`}
            onClick={onOpenChange}
          >
            {changeOpen ? 'Done' : `Change for ${firstName(investigator.name)}`}
          </Button>
        )}
      </div>
      {checked && changeOpen && (
        <div role="group" aria-label={`Changes for ${name}`} className="flex flex-wrap items-end gap-3 pl-6">
          <RowDifficulty value={summary} onChange={onRowChange} />
          <DiceSelect label="Bonus Dice" controlId={bonusId} value={summary.bonusDice} onChange={(bonusDice) => onRowChange({ ...summary, bonusDice })} />
          <DiceSelect label="Penalty Dice" controlId={penaltyId} value={summary.penaltyDice} onChange={(penaltyDice) => onRowChange({ ...summary, penaltyDice })} />
          <Button type="button" variant="ghost" size="sm" onClick={onUseDefaults}>
            Use the defaults
          </Button>
        </div>
      )}
    </div>
  )
}

function RowDifficulty({ value, onChange }: { value: DiceChoice; onChange: (choice: DiceChoice) => void }) {
  const legendId = useId()

  return (
    <div className="flex flex-col gap-1.5">
      <p id={legendId} className="text-sm font-medium">
        Difficulty
      </p>
      <RadioGroup
        aria-labelledby={legendId}
        value={value.difficulty}
        onValueChange={(difficulty) => onChange({ ...value, difficulty: difficulty as Difficulty })}
        className="flex flex-wrap gap-4"
      >
        {DIFFICULTIES.map((difficulty) => (
          <div key={difficulty} className="flex items-center gap-2">
            <RadioGroupItem id={`${legendId}-${difficulty}`} value={difficulty} />
            <Label htmlFor={`${legendId}-${difficulty}`}>{difficulty}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}

function SubmitSection({
  checkedCount,
  hidden,
  hintId,
  failure,
  pending,
  disabled,
}: {
  checkedCount: number
  hidden: boolean
  hintId: string
  failure: string | null
  pending: boolean
  disabled: boolean
}) {
  const modeLineId = useId()
  const describedBy = [checkedCount === 0 ? hintId : null, hidden ? modeLineId : null].filter((id) => id !== null).join(' ')

  return (
    <>
      {checkedCount === 0 && (
        <p id={hintId} className="text-sm text-muted-foreground">
          Choose at least one Investigator.
        </p>
      )}
      {hidden && (
        <p id={modeLineId} className="text-sm">
          <EyeOff aria-hidden="true" className="mr-1 inline size-4" />
          Keeper only: the app rolls this now and only you see the results.
        </p>
      )}
      {failure !== null && (
        <Alert variant="destructive" role="alert">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={disabled} aria-describedby={describedBy === '' ? undefined : describedBy}>
        {submitLabel(pending, hidden, checkedCount)}
      </Button>
    </>
  )
}
