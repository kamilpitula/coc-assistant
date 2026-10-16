namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// The closed set of invalidation topics carried by CampaignDataChanged (specs/campaign-play/spec.md, Live connection
/// contract). Wire names are the camelCased member names.
/// </summary>
public enum CampaignDataTopic
{
    Members,
    WallEntries,
    Investigators,
    MyInvestigator,
}
