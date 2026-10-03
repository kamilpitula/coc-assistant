namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Decides the audience of every live update (specs/campaign-play/spec.md, Live connection contract, Audience;
/// ADR 0009). A topic sent to an audience must be one every member of that audience may know changed, so a
/// Keeper-only change never goes to the whole Campaign.
/// </summary>
public static class CampaignLivePublicationPolicy
{
    /// <summary>Presence is visible to every Campaign Member.</summary>
    public static LiveAudience ForPresenceChanged(Guid campaignId) => LiveAudience.Campaign(campaignId);

    /// <summary>The roster is visible to every Campaign Member.</summary>
    public static LiveAudience ForMembersChanged(Guid campaignId) => LiveAudience.Campaign(campaignId);
}
