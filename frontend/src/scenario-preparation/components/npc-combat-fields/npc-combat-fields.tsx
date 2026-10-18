import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardSelect } from '@/campaign-play/components/wizard-select/wizard-select'
import { WizardTextarea } from '@/campaign-play/components/wizard-textarea/wizard-textarea'
import { RemoveRowButton } from '@/scenario-preparation/components/remove-row-button/remove-row-button'
import { RepeatingRows } from '@/scenario-preparation/components/repeating-rows/repeating-rows'
import {
  addRowButtonId,
  type SectionFieldsProps,
  type SkillRowState,
  type WeaponRowState,
} from '@/scenario-preparation/services/humanNpcForm'
import { rowPath } from '@/scenario-preparation/services/profileForm'
import { skillRowName } from '@/scenario-preparation/services/skillRowLabels'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { Label } from '@/shared/components/ui/label'

/** The Combat section: Dodge, armor points, tactics and morale, and the weapon rows (specs/scenario-preparation/ux.md section 25.4). */
export function NpcCombatFields({ state, dispatch, errorOf }: SectionFieldsProps) {
  const combat = state.combat
  if (!combat) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-3">
        <WizardField
          type="number"
          field="combat.dodge"
          label="Dodge"
          value={combat.dodge}
          error={errorOf('combat.dodge')}
          onChange={(value) => dispatch({ type: 'setDodge', value })}
          className="w-32"
        />
        <WizardField
          type="number"
          field="combat.armorPoints"
          label="Armor points"
          value={combat.armorPoints}
          error={errorOf('combat.armorPoints')}
          onChange={(value) => dispatch({ type: 'setArmorPoints', value })}
          className="w-32"
        />
      </div>
      <WizardTextarea
        field="combat.tacticsAndMorale"
        label="Tactics and morale"
        value={combat.tacticsAndMorale === '' ? null : combat.tacticsAndMorale}
        error={errorOf('combat.tacticsAndMorale')}
        onChange={(value) => dispatch({ type: 'setTactics', value: value ?? '' })}
      />
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="text-sm font-medium">Weapons</legend>
        <p className="text-sm text-muted-foreground">Damage uses dice like 1D6+DB or 2D6-1. Firearms don&apos;t add DB.</p>
        <RepeatingRows
          item="weapon"
          items="weapons"
          count={combat.weapons.length}
          addButtonId={addRowButtonId('combat.weapons')}
          onAdd={() => dispatch({ type: 'addWeapon' })}
        >
          {combat.weapons.map((weapon, index) => (
            <WeaponRow key={weapon.key} weapon={weapon} index={index} skills={state.skills ?? []} dispatch={dispatch} errorOf={errorOf} />
          ))}
        </RepeatingRows>
      </fieldset>
      <p className="text-sm text-muted-foreground">Hit Points and other worked-out values update when you save.</p>
    </div>
  )
}

interface WeaponRowProps {
  weapon: WeaponRowState
  index: number
  skills: SkillRowState[]
  dispatch: SectionFieldsProps['dispatch']
  errorOf: SectionFieldsProps['errorOf']
}

const weaponLabel = (weapon: WeaponRowState, index: number): string => (weapon.name.trim() === '' ? `weapon ${index + 1}` : weapon.name.trim())

