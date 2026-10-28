import type { CampaignMember } from '@/campaign-play/types/CampaignMember'
import type { ApprovedInvestigator, KeeperActiveScene } from '@/scene-play/types/ActiveScene'

/** The Approved Investigators of the roster in roster order; only the Keeper's roster carries the ids. */
export function approvedInvestigatorsFrom(members: CampaignMember[] | null | undefined): ApprovedInvestigator[] {
  return (members ?? []).flatMap((member) => {
    const investigator = member.investigator
    return investigator?.visibility === 'Visible' && investigator.status === 'Approved' && investigator.id
      ? [{ id: investigator.id, name: investigator.name, playerName: member.displayName }]
      : []
  })
}

/**
 * Who is checked when the page opens: the Investigators present in the Active Scene when there is one, otherwise every Approved
 * Investigator (specs/scene-play/ux.md section 2).
 */
export function initialSelection(approved: ApprovedInvestigator[], activeScene: KeeperActiveScene | null): string[] {
  if (!activeScene) {
    return approved.map((investigator) => investigator.id)
  }

  const present = new Set(activeScene.investigatorsPresent.map((investigator) => investigator.id))
  return approved.filter((investigator) => present.has(investigator.id)).map((investigator) => investigator.id)
}

/** The selection with the id checked or unchecked. */
export function toggled(selection: string[], id: string, checked: boolean): string[] {
  const without = selection.filter((existing) => existing !== id)
  return checked ? [...without, id] : without
}
