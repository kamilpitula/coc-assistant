import { useId } from 'react'

import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { fieldId } from '@/campaign-play/services/fieldIds'
import type { HitPointsMode, OptionalOverrideKind, SectionFieldsProps } from '@/scenario-preparation/services/mythosCreatureForm'
import { MONSTER_CHARACTERISTIC_CODES, type MonsterCharacteristicCode } from '@/scenario-preparation/types/MythosCreature'
import { CHARACTERISTIC_NAMES } from '@/scenario-preparation/types/NonPlayerEntity'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'

const REASON_HINT = 'Why it differs from the rules, up to 500 characters.'

const HIT_POINTS_CHOICES: { mode: HitPointsMode; label: string }[] = [
  { mode: 'computed', label: 'Work out from the characteristics' },
  { mode: 'override', label: 'Override' },
  { mode: 'notApplicable', label: 'Not applicable' },
]

/** The Characteristics section of a Monster Profile: the inputs, Add APP and Add EDU, and the worked-out value overrides (ux.md section 25.5). */
export function MonsterCharacteristicsFields({ state, dispatch, errorOf }: SectionFieldsProps) {
  const characteristics = state.characteristics
  if (!characteristics) {
    return null
  }

  const isShown = (code: MonsterCharacteristicCode) => (code !== 'APP' && code !== 'EDU') || characteristics.extraShown[code]
  const hidden = (['APP', 'EDU'] as const).filter((code) => !isShown(code))

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Enter only the characteristics this Mythos Creature needs, from 0 to 2,000.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MONSTER_CHARACTERISTIC_CODES.filter(isShown).map((code) => (
          <WizardField
            key={code}
            type="number"
            field={`characteristics.values.${code}`}
            label={`${code} ${CHARACTERISTIC_NAMES[code]}`}
            value={characteristics.values[code]}
            error={errorOf(`characteristics.values.${code}`)}
            onChange={(value) => dispatch({ type: 'setCharacteristic', code, value })}
          />
        ))}
      </div>
      {hidden.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {hidden.map((code) => (
            <Button key={code} type="button" variant="outline" onClick={() => dispatch({ type: 'showCharacteristic', code })}>
              Add {code}
            </Button>
          ))}
        </div>
      )}
      <p className="text-sm text-muted-foreground">Hit Points and other worked-out values update when you save.</p>
      <fieldset className="flex min-w-0 flex-col gap-4">
        <legend className="text-base font-semibold">Worked-out values</legend>
        <HitPointsChoice state={state} dispatch={dispatch} errorOf={errorOf} />
        <NumberOverride kind="magicPoints" label="Magic Points" hint="From 0 to 9,999." state={state} dispatch={dispatch} errorOf={errorOf} />
        <DamageBonusOverride state={state} dispatch={dispatch} errorOf={errorOf} />
        <NumberOverride kind="build" label="Build" hint="From -2 to 99." state={state} dispatch={dispatch} errorOf={errorOf} />
      </fieldset>
    </div>
  )
}

function ReasonField({ kind, label, reason, error, onChange }: { kind: string; label: string; reason: string; error?: string; onChange: (value: string) => void }) {
  return (
    <WizardField
      field={`characteristics.overrides.${kind}.reason`}
      label={`Reason for the ${label} override`}
      help={REASON_HINT}
      value={reason}
      error={error}
      onChange={(value) => onChange(value ?? '')}
    />
  )
}

