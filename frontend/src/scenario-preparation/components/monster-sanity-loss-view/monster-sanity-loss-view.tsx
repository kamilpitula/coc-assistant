import type { MonsterSanityLoss } from '@/scenario-preparation/types/MythosCreature'

interface MonsterSanityLossViewProps {
  sanityLoss: MonsterSanityLoss
}

/** The Sanity loss section in view mode (specs/scenario-preparation/ux.md section 25.5); no Sanity loss means no Sanity roll. */
export function MonsterSanityLossView({ sanityLoss }: MonsterSanityLossViewProps) {
  if (!sanityLoss.value) {
    return <p className="text-sm text-muted-foreground">No Sanity roll.</p>
  }

  return <p className="text-sm break-words">Sanity loss {sanityLoss.value}</p>
}
