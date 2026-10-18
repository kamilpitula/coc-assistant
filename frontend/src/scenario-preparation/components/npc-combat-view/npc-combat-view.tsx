import { StatTable } from '@/scenario-preparation/components/stat-table/stat-table'
import { describeSkill } from '@/scenario-preparation/services/skillRowLabels'
import type { HumanNpcCombat, HumanNpcSkill, HumanNpcWeapon } from '@/scenario-preparation/types/HumanNpc'

interface NpcCombatViewProps {
  combat: HumanNpcCombat
  /** The profile's skills, so a weapon's skill can show its value. */
  skills: HumanNpcSkill[]
}

function weaponSkillText(weapon: HumanNpcWeapon, skills: HumanNpcSkill[]): string {
  if (!weapon.skill) {
    return ''
  }
  const name = describeSkill(weapon.skill)
  const match = skills.find((skill) => describeSkill(skill).toLowerCase() === name.toLowerCase())
  return match?.value == null ? name : `${name} ${match.value}%`
}

function weaponDetails(weapon: HumanNpcWeapon): string {
  return [
    weapon.range ? `Range ${weapon.range}` : null,
    weapon.ammunition ? `Ammunition ${weapon.ammunition}` : null,
    weapon.malfunction ? `Malfunction ${weapon.malfunction}` : null,
    weapon.impaling ? 'Impaling' : null,
  ]
    .filter((part): part is string => part !== null)
    .join('; ')
}

/** A line of the combat definition list, left out when the value was not entered. */
function combatLines(combat: HumanNpcCombat): [string, string][] {
  const lines: [string, string | null][] = [
    ['Dodge', combat.dodge === null ? null : `${combat.dodge}${combat.dodgeDifficulty ? ` (Investigator difficulty: ${combat.dodgeDifficulty})` : ''}`],
    ['Armor points', combat.armorPoints === null ? null : String(combat.armorPoints)],
    ['Tactics and morale', combat.tacticsAndMorale],
  ]
  return lines.filter((line): line is [string, string] => line[1] !== null && line[1] !== '')
}

/**
 * The Combat section in view mode: Dodge with its Investigator Difficulty, armor points, tactics and morale, and a
 * weapons table (specs/scenario-preparation/ux.md section 25.4; SP-UX-42).
 */
export function NpcCombatView({ combat, skills }: NpcCombatViewProps) {
  const lines = combatLines(combat)
  if (lines.length === 0 && combat.weapons.length === 0) {
    return <p className="text-sm text-muted-foreground">None recorded.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {lines.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {lines.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="font-medium">{label}</dt>
              <dd className="break-words whitespace-pre-wrap">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {combat.weapons.length > 0 && (
        <StatTable
          label="Weapons"
          columns={['Weapon', 'Skill', 'Damage', 'Attacks', 'Details']}
          rows={combat.weapons.map((weapon) => [
            weapon.name ?? '',
            weaponSkillText(weapon, skills),
            weapon.damage ?? '',
            String(weapon.attacksPerRound ?? ''),
            weaponDetails(weapon),
          ])}
        />
      )}
    </div>
  )
}
