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

    /// <summary>
    /// The Active Scene is visible to every Campaign Member in some form (a Player not present sees only its title), and the signal
    /// carries no data, so the whole Campaign hears it (specs/scene-play/spec.md, Live updates; ADR 0024).
    /// </summary>
    public static IReadOnlyList<LivePublication> ForActiveSceneChanged(Guid campaignId) =>
        [new LivePublication(LiveAudience.Campaign(campaignId), [CampaignDataTopic.ActiveScene])];

    /// <summary>The Keeper sees the status change; only the owning Player learns of their own Investigator's change.</summary>
    public static IReadOnlyList<LivePublication> ForInvestigatorChanged(Guid campaignId, Guid playerAccountId) =>
    [
        new LivePublication(LiveAudience.CampaignKeeper(campaignId), [CampaignDataTopic.Investigators]),
        new LivePublication(LiveAudience.Account(playerAccountId), [CampaignDataTopic.MyInvestigator]),
    ];

    /// <summary>
    /// A Reveal tells the Keeper (sceneReveals) and, one by one, the account of each distinct recipient Player (myClues). The Campaign is
    /// never told, so an untargeted Player hears nothing (specs/scene-play/spec.md, Live updates; PBI-SPL-002 D6).
    /// </summary>
    public static IReadOnlyList<LivePublication> ForRevealMade(Guid campaignId, IReadOnlyCollection<Guid> recipientAccountIds) =>
    [
        new LivePublication(LiveAudience.CampaignKeeper(campaignId), [CampaignDataTopic.SceneReveals]),
        .. recipientAccountIds.Distinct().Select(accountId => new LivePublication(LiveAudience.Account(accountId), [CampaignDataTopic.MyClues])),
    ];

    /// <summary>
    /// An Item holder change tells the Keeper (sceneReveals), the gaining account (myItems and myClues, because the give Reveal
    /// reached them), and, when someone else lost it, the losing account (myItems). The Campaign is never told (PBI-SPL-003 D5).
    /// </summary>
    public static IReadOnlyList<LivePublication> ForItemHolderChanged(Guid campaignId, Guid? gainerAccountId, Guid? loserAccountId)
    {
        var publications = new List<LivePublication>
        {
            new(LiveAudience.CampaignKeeper(campaignId), [CampaignDataTopic.SceneReveals]),
        };
        if (gainerAccountId is not null)
        {
            publications.Add(new LivePublication(LiveAudience.Account(gainerAccountId.Value), [CampaignDataTopic.MyItems, CampaignDataTopic.MyClues]));
        }
        if (loserAccountId is not null && loserAccountId != gainerAccountId)
        {
            publications.Add(new LivePublication(LiveAudience.Account(loserAccountId.Value), [CampaignDataTopic.MyItems]));
        }
        return publications;
    }

    /// <summary>Approval also changes what every member sees in the roster, so the Campaign hears "members".</summary>
    public static IReadOnlyList<LivePublication> ForInvestigatorApproved(Guid campaignId, Guid playerAccountId) =>
    [
        .. ForInvestigatorChanged(campaignId, playerAccountId),
        new LivePublication(LiveAudience.Campaign(campaignId), [CampaignDataTopic.Members]),
    ];
}
