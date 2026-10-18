import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import type { SectionFieldsProps } from '@/scenario-preparation/services/mythosCreatureForm'

/** The Sanity loss input of the Sanity loss section (specs/scenario-preparation/ux.md section 25.5). */
export function MonsterSanityLossFields({ state, dispatch, errorOf }: SectionFieldsProps) {
  if (state.sanityLoss === null) {
    return null
  }

  return (
    <WizardField
      field="sanityLoss.value"
      label="Sanity loss"
      help="Success/failure, for example 0/1D6 or 1/1D10."
      value={state.sanityLoss}
      error={errorOf('sanityLoss.value')}
      onChange={(value) => dispatch({ type: 'setSanityLoss', value: value ?? '' })}
      className="w-40"
    />
  )
}
