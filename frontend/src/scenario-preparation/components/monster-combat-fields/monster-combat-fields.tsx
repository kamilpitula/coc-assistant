import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardTextarea } from '@/campaign-play/components/wizard-textarea/wizard-textarea'
import { RemoveRowButton } from '@/scenario-preparation/components/remove-row-button/remove-row-button'
import { RepeatingRows } from '@/scenario-preparation/components/repeating-rows/repeating-rows'
import type { AttackRowState, SectionFieldsProps } from '@/scenario-preparation/services/mythosCreatureForm'
import { addRowButtonId, rowPath } from '@/scenario-preparation/services/profileForm'
import { fieldId } from '@/campaign-play/services/fieldIds'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { Label } from '@/shared/components/ui/label'

/** The Combat section: attacks per round, Dodge, and the attack rows (specs/scenario-preparation/ux.md section 25.5). */
export function MonsterCombatFields({ state, dispatch, errorOf }: SectionFieldsProps) {
  const combat = state.combat
  if (!combat) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-3">
        <WizardField
          type="number"
          field="combat.attacksPerRound"
          label="Attacks per round"
          value={combat.attacksPerRound}
          error={errorOf('combat.attacksPerRound')}
          onChange={(value) => dispatch({ type: 'setAttacksPerRound', value })}
          className="w-36"
        />
        <WizardField
          type="number"
          field="combat.dodge"
          label="Dodge"
          value={combat.dodge}
          error={errorOf('combat.dodge')}
          onChange={(value) => dispatch({ type: 'setDodge', value })}
          className="w-32"
        />
      </div>
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="text-sm font-medium">Attacks</legend>
        <p className="text-sm text-muted-foreground">
          Damage uses dice like 1D6+DB or 2D6-1. Write DB only where Damage Bonus applies; firearms never add it.
        </p>
        <RepeatingRows
          item="attack"
          items="attacks"
          count={combat.attacks.length}
          addButtonId={addRowButtonId('combat.attacks')}
          onAdd={() => dispatch({ type: 'addAttack' })}
        >
          {combat.attacks.map((attack, index) => (
            <AttackRow key={attack.key} attack={attack} index={index} dispatch={dispatch} errorOf={errorOf} />
          ))}
        </RepeatingRows>
      </fieldset>
      <p className="text-sm text-muted-foreground">Hit Points and other worked-out values update when you save.</p>
    </div>
  )
}

interface AttackRowProps {
  attack: AttackRowState
  index: number
  dispatch: SectionFieldsProps['dispatch']
  errorOf: SectionFieldsProps['errorOf']
}

const attackLabel = (attack: AttackRowState, index: number): string => (attack.name.trim() === '' ? `attack ${index + 1}` : attack.name.trim())

function AttackRow({ attack, index, dispatch, errorOf }: AttackRowProps) {
  const label = attackLabel(attack, index)
  const path = (field: string) => rowPath('combat.attacks', index, field)

  return (
    <div role="group" aria-label={`Attack ${index + 1}`} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start gap-3">
        <WizardField
          field={path('name')}
          label="Name"
          value={attack.name}
          error={errorOf(path('name'))}
          onChange={(value) => dispatch({ type: 'setAttackText', index, field: 'name', value: value ?? '' })}
          className="min-w-40 flex-1"
        />
        <WizardField
          field={path('skill')}
          label="Skill"
          value={attack.skill}
          error={errorOf(path('skill'))}
          onChange={(value) => dispatch({ type: 'setAttackText', index, field: 'skill', value: value ?? '' })}
          className="w-36"
        />
        <WizardField
          type="number"
          field={path('skillValue')}
          label="Value"
          value={attack.skillValue}
          error={errorOf(path('skillValue'))}
          onChange={(value) => dispatch({ type: 'setAttackValue', index, value })}
          className="w-24"
        />
        <WizardField
          field={path('damage')}
          label="Damage"
          value={attack.damage}
          error={errorOf(path('damage'))}
          onChange={(value) => dispatch({ type: 'setAttackText', index, field: 'damage', value: value ?? '' })}
          className="w-36"
        />
        <div className="ml-auto self-end">
          <RemoveRowButton label={`Remove attack ${attack.name.trim() === '' ? index + 1 : label}`} onClick={() => dispatch({ type: 'removeAttack', index })} />
        </div>
      </div>
      <AttackDetails attack={attack} index={index} label={label} dispatch={dispatch} errorOf={errorOf} />
    </div>
  )
}

interface AttackDetailsProps extends AttackRowProps {
  label: string
}

/** Effect and Manoeuvre; open from the start when one has a value, and held open by a server problem (SP-UX-47). */
function AttackDetails({ attack, index, label, dispatch, errorOf }: AttackDetailsProps) {
  const path = (field: string) => rowPath('combat.attacks', index, field)
  const hasValue = attack.effect !== '' || attack.manoeuvre
  const hasProblem = Boolean(errorOf(path('effect')))
  const [opened, setOpened] = useState<boolean | null>(null)
  const open = hasProblem || (opened ?? hasValue)
  const manoeuvreId = `${fieldId(path('manoeuvre'))}`

  return (
    <Collapsible open={open} onOpenChange={setOpened}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="link" className="px-0">
          <ChevronDown aria-hidden="true" className={open ? 'rotate-180' : undefined} />
          More details for {label}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 pt-2">
        <WizardTextarea
          field={path('effect')}
          label="Effect"
          value={attack.effect === '' ? null : attack.effect}
          error={errorOf(path('effect'))}
          onChange={(value) => dispatch({ type: 'setAttackText', index, field: 'effect', value: value ?? '' })}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id={manoeuvreId}
            checked={attack.manoeuvre}
            onCheckedChange={(checked) => dispatch({ type: 'setAttackManoeuvre', index, value: checked === true })}
          />
          <Label htmlFor={manoeuvreId}>Manoeuvre (no damage needed)</Label>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
