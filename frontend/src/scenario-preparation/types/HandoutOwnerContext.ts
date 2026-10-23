/**
 * What a Handout screen needs to know about its owner (design record PBI-SP-008, D3): the words that name it, what the Keeper may
 * do to its Handouts now, and how to reload it. Built from a loaded Scene or Item, so the screens carry no Scene or Item rules.
 */
export interface HandoutOwnerContext {
  /** "Scene" or "Item", as in "Scene: The Corbitt House". */
  ownerLabel: string
  ownerName: string
  /** The label of the link back to the owner's page, for example "Back to the Scene". */
  backLabel: string
  /** Handouts can be added, edited, and reordered. */
  canChange: boolean
  /** Handouts can be deleted. */
  canDelete: boolean
  /** The one muted sentence that says why a Handout can not be changed or deleted; null when both are allowed. */
  lockedMessage: string | null
  /** What the delete dialog says when the server refuses the delete (409). */
  deleteRefusedMessage: string
  /** Reloads the owner, for example after a refusal. */
  refetchOwner: () => void
}