function HitPointsChoice({ state, dispatch, errorOf }: SectionFieldsProps) {
  const characteristics = state.characteristics
  const prefix = useId()
  if (!characteristics) {
    return null
  }
  const { hitPointsMode, hitPoints } = characteristics

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="text-sm font-medium">Hit Points</legend>
      <RadioGroup
        id={fieldId('characteristics.hitPointsNotApplicable')}
        tabIndex={-1}
        value={hitPointsMode}
        onValueChange={(mode) => dispatch({ type: 'setHitPointsMode', mode: mode as HitPointsMode })}
        aria-invalid={errorOf('characteristics.hitPointsNotApplicable') ? true : undefined}
        aria-describedby={errorOf('characteristics.hitPointsNotApplicable') ? `${prefix}-error` : undefined}
      >
        {HIT_POINTS_CHOICES.map((choice) => (
          <div key={choice.mode} className="flex items-center gap-2">
            <RadioGroupItem id={`${prefix}-${choice.mode}`} value={choice.mode} />
            <Label htmlFor={`${prefix}-${choice.mode}`}>{choice.label}</Label>
          </div>
        ))}
      </RadioGroup>
      {errorOf('characteristics.hitPointsNotApplicable') && (
        <p id={`${prefix}-error`} className="text-sm text-destructive">
          {errorOf('characteristics.hitPointsNotApplicable')}
        </p>
      )}
      {hitPointsMode === 'override' && (
        <div className="flex flex-col gap-3">
          <WizardField
            type="number"
            field="characteristics.overrides.hitPoints.value"
            label="Hit Points"
            help="From 1 to 9,999."
            value={hitPoints.value}
            error={errorOf('characteristics.overrides.hitPoints.value')}
            onChange={(value) => dispatch({ type: 'setOverrideNumber', override: 'hitPoints', value })}
            className="w-28"
          />
          <ReasonField
            kind="hitPoints"
            label="Hit Points"
            reason={hitPoints.reason}
            error={errorOf('characteristics.overrides.hitPoints.reason')}
            onChange={(value) => dispatch({ type: 'setOverrideReason', override: 'hitPoints', value })}
          />
        </div>
      )}
      {hitPointsMode === 'notApplicable' && <p className="text-sm text-muted-foreground">Describe the Defeat outcome under Details.</p>}
    </fieldset>
  )
}

interface OverrideToggleProps {
  kind: OptionalOverrideKind
  label: string
  enabled: boolean
  onToggle: (enabled: boolean) => void
  children: React.ReactNode
}

function OverrideToggle({ kind, label, enabled, onToggle, children }: OverrideToggleProps) {
  const id = useId()

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex items-center gap-2">
        <Checkbox id={`${id}-${kind}`} checked={enabled} onCheckedChange={(checked) => onToggle(checked === true)} />
        <Label htmlFor={`${id}-${kind}`}>Override {label}</Label>
      </div>
      {enabled && <div className="flex flex-col gap-3">{children}</div>}
    </fieldset>
  )
}

interface NumberOverrideProps extends SectionFieldsProps {
  kind: 'magicPoints' | 'build'
  label: string
  hint: string
}

function NumberOverride({ kind, label, hint, state, dispatch, errorOf }: NumberOverrideProps) {
  const override = state.characteristics?.[kind] ?? null

  return (
    <OverrideToggle kind={kind} label={label} enabled={override !== null} onToggle={(enabled) => dispatch({ type: 'setOverrideEnabled', override: kind, enabled })}>
      {override && (
        <>
          <WizardField
            type="number"
            field={`characteristics.overrides.${kind}.value`}
            label={label}
            help={hint}
            value={override.value}
            error={errorOf(`characteristics.overrides.${kind}.value`)}
            onChange={(value) => dispatch({ type: 'setOverrideNumber', override: kind, value })}
            className="w-28"
          />
          <ReasonField
            kind={kind}
            label={label}
            reason={override.reason}
            error={errorOf(`characteristics.overrides.${kind}.reason`)}
            onChange={(value) => dispatch({ type: 'setOverrideReason', override: kind, value })}
          />
        </>
      )}
    </OverrideToggle>
  )
}

function DamageBonusOverride({ state, dispatch, errorOf }: SectionFieldsProps) {
  const override = state.characteristics?.damageBonus ?? null

  return (
    <OverrideToggle
      kind="damageBonus"
      label="Damage Bonus"
      enabled={override !== null}
      onToggle={(enabled) => dispatch({ type: 'setOverrideEnabled', override: 'damageBonus', enabled })}
    >
      {override && (
        <>
          <WizardField
            field="characteristics.overrides.damageBonus.value"
            label="Damage Bonus"
            help="Write it like +1D4, -1, or 0."
            value={override.value}
            error={errorOf('characteristics.overrides.damageBonus.value')}
            onChange={(value) => dispatch({ type: 'setDamageBonusOverride', value: value ?? '' })}
            className="w-32"
          />
          <ReasonField
            kind="damageBonus"
            label="Damage Bonus"
            reason={override.reason}
            error={errorOf('characteristics.overrides.damageBonus.reason')}
            onChange={(value) => dispatch({ type: 'setOverrideReason', override: 'damageBonus', value })}
          />
        </>
      )}
    </OverrideToggle>
  )
}
