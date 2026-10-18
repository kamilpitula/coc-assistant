import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardTextarea } from '@/campaign-play/components/wizard-textarea/wizard-textarea'
import { RemoveRowButton } from '@/scenario-preparation/components/remove-row-button/remove-row-button'
import { RepeatingRows } from '@/scenario-preparation/components/repeating-rows/repeating-rows'
import { addRowButtonId, rowPath, type SectionFieldsProps, type SpellRowState } from '@/scenario-preparation/services/humanNpcForm'

/** The repeating spell rows of the Spells section (specs/scenario-preparation/ux.md section 25.4). */
export function NpcSpellRows({ state, dispatch, errorOf }: SectionFieldsProps) {
  const spells = state.spells
  if (!spells) {
    return null
  }

  return (
    <RepeatingRows item="spell" items="spells" count={spells.length} addButtonId={addRowButtonId('spells')} onAdd={() => dispatch({ type: 'addSpell' })}>
      {spells.map((row, index) => (
        <SpellRow key={row.key} row={row} index={index} dispatch={dispatch} errorOf={errorOf} />
      ))}
    </RepeatingRows>
  )
}

interface SpellRowProps {
  row: SpellRowState
  index: number
  dispatch: SectionFieldsProps['dispatch']
  errorOf: SectionFieldsProps['errorOf']
}

function SpellRow({ row, index, dispatch, errorOf }: SpellRowProps) {
  const name = row.name.trim()
  const removeLabel = `Remove spell ${name === '' ? index + 1 : name}`
  const path = (field: string) => rowPath('spells', index, field)

  return (
    <div role="group" aria-label={`Spell ${index + 1}`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-3">
        <WizardField
          field={path('name')}
          label="Name"
          value={row.name}
          error={errorOf(path('name'))}
          onChange={(value) => dispatch({ type: 'setSpellText', index, field: 'name', value: value ?? '' })}
          className="min-w-48 flex-1"
        />
        <WizardField
          field={path('magicPointCost')}
          label="Magic Point cost"
          value={row.magicPointCost}
          error={errorOf(path('magicPointCost'))}
          onChange={(value) => dispatch({ type: 'setSpellText', index, field: 'magicPointCost', value: value ?? '' })}
          className="w-40"
        />
        <div className="ml-auto self-end">
          <RemoveRowButton label={removeLabel} onClick={() => dispatch({ type: 'removeSpell', index })} />
        </div>
      </div>
      <WizardTextarea
        field={path('effect')}
        label="Effect"
        value={row.effect === '' ? null : row.effect}
        error={errorOf(path('effect'))}
        onChange={(value) => dispatch({ type: 'setSpellText', index, field: 'effect', value: value ?? '' })}
      />
    </div>
  )
}
