import { UNNAMED_INVESTIGATOR } from '@/campaign-play/services/rosterRows'
import { supportedMethodsAllowedBy } from '@/campaign-play/services/supportedCreationMethods'
import type { PlayerCampaign } from '@/campaign-play/types/Campaign'
import type { CampaignMember } from '@/campaign-play/types/CampaignMember'
import type { InvestigatorSummary } from '@/campaign-play/types/Investigator'

/** A Keeper's attention item (specs/campaign-overview/ux.md section 4.1). */
export type KeeperAttentionItem =
  | { kind: 'review'; investigatorId: string; investigatorName: string; playerName: string }
  | { kind: 'invitePlayers' }
  | { kind: 'createScenario' }

/** The Player's single attention item about their own Investigator (ux.md section 4.2). */
export type PlayerAttentionItem =
  | { kind: 'create' }
  | { kind: 'creationUnavailable' }
  | { kind: 'continue'; investigatorName: string | null }
  | { kind: 'changesRequested'; investigatorName: string | null; comment: string | null }

/**
 * The Keeper's items: one per Submitted Investigator in roster order (decision D2), then "Invite Players" when nobody
 * has joined, then "Create Scenario" when the Campaign has no Scenario (specs/scenario-preparation/ux.md section 3).
 */
export function keeperAttentionItems(members: readonly CampaignMember[], scenarioCount: number): KeeperAttentionItem[] {
  const reviews = members.flatMap((member): KeeperAttentionItem[] => {
    const investigator = member.investigator
    if (investigator?.visibility !== 'Visible' || investigator.status !== 'Submitted' || investigator.id === undefined) {
      return []
    }

    return [
      {
        kind: 'review',
        investigatorId: investigator.id,
        investigatorName: investigator.name ?? UNNAMED_INVESTIGATOR,
        playerName: member.displayName,
      },
    ]
  })
  const hasPlayers = members.some((member) => member.role === 'Player')
  const invite: KeeperAttentionItem[] = hasPlayers ? [] : [{ kind: 'invitePlayers' }]
  const createScenario: KeeperAttentionItem[] = scenarioCount === 0 ? [{ kind: 'createScenario' }] : []
  return [...reviews, ...invite, ...createScenario]
}

/** The Player's item, or null once their Investigator is Submitted or Approved. */
export function playerAttentionItem(campaign: PlayerCampaign, investigator: InvestigatorSummary | null): PlayerAttentionItem | null {
  if (investigator === null) {
    return supportedMethodsAllowedBy(campaign.allowedCreationMethods).length === 0
      ? { kind: 'creationUnavailable' }
      : { kind: 'create' }
  }

  if (investigator.status === 'Draft') {
    return { kind: 'continue', investigatorName: investigator.name }
  }

  if (investigator.status === 'ChangesRequested') {
    return { kind: 'changesRequested', investigatorName: investigator.name, comment: investigator.changeRequestComment }
  }

  return null
}
