/** The address a Player opens to join a Campaign through the Invite with this token. */
export function joinLink(token: string): string {
  return `${window.location.origin}/campaigns/join/${token}`
}
