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

    /// <summary>
    /// A Public entry change goes to the whole Campaign; any other visibility goes to the Keeper only, so an
    /// unknown visibility fails closed (specs/campaign-play/spec.md, Regression Guardrails).
    /// </summary>
    public static IReadOnlyList<LivePublication> ForWallEntryChanged(Guid campaignId, WallEntryVisibility visibility) =>
        visibility == WallEntryVisibility.Public
            ? [new LivePublication(LiveAudience.Campaign(campaignId), [CampaignDataTopic.WallEntries])]
            : [new LivePublication(LiveAudience.CampaignKeeper(campaignId), [CampaignDataTopic.WallEntries])];

    /// <summary>The Keeper sees the status change; only the owning Player learns of their own Investigator's change.</summary>
    public static IReadOnlyList<LivePublication> ForInvestigatorChanged(Guid campaignId, Guid playerAccountId) =>
    [
        new LivePublication(LiveAudience.CampaignKeeper(campaignId), [CampaignDataTopic.Investigators]),
        new LivePublication(LiveAudience.Account(playerAccountId), [CampaignDataTopic.MyInvestigator]),
    ];

    /// <summary>Approval also changes what every member sees in the roster, so the Campaign hears "members".</summary>
    public static IReadOnlyList<LivePublication> ForInvestigatorApproved(Guid campaignId, Guid playerAccountId) =>
    [
        .. ForInvestigatorChanged(campaignId, playerAccountId),
        new LivePublication(LiveAudience.Campaign(campaignId), [CampaignDataTopic.Members]),
    ];
}
