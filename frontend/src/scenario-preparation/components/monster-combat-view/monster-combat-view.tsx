import { StatTable } from '@/scenario-preparation/components/stat-table/stat-table'
import type { MonsterAttack, MonsterCombat } from '@/scenario-preparation/types/MythosCreature'

function skillText(attack: MonsterAttack): string {
  const skill = attack.skill ?? ''
  return attack.skillValue === null ? skill : `${skill} ${attack.skillValue}%`
}

function damageText(attack: MonsterAttack): string {
  if (attack.damage) {
    return attack.damage
  }
  return attack.manoeuvre ? 'Manoeuvre' : ''
}

/** A line of the combat definition list, left out when the value was not entered. */
function combatLines(combat: MonsterCombat): [string, string][] {
  const dodge = combat.dodge === null ? null : `${combat.dodge}${combat.dodgeDifficulty ? ` (Investigator difficulty: ${combat.dodgeDifficulty})` : ''}`
  const lines: [string, string | null][] = [
    ['Attacks per round', combat.attacksPerRound === null ? null : String(combat.attacksPerRound)],
    ['Dodge', dodge],
  ]
  return lines.filter((line): line is [string, string] => line[1] !== null)
}

interface MonsterCombatViewProps {
  combat: MonsterCombat
}

/**
 * The Combat section of a Monster Profile in view mode: attacks per round, Dodge with its Investigator Difficulty, and an
 * attacks table (specs/scenario-preparation/ux.md section 25.5; SP-UX-48).
 */
export function MonsterCombatView({ combat }: MonsterCombatViewProps) {
  const lines = combatLines(combat)
  if (lines.length === 0 && combat.attacks.length === 0) {
    return <p className="text-sm text-muted-foreground">None recorded.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {lines.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {lines.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="font-medium">{label}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {combat.attacks.length > 0 && (
        <StatTable
          label="Attacks"
          columns={['Attack', 'Skill', 'Investigator difficulty', 'Damage', 'Effect']}
          rows={combat.attacks.map((attack) => [attack.name ?? '', skillText(attack), attack.difficulty, damageText(attack), attack.effect ?? ''])}
        />
      )}
    </div>
  )
}
