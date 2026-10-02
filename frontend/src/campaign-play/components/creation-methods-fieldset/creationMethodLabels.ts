import { CREATION_METHODS, type CreationMethod } from '@/campaign-play/types/Campaign'

/** Validation message from specs/character-sheet/ux.md section 2. */
export const NO_CREATION_METHOD_MESSAGE = 'Choose at least one creation method.'

/** Copy from specs/character-sheet/ux.md section 2. */
export const creationMethodLabels: Record<CreationMethod, { name: string; description: string }> = {
  StandardRolling: { name: 'Standard rolling', description: 'Players roll dice at the table' },
  PointBuy: { name: 'Point buy', description: 'Players spend a fixed pool of points' },
  QuickFire: { name: 'Quick fire', description: 'Players assign a fixed set of values' },
}

/** Orders the methods canonically, dropping duplicates. */
export function inCanonicalOrder(methods: readonly CreationMethod[]): CreationMethod[] {
  return CREATION_METHODS.filter((method) => methods.includes(method))
}

/** Summary text such as "Standard rolling, Point buy, Quick fire". */
export function formatCreationMethods(methods: readonly CreationMethod[]): string {
  return inCanonicalOrder(methods)
    .map((method) => creationMethodLabels[method].name)
    .join(', ')
}
