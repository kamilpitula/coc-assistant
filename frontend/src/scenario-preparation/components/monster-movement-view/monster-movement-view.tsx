import type { MonsterMovementMode } from '@/scenario-preparation/types/MythosCreature'

interface MonsterMovementViewProps {
  movement: MonsterMovementMode[]
}

const modeLabel = (mode: MonsterMovementMode): string => (mode.mode === 'Other' ? `Other (${mode.label ?? ''})` : mode.mode)

/**
 * The Movement section in view mode: each mode as entered, never computed (specs/scenario-preparation/ux.md section 25.5;
 * SP-UX-48). No modes means no ordinary movement.
 */
export function MonsterMovementView({ movement }: MonsterMovementViewProps) {
  if (movement.length === 0) {
    return <p className="text-sm text-muted-foreground">No ordinary movement.</p>
  }

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {movement.map((mode, index) => (
        <div key={`${modeLabel(mode)}-${index}`} className="contents">
          <dt className="font-medium break-words">{modeLabel(mode)}</dt>
          <dd>{mode.rate}</dd>
        </div>
      ))}
    </dl>
  )
}
