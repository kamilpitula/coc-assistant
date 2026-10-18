import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardTextarea } from '@/campaign-play/components/wizard-textarea/wizard-textarea'
import { RemoveRowButton } from '@/scenario-preparation/components/remove-row-button/remove-row-button'
import { rowPath } from '@/scenario-preparation/services/profileForm'

export type SpellTextField = 'name' | 'magicPointCost' | 'effect' | 'limits'

export interface SpellRowValues {
  name: string
  magicPointCost: string
  effect: string
  /** Present only for a row that has a Limits field, such as a Mythos Creature's power. */
  limits?: string
}

interface SpellRowFieldsProps {
  /** The request list the row belongs to, for example "spells"; builds the field paths. */
  list: string
  /** The singular label, for example "Spell"; names the group and the Remove button. */
  item: string
  index: number
  row: SpellRowValues
  errorOf: (path: string) => string | undefined
  onTextChange: (field: SpellTextField, value: string) => void
  onRemove: () => void
}

/** One spell-like row: name, Magic Point cost, effect, and optionally limits (specs/scenario-preparation/ux.md sections 25.4, 25.5). */
export function SpellRowFields({ list, item, index, row, errorOf, onTextChange, onRemove }: SpellRowFieldsProps) {
  const name = row.name.trim()
  const removeLabel = `Remove ${item.toLowerCase()} ${name === '' ? index + 1 : name}`
  const path = (field: string) => rowPath(list, index, field)

  return (
    <div role="group" aria-label={`${item} ${index + 1}`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-3">
        <WizardField
          field={path('name')}
          label="Name"
          value={row.name}
          error={errorOf(path('name'))}
          onChange={(value) => onTextChange('name', value ?? '')}
          className="min-w-48 flex-1"
        />
        <WizardField
          field={path('magicPointCost')}
          label="Magic Point cost"
          value={row.magicPointCost}
          error={errorOf(path('magicPointCost'))}
          onChange={(value) => onTextChange('magicPointCost', value ?? '')}
          className="w-40"
        />
        <div className="ml-auto self-end">
          <RemoveRowButton label={removeLabel} onClick={onRemove} />
        </div>
      </div>
      <WizardTextarea
        field={path('effect')}
        label="Effect"
        value={row.effect === '' ? null : row.effect}
        error={errorOf(path('effect'))}
        onChange={(value) => onTextChange('effect', value ?? '')}
      />
      {row.limits !== undefined && (
        <WizardTextarea
          field={path('limits')}
          label="Limits"
          value={row.limits === '' ? null : row.limits}
          error={errorOf(path('limits'))}
          onChange={(value) => onTextChange('limits', value ?? '')}
        />
      )}
    </div>
  )
}
