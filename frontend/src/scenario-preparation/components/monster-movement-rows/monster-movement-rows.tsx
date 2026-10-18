import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardSelect } from '@/campaign-play/components/wizard-select/wizard-select'
import { RemoveRowButton } from '@/scenario-preparation/components/remove-row-button/remove-row-button'
import { RepeatingRows } from '@/scenario-preparation/components/repeating-rows/repeating-rows'
import type { MovementRowState, SectionFieldsProps } from '@/scenario-preparation/services/mythosCreatureForm'
import { addRowButtonId, rowPath } from '@/scenario-preparation/services/profileForm'
import { MOVEMENT_MODES, type MovementMode } from '@/scenario-preparation/types/MythosCreature'

const MODE_OPTIONS = MOVEMENT_MODES.map((mode) => ({ value: mode, label: mode }))

/** A row's label for its Remove button: the mode, "Other (name)", else the row number (ux.md section 25.5). */
function rowLabel(row: MovementRowState, index: number): string {
  if (row.mode !== 'Other') {
    return row.mode
  }
  const label = row.label.trim()
  return label === '' ? String(index + 1) : `Other (${label})`
}

/** The repeating movement-mode rows of the Movement section (specs/scenario-preparation/ux.md section 25.5). */
export function MonsterMovementRows({ state, dispatch, errorOf }: SectionFieldsProps) {
  const movement = state.movement
  if (!movement) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Enter each way it moves, from 0 to 999. With no modes it has no ordinary movement.</p>
      <RepeatingRows
        item="movement mode"
        items="movement modes"
        count={movement.length}
        addButtonId={addRowButtonId('movement')}
        onAdd={() => dispatch({ type: 'addMovement' })}
      >
        {movement.map((row, index) => (
          <MovementRow key={row.key} row={row} index={index} dispatch={dispatch} errorOf={errorOf} />
        ))}
      </RepeatingRows>
    </div>
  )
}

interface MovementRowProps {
  row: MovementRowState
  index: number
  dispatch: SectionFieldsProps['dispatch']
  errorOf: SectionFieldsProps['errorOf']
}

function MovementRow({ row, index, dispatch, errorOf }: MovementRowProps) {
  const path = (field: string) => rowPath('movement', index, field)

  return (
    <div role="group" aria-label={`Movement mode ${index + 1}`} className="flex flex-wrap items-start gap-3">
      <WizardSelect
        field={path('mode')}
        label="Mode"
        value={row.mode}
        options={MODE_OPTIONS}
        error={errorOf(path('mode'))}
        onChange={(value) => dispatch({ type: 'setMovementMode', index, mode: value as MovementMode })}
        className="w-36"
      />
      {row.mode === 'Other' && (
        <WizardField
          field={path('label')}
          label="Name of the mode"
          value={row.label}
          error={errorOf(path('label'))}
          onChange={(value) => dispatch({ type: 'setMovementLabel', index, value: value ?? '' })}
          className="min-w-40 flex-1"
        />
      )}
      <WizardField
        type="number"
        field={path('rate')}
        label="Rate"
        value={row.rate}
        error={errorOf(path('rate'))}
        onChange={(value) => dispatch({ type: 'setMovementRate', index, value })}
        className="w-24"
      />
      <div className="ml-auto self-end">
        <RemoveRowButton label={`Remove movement mode ${rowLabel(row, index)}`} onClick={() => dispatch({ type: 'removeMovement', index })} />
      </div>
    </div>
  )
}
