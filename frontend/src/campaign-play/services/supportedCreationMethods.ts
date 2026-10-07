import type { CreationMethod } from '@/campaign-play/types/Campaign'

/**
 * The Creation Methods the creation wizard can build a Character Sheet with: every method since PBI-CP-009
 * (specs/character-sheet/ux.md section 9). The "not available yet" state of UX-19 stays for a future method.
 */
export const SUPPORTED_CREATION_METHODS: readonly CreationMethod[] = ['StandardRolling', 'PointBuy', 'QuickFire']

export function supportedMethodsAllowedBy(allowed: readonly CreationMethod[]): CreationMethod[] {
  return SUPPORTED_CREATION_METHODS.filter((method) => allowed.includes(method))
}
