import { useId } from 'react'

import { WizardTextarea } from '@/campaign-play/components/wizard-textarea/wizard-textarea'
import { isFilled } from '@/campaign-play/state/characterSheetForm'
import { BACKSTORY_ENTRIES, type BackstoryEntry, type BackstoryInputs, type BackstoryKey } from '@/campaign-play/types/CharacterSheet'
import type { WizardStepProps } from '@/campaign-play/types/WizardStepProps'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'

import { backstoryLabels } from './backstoryLabels'

/** The Backstory's text limit, matching the API (specs/character-sheet/spec.md, API Contracts). */
export const BACKSTORY_TEXT_LENGTH_MAX = 2000

const BACKSTORY_KEYS: BackstoryKey[] = ['myStory', ...BACKSTORY_ENTRIES]
const NO_KEY_CONNECTION = 'none'

interface SheetBackstorySectionProps {
  backstory: BackstoryInputs
  keyConnection: BackstoryEntry | null
  /** On the Sheet and submit step: the wizard's inputs and actions. Omit for the read-only sheet. */
  editing?: WizardStepProps
}

/**
 * The Backstory with its Key Connection (specs/character-sheet/ux.md section 6.7 item 3 and section 7;
 * docs/game-rules section 12).
 */
export function SheetBackstorySection({ backstory, keyConnection, editing }: SheetBackstorySectionProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-xl font-semibold">
        Backstory
      </h2>
      {editing ? <BackstoryInputsForm editing={editing} /> : <BackstoryText backstory={backstory} keyConnection={keyConnection} />}
    </section>
  )
}

function BackstoryText({ backstory, keyConnection }: { backstory: BackstoryInputs; keyConnection: BackstoryEntry | null }) {
  const filled = BACKSTORY_KEYS.filter((key) => isFilled(backstory[key]))
  if (filled.length === 0) {
    return <p className="text-sm text-muted-foreground">None recorded.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {filled.map((key) => (
        <div key={key} className="flex flex-col gap-1">
          <h3 className="font-semibold">
            {backstoryLabels[key]}
            {key === keyConnection && ' (Key Connection)'}
          </h3>
          <p className="whitespace-pre-line text-sm">{backstory[key]}</p>
        </div>
      ))}
    </div>
  )
}

function BackstoryInputsForm({ editing }: { editing: WizardStepProps }) {
  const { inputs, errors, onAction, onBlur } = editing
  return (
    <div className="flex flex-col gap-4">
      {BACKSTORY_KEYS.map((key) => (
        <WizardTextarea
          key={key}
          field={`backstory.${key}`}
          label={backstoryLabels[key]}
          value={inputs.backstory[key]}
          maxLength={BACKSTORY_TEXT_LENGTH_MAX}
          error={errors[`backstory.${key}`]}
          onChange={(value) => onAction({ type: 'backstory', key, value })}
          onBlur={onBlur}
        />
      ))}
      <KeyConnectionChoice backstory={inputs.backstory} keyConnection={inputs.keyConnection} onChange={(entry) => onAction({ type: 'keyConnection', entry })} />
    </div>
  )
}

interface KeyConnectionChoiceProps {
  backstory: BackstoryInputs
  keyConnection: BackstoryEntry | null
  onChange: (entry: BackstoryEntry | null) => void
}

// Section 12: one filled-in Background entry, or none.
function KeyConnectionChoice({ backstory, keyConnection, onChange }: KeyConnectionChoiceProps) {
  const labelId = useId()
  const eligible = BACKSTORY_ENTRIES.filter((entry) => isFilled(backstory[entry]))
  if (eligible.length === 0) {
    return <p className="text-sm text-muted-foreground">Fill in a Background entry to choose your Key Connection.</p>
  }

  const radioId = (value: string) => `key-connection-${value}`
  const choose = (value: string) => onChange(value === NO_KEY_CONNECTION ? null : (value as BackstoryEntry))
  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-sm font-medium">
        Which of these is your Key Connection?
      </span>
      <RadioGroup id="field-keyConnection" aria-labelledby={labelId} value={keyConnection ?? NO_KEY_CONNECTION} onValueChange={choose}>
        {[...eligible, NO_KEY_CONNECTION].map((value) => (
          <div key={value} className="flex items-center gap-2">
            <RadioGroupItem id={radioId(value)} value={value} className="size-5" />
            <label htmlFor={radioId(value)} className="text-sm">
              {value === NO_KEY_CONNECTION ? 'None' : backstoryLabels[value as BackstoryEntry]}
            </label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
