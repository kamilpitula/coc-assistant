export interface SpellViewItem {
  name: string | null
  magicPointCost: string | null
  effect: string | null
  /** Shown only when present, as for a Mythos Creature's power. */
  limits?: string | null
}

interface SpellsViewProps {
  spells: SpellViewItem[]
}

/** The Spells section in view mode: each spell with its Magic Point cost, effect, and optional limits (specs/scenario-preparation/ux.md section 25.4). */
export function SpellsView({ spells }: SpellsViewProps) {
  if (spells.length === 0) {
    return <p className="text-sm text-muted-foreground">None recorded.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {spells.map((spell, index) => (
        <li key={`${spell.name}-${index}`} className="flex flex-col gap-0.5">
          <span className="font-medium break-words">{spell.name}</span>
          {spell.magicPointCost && <span className="text-sm text-muted-foreground">Magic Point cost {spell.magicPointCost}</span>}
          {spell.effect && <span className="text-sm break-words whitespace-pre-wrap">{spell.effect}</span>}
          {spell.limits && <span className="text-sm break-words whitespace-pre-wrap">Limits: {spell.limits}</span>}
        </li>
      ))}
    </ul>
  )
}
