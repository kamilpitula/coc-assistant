const ownEntryIds = new Set<string>()

/**
 * Remembers an entry this tab added, so its arrival in the list is not announced as another member's
 * (specs/campaign-wall/ux.md section 4.5). Entry ids are unique, so one set serves every Campaign.
 */
export function rememberOwnWallEntry(entryId: string): void {
  ownEntryIds.add(entryId)
}

export function isOwnWallEntry(entryId: string): boolean {
  return ownEntryIds.has(entryId)
}
