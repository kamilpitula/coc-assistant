import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { type SectionFieldsProps } from '@/scenario-preparation/services/humanNpcForm'
import { CHARACTERISTIC_CODES, CHARACTERISTIC_NAMES } from '@/scenario-preparation/types/HumanNpc'

/** The eight characteristic inputs of the Characteristics section (specs/scenario-preparation/ux.md section 25.4). */
export function NpcCharacteristicsFields({ state, dispatch, errorOf }: SectionFieldsProps) {
  const values = state.characteristics
  if (!values) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Enter only the characteristics this Scenario needs, from 0 to 100.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CHARACTERISTIC_CODES.map((code) => (
          <WizardField
            key={code}
            type="number"
            field={`characteristics.${code}`}
            label={`${code} ${CHARACTERISTIC_NAMES[code]}`}
            value={values[code]}
            error={errorOf(`characteristics.${code}`)}
            onChange={(value) => dispatch({ type: 'setCharacteristic', code, value })}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Hit Points and other worked-out values update when you save.</p>
    </div>
  )
}
