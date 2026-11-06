import { UNNAMED_INVESTIGATOR } from '@/campaign-play/services/rosterRows'
import type { ItemHolder } from '@/scenario-preparation/types/Item'

/** The status line while no one holds an Item on Keeper reference (specs/scene-play/ux.md section 22.2). */
export const NO_HOLDER_STATUS = 'Held by no one'

/**
 * The "Held by {name}" status of an Item entry, or null while no one holds it (specs/scene-play/ux.md section 22.9).
 * The name is resolved by the caller from the Approved Investigators; a missing name is "Unnamed Investigator".
 */
export function holderStatusOf(holder: ItemHolder | null, holderName: string | null): string | null {
  return holder ? `Held by ${holderName ?? UNNAMED_INVESTIGATOR}` : null
}
