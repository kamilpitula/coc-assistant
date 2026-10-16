import { useEffect, useId, useRef, useState } from 'react'

import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { fieldId } from '@/campaign-play/services/fieldIds'
import type { CustomWeaponInputs } from '@/campaign-play/types/CharacterSheet'
import type { WizardStepProps } from '@/campaign-play/types/WizardStepProps'
import { Button } from '@/shared/components/ui/button'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

/** A Custom Weapon's text limit, matching the API (specs/character-sheet/spec.md, API Contracts). */
export const WEAPON_TEXT_LENGTH_MAX = 100

const WEAPON_FIELDS: { field: keyof CustomWeaponInputs; column: string; label: string }[] = [
  { field: 'name', column: 'Weapon', label: 'name' },
  { field: 'skill', column: 'Skill', label: 'skill' },
  { field: 'damage', column: 'Damage', label: 'damage' },
  { field: 'attacks', column: 'Attacks', label: 'attacks' },
  { field: 'range', column: 'Range', label: 'range' },
  { field: 'ammo', column: 'Ammo', label: 'ammo' },
  { field: 'malfunction', column: 'Malfunction', label: 'malfunction' },
]

interface SheetWeaponsSectionProps {
  weapons: CustomWeaponInputs[]
  /** On the Sheet and submit step: the wizard's inputs and actions. Omit for the read-only sheet. */
  editing?: WizardStepProps
}

/**
 * The Custom Weapons (specs/character-sheet/ux.md section 6.7 item 4 and section 7). Every weapon is entered by the
 * Player and checked by the Keeper (docs/game-rules project_ruleset.md section 4.2).
 */
export function SheetWeaponsSection({ weapons, editing }: SheetWeaponsSectionProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-xl font-semibold">
        Weapons
      </h2>
      {editing ? <WeaponInputs editing={editing} /> : <WeaponsTable weapons={weapons} />}
    </section>
  )
}

function WeaponsTable({ weapons }: { weapons: CustomWeaponInputs[] }) {
  if (weapons.length === 0) {
    return <p className="text-sm text-muted-foreground">None recorded.</p>
  }

  return (
    <Table>
      <TableCaption className="sr-only">Weapons</TableCaption>
      <TableHeader>
        <TableRow>
          {WEAPON_FIELDS.map(({ column }) => (
            <TableHead key={column} scope="col">
              {column}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {weapons.map((weapon, index) => (
          <TableRow key={index}>
            <TableHead scope="row" className="text-foreground">
              {weapon.name}
            </TableHead>
            {WEAPON_FIELDS.slice(1).map(({ field }) => (
              <TableCell key={field}>{weapon[field]}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

type PendingFocus = { kind: 'name'; index: number } | { kind: 'add' } | null

function WeaponInputs({ editing }: { editing: WizardStepProps }) {
  const { inputs, errors, onAction, onBlur } = editing
  const addButton = useRef<HTMLButtonElement>(null)
  const [pendingFocus, setPendingFocus] = useState<PendingFocus>(null)

  // ux.md 6.7: focus the new weapon's name after "Add weapon", and "Add weapon" after a removal.
  useEffect(() => {
    if (pendingFocus?.kind === 'name') {
      document.getElementById(fieldId(`weapons[${pendingFocus.index}].name`))?.focus()
    } else if (pendingFocus?.kind === 'add') {
      addButton.current?.focus()
    }
  }, [pendingFocus])

  const add = () => {
    onAction({ type: 'addWeapon' })
    setPendingFocus({ kind: 'name', index: inputs.weapons.length })
  }

  const remove = (index: number) => {
    onAction({ type: 'removeWeapon', index })
    setPendingFocus({ kind: 'add' })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Enter weapon details from your rulebook. Your Keeper checks them when approving.</p>
      {inputs.weapons.map((weapon, index) => (
        <fieldset key={index} className="flex flex-col gap-3 rounded-md border p-4">
          <legend className="px-1 font-semibold">Weapon {index + 1}</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {WEAPON_FIELDS.map(({ field, label }) => (
              <WizardField
                key={field}
                field={`weapons[${index}].${field}`}
                label={`Weapon ${index + 1} ${label}`}
                value={weapon[field]}
                maxLength={WEAPON_TEXT_LENGTH_MAX}
                error={errors[`weapons[${index}].${field}`]}
                onChange={(value) => onAction({ type: 'weapon', index, field, value })}
                onBlur={onBlur}
              />
            ))}
          </div>
          <Button type="button" variant="outline" className="self-start" onClick={() => remove(index)}>
            Remove weapon {index + 1}
          </Button>
        </fieldset>
      ))}
      <Button ref={addButton} type="button" variant="secondary" className="self-start" onClick={add}>
        Add weapon
      </Button>
    </div>
  )
}
