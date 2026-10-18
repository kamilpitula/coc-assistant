import { StatTable } from '@/scenario-preparation/components/stat-table/stat-table'
import {
  CHARACTERISTIC_CODES,
  type DerivedValues,
  type HumanNpcCharacteristics,
} from '@/scenario-preparation/types/HumanNpc'
import { CHARACTERISTIC_NAMES } from '@/scenario-preparation/types/NonPlayerEntity'

const MOVEMENT_NOT_COVERED = 'Not covered by the rules for this age'

/** The worked-out values the server could compute, as label and text pairs; MOV outside the covered ages reads as text. */
function workedOutValues(derived: DerivedValues): [string, string][] {
  const entries: [string, number | string | null][] = [
    ['Hit Points', derived.hitPoints],
    ['Magic Points', derived.magicPoints],
    ['Damage Bonus', derived.damageBonus],
    ['Build', derived.build],
    ['MOV', derived.movementRateNotCovered ? MOVEMENT_NOT_COVERED : derived.movementRate],
  ]
  return entries.filter((entry): entry is [string, number | string] => entry[1] !== null).map(([label, value]) => [label, String(value)])
}

interface NpcCharacteristicsViewProps {
  characteristics: HumanNpcCharacteristics
}

/**
 * The Characteristics section in view mode: the entered characteristics with their Investigator Difficulty, then the
 * worked-out values (specs/scenario-preparation/ux.md section 25.4; SP-UX-36, SP-UX-42). No half or fifth values.
 */
export function NpcCharacteristicsView({ characteristics }: NpcCharacteristicsViewProps) {
  const rows = CHARACTERISTIC_CODES.filter((code) => characteristics.values[code] != null).map((code) => [
    `${code} ${CHARACTERISTIC_NAMES[code]}`,
    String(characteristics.values[code]),
    characteristics.difficulty[code] ?? '',
  ])
  const derived = workedOutValues(characteristics.derived)

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">None recorded.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <StatTable label="Characteristics" columns={['Characteristic', 'Value', 'Investigator difficulty']} rows={rows} />
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Worked-out values</h3>
        {derived.length === 0 ? (
          <p className="text-sm text-muted-foreground">Worked-out values appear when the characteristics they need are entered.</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            {derived.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="font-medium">{label}</dt>
                <dd className="break-words">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}
