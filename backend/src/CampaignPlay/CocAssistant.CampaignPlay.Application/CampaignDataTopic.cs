namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// The closed set of invalidation topics carried by CampaignDataChanged (specs/campaign-play/spec.md, Live connection
/// contract). PBI-CP-006 adds WallEntries, Investigators, and MyInvestigator.
/// </summary>
public enum CampaignDataTopic
{
    Members,
}