function WeaponRow({ weapon, index, skills, dispatch, errorOf }: WeaponRowProps) {
  const label = weaponLabel(weapon, index)
  const path = (field: string) => rowPath('combat.weapons', index, field)

  return (
    <div role="group" aria-label={`Weapon ${index + 1}`} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start gap-3">
        <WizardField
          field={path('name')}
          label="Name"
          value={weapon.name}
          error={errorOf(path('name'))}
          onChange={(value) => dispatch({ type: 'setWeaponText', index, field: 'name', value: value ?? '' })}
          className="min-w-40 flex-1"
        />
        <WeaponSkillSelect weapon={weapon} index={index} skills={skills} dispatch={dispatch} errorOf={errorOf} />
        <WizardField
          field={path('damage')}
          label="Damage"
          value={weapon.damage}
          error={errorOf(path('damage'))}
          onChange={(value) => dispatch({ type: 'setWeaponText', index, field: 'damage', value: value ?? '' })}
          className="w-36"
        />
        <WizardField
          type="number"
          field={path('attacksPerRound')}
          label="Attacks per round"
          value={weapon.attacksPerRound}
          error={errorOf(path('attacksPerRound'))}
          onChange={(value) => dispatch({ type: 'setWeaponAttacks', index, value })}
          className="w-32"
        />
        <div className="ml-auto self-end">
          <RemoveRowButton label={`Remove weapon ${weapon.name.trim() === '' ? index + 1 : label}`} onClick={() => dispatch({ type: 'removeWeapon', index })} />
        </div>
      </div>
      <WeaponDetails weapon={weapon} index={index} label={label} dispatch={dispatch} errorOf={errorOf} />
    </div>
  )
}

function WeaponSkillSelect({ weapon, index, skills, dispatch, errorOf }: WeaponRowProps) {
  if (skills.length === 0) {
    return <p className="min-w-40 flex-1 self-end pb-2 text-sm text-muted-foreground">Add the skill under Skills first.</p>
  }

  const options = skills.map((skill, position) => ({
    value: String(skill.key),
    label: skillRowName(skill) ?? `Skill ${position + 1}`,
  }))

  return (
    <WizardSelect
      field={rowPath('combat.weapons', index, 'skill')}
      label="Skill"
      value={weapon.skillKey === null ? null : String(weapon.skillKey)}
      options={options}
      error={errorOf(rowPath('combat.weapons', index, 'skill'))}
      onChange={(value) => dispatch({ type: 'setWeaponSkill', index, skillKey: Number(value) })}
      className="min-w-40 flex-1"
    />
  )
}

interface WeaponDetailsProps {
  weapon: WeaponRowState
  index: number
  label: string
  dispatch: SectionFieldsProps['dispatch']
  errorOf: SectionFieldsProps['errorOf']
}

/** Range, Ammunition, Malfunction, and Impaling; open from the start when one has a value, and opened by a server problem (SP-UX-43). */
function WeaponDetails({ weapon, index, label, dispatch, errorOf }: WeaponDetailsProps) {
  const path = (field: string) => rowPath('combat.weapons', index, field)
  const hasValue = weapon.range !== '' || weapon.ammunition !== '' || weapon.malfunction !== '' || weapon.impaling
  const hasProblem = Boolean(errorOf(path('range')) || errorOf(path('ammunition')) || errorOf(path('malfunction')))
  // Open from the start with a value, and held open by a server problem so its summary link reaches a visible field.
  const [opened, setOpened] = useState<boolean | null>(null)
  const open = hasProblem || (opened ?? hasValue)

  const text = (field: 'range' | 'ammunition' | 'malfunction', title: string) => (
    <WizardField
      field={path(field)}
      label={title}
      value={weapon[field]}
      error={errorOf(path(field))}
      onChange={(value) => dispatch({ type: 'setWeaponText', index, field, value: value ?? '' })}
      className="min-w-32 flex-1"
    />
  )

  return (
    <Collapsible open={open} onOpenChange={setOpened}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="link" className="px-0">
          <ChevronDown aria-hidden="true" className={open ? 'rotate-180' : undefined} />
          More details for {label}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 pt-2">
        <div className="flex flex-wrap items-start gap-3">
          {text('range', 'Range')}
          {text('ammunition', 'Ammunition')}
          {text('malfunction', 'Malfunction')}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${path('impaling').replace(/[^A-Za-z0-9]+/g, '-')}`}
            checked={weapon.impaling}
            onCheckedChange={(checked) => dispatch({ type: 'setWeaponImpaling', index, value: checked === true })}
          />
          <Label htmlFor={`${path('impaling').replace(/[^A-Za-z0-9]+/g, '-')}`}>Impaling weapon</Label>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
