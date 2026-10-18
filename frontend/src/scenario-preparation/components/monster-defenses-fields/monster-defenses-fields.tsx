import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardTextarea } from '@/campaign-play/components/wizard-textarea/wizard-textarea'
import { RemoveRowButton } from '@/scenario-preparation/components/remove-row-button/remove-row-button'
import { RepeatingRows } from '@/scenario-preparation/components/repeating-rows/repeating-rows'
import type { DefenseRowState, SectionFieldsProps } from '@/scenario-preparation/services/mythosCreatureForm'
import { addRowButtonId, rowPath } from '@/scenario-preparation/services/profileForm'

type DefenseList = 'immunities' | 'vulnerabilities'

const LISTS: { list: DefenseList; legend: string; item: string; items: string }[] = [
  { list: 'immunities', legend: 'Immunities', item: 'immunity', items: 'immunities' },
  { list: 'vulnerabilities', legend: 'Vulnerabilities', item: 'vulnerability', items: 'vulnerabilities' },
]

/** The Defenses section: armor, and the immunity and vulnerability rows (specs/scenario-preparation/ux.md section 25.5). */
export function MonsterDefensesFields({ state, dispatch, errorOf }: SectionFieldsProps) {
  const defenses = state.defenses
  if (!defenses) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-3">
        <WizardField
          type="number"
          field="defenses.armorPoints"
          label="Armor points"
          value={defenses.armorPoints}
          error={errorOf('defenses.armorPoints')}
          onChange={(value) => dispatch({ type: 'setArmorPoints', value })}
          className="w-32"
        />
      </div>
      <WizardTextarea
        field="defenses.armorNote"
        label="Armor note"
        value={defenses.armorNote === '' ? null : defenses.armorNote}
        error={errorOf('defenses.armorNote')}
        onChange={(value) => dispatch({ type: 'setArmorNote', value: value ?? '' })}
      />
      <p className="text-sm text-muted-foreground">Say what it covers and when, for example: Ordinary bullets inflict no damage.</p>
      {LISTS.map(({ list, legend, item, items }) => (
        <fieldset key={list} className="flex min-w-0 flex-col gap-3">
          <legend className="text-sm font-medium">{legend}</legend>
          <RepeatingRows
            item={item}
            items={items}
            count={defenses[list].length}
            addButtonId={addRowButtonId(`defenses.${list}`)}
            onAdd={() => dispatch({ type: 'addDefenseEntry', list })}
          >
            {defenses[list].map((row, index) => (
              <EntryRow key={row.key} list={list} item={item} row={row} index={index} dispatch={dispatch} errorOf={errorOf} />
            ))}
          </RepeatingRows>
        </fieldset>
      ))}
    </div>
  )
}

interface EntryRowProps {
  list: DefenseList
  item: string
  row: DefenseRowState
  index: number
  dispatch: SectionFieldsProps['dispatch']
  errorOf: SectionFieldsProps['errorOf']
}

function EntryRow({ list, item, row, index, dispatch, errorOf }: EntryRowProps) {
  const path = rowPath(`defenses.${list}`, index, 'description')

  return (
    <div role="group" aria-label={`${item[0].toUpperCase()}${item.slice(1)} ${index + 1}`} className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <WizardTextarea
          field={path}
          label="Description"
          value={row.description === '' ? null : row.description}
          error={errorOf(path)}
          onChange={(value) => dispatch({ type: 'setDefenseEntry', list, index, value: value ?? '' })}
        />
      </div>
      <div className="self-end">
        <RemoveRowButton label={`Remove ${item} ${index + 1}`} onClick={() => dispatch({ type: 'removeDefenseEntry', list, index })} />
      </div>
    </div>
  )
}
