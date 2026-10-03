import type { CreationMethod } from '@/campaign-play/types/Campaign'

/**
 * The Creation Methods the creation wizard can build a Character Sheet with. PBI-CP-003 delivers Point Buy only;
 * PBI-CP-009 adds the others (specs/character-sheet/ux.md section 9).
 */
export const SUPPORTED_CREATION_METHODS: readonly CreationMethod[] = ['PointBuy']

export function supportedMethodsAllowedBy(allowed: readonly CreationMethod[]): CreationMethod[] {
  return SUPPORTED_CREATION_METHODS.filter((method) => allowed.includes(method))
}
