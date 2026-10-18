import type { MonsterDefenseEntry, MonsterDefenses } from '@/scenario-preparation/types/MythosCreature'

function EntryList({ title, entries }: { title: string; entries: MonsterDefenseEntry[] }) {
  if (entries.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-medium">{title}</h3>
      <ul className="list-disc pl-5 text-sm">
        {entries.map((entry, index) => (
          <li key={`${entry.description}-${index}`} className="break-words whitespace-pre-wrap">
            {entry.description}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface MonsterDefensesViewProps {
  defenses: MonsterDefenses
}

/**
 * The Defenses section in view mode: armor points and note, then the immunities and vulnerabilities that were entered
 * (specs/scenario-preparation/ux.md section 25.5).
 */
export function MonsterDefensesView({ defenses }: MonsterDefensesViewProps) {
  const lines: [string, string][] = [
    ['Armor points', defenses.armorPoints === null ? '' : String(defenses.armorPoints)],
    ['Armor note', defenses.armorNote ?? ''],
  ]
  const shown = lines.filter(([, value]) => value !== '')
  if (shown.length === 0 && defenses.immunities.length === 0 && defenses.vulnerabilities.length === 0) {
    return <p className="text-sm text-muted-foreground">None recorded.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {shown.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {shown.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="font-medium">{label}</dt>
              <dd className="break-words whitespace-pre-wrap">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <EntryList title="Immunities" entries={defenses.immunities} />
      <EntryList title="Vulnerabilities" entries={defenses.vulnerabilities} />
    </div>
  )
}
