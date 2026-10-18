import { StatTable } from '@/scenario-preparation/components/stat-table/stat-table'
import { MONSTER_CHARACTERISTIC_CODES, type MonsterCharacteristics } from '@/scenario-preparation/types/MythosCreature'
import { CHARACTERISTIC_NAMES } from '@/scenario-preparation/types/NonPlayerEntity'

type WorkedOutKind = 'hitPoints' | 'magicPoints' | 'damageBonus' | 'build'

/** What each worked-out value needs; copy for "(no computed value: needs ...)", from NPC ruleset section 3.2. */
const VALUES: { kind: WorkedOutKind; label: string; needs: string }[] = [
  { kind: 'hitPoints', label: 'Hit Points', needs: 'CON and SIZ' },
  { kind: 'magicPoints', label: 'Magic Points', needs: 'POW' },
  { kind: 'damageBonus', label: 'Damage Bonus', needs: 'STR and SIZ' },
  { kind: 'build', label: 'Build', needs: 'STR and SIZ' },
]

interface WorkedOutLine {
  label: string
  value: string
  /** A muted line under the value: the override's reason or the defeat outcome. */
  note: string | null
}

function overrideLine(
  entry: (typeof VALUES)[number],
  override: { value: number | string | null; reason: string | null },
  computed: number | string | null,
): WorkedOutLine {
  const shown = computed === null ? `(no computed value: needs ${entry.needs})` : `(computed ${computed})`
  return { label: entry.label, value: `${override.value} ${shown}`, note: override.reason ? `Reason: ${override.reason}` : null }
}

function lineOf(entry: (typeof VALUES)[number], characteristics: MonsterCharacteristics, defeatOutcome: string | null): WorkedOutLine | null {
  const computed = characteristics.derived[entry.kind]
  if (entry.kind === 'hitPoints' && characteristics.hitPointsNotApplicable) {
    return { label: entry.label, value: 'Not applicable', note: defeatOutcome ? `Defeat outcome: ${defeatOutcome}` : null }
  }
  const override = characteristics.overrides[entry.kind]
  if (override?.value != null) {
    return overrideLine(entry, override, computed)
  }
  return computed === null ? null : { label: entry.label, value: String(computed), note: null }
}

interface MonsterCharacteristicsViewProps {
  characteristics: MonsterCharacteristics
  /** Shown under Hit Points when they are not applicable. */
  defeatOutcome: string | null
}

/**
 * The Characteristics section of a Monster Profile in view mode: the entered characteristics with their Investigator
 * Difficulty, then the worked-out values with any Derived Value Override beside the computed value (specs/scenario-
 * preparation/ux.md section 25.5; SP-UX-36, SP-UX-46, SP-UX-48, SP-A11Y-25). No half or fifth values and no MOV.
 */
export function MonsterCharacteristicsView({ characteristics, defeatOutcome }: MonsterCharacteristicsViewProps) {
  const rows = MONSTER_CHARACTERISTIC_CODES.filter((code) => characteristics.values[code] != null).map((code) => [
    `${code} ${CHARACTERISTIC_NAMES[code]}`,
    String(characteristics.values[code]),
    characteristics.difficulty[code] ?? '',
  ])
  const lines = VALUES.map((entry) => lineOf(entry, characteristics, defeatOutcome)).filter((line): line is WorkedOutLine => line !== null)

  if (rows.length === 0 && lines.length === 0) {
    return <p className="text-sm text-muted-foreground">None recorded.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.length > 0 && <StatTable label="Characteristics" columns={['Characteristic', 'Value', 'Investigator difficulty']} rows={rows} />}
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Worked-out values</h3>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Worked-out values appear when the characteristics they need are entered.</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            {lines.map((line) => (
              <div key={line.label} className="contents">
                <dt className="font-medium">{line.label}</dt>
                <dd className="break-words">
                  {line.value}
                  {line.note && <span className="block text-muted-foreground">{line.note}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}
