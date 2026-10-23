/** The Item a Scene link refers to, with its live name (Keeper-only). */
export interface ItemReference {
  id: string
  name: string
}

/**
 * A Scene's link to one Item. A link has no fields of its own: a Reveal of an Item names the Item, not a link
 * (specs/scenario-preparation/spec.md, Constraints; ADR 0022).
 */
export interface ItemLink {
  id: string
  item: ItemReference
}
