import { RepeatingRows } from '@/scenario-preparation/components/repeating-rows/repeating-rows'
import { SpellRowFields } from '@/scenario-preparation/components/spell-row-fields/spell-row-fields'
import { type SectionFieldsProps } from '@/scenario-preparation/services/humanNpcForm'
import { addRowButtonId } from '@/scenario-preparation/services/profileForm'

/** The repeating spell rows of the Spells section (specs/scenario-preparation/ux.md section 25.4). */
export function NpcSpellRows({ state, dispatch, errorOf }: SectionFieldsProps) {
  const spells = state.spells
  if (!spells) {
    return null
  }

  return (
    <RepeatingRows item="spell" items="spells" count={spells.length} addButtonId={addRowButtonId('spells')} onAdd={() => dispatch({ type: 'addSpell' })}>
      {spells.map((row, index) => (
        <SpellRowFields
          key={row.key}
          list="spells"
          item="Spell"
          index={index}
          row={row}
          errorOf={errorOf}
          onTextChange={(field, value) => field !== 'limits' && dispatch({ type: 'setSpellText', index, field, value })}
          onRemove={() => dispatch({ type: 'removeSpell', index })}
        />
      ))}
    </RepeatingRows>
  )
}
