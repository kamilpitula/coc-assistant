namespace CocAssistant.CampaignPlay.Application;

/// <summary>Who receives a live update; the transport maps each kind to its connection group (ADR 0009).</summary>
public enum LiveAudienceKind
{
    /// <summary>Every subscribed member of a Campaign.</summary>
    Campaign,

    /// <summary>The Keeper's subscribed connections of a Campaign.</summary>
    CampaignKeeper,

    /// <summary>Every connection of one Account.</summary>
    Account,
}

/// <summary>The audience of a live update: a kind and the Campaign or Account id it is scoped to.</summary>
public sealed record LiveAudience(LiveAudienceKind Kind, Guid Id)
{
    public static LiveAudience Campaign(Guid campaignId) => new(LiveAudienceKind.Campaign, campaignId);

    public static LiveAudience CampaignKeeper(Guid campaignId) => new(LiveAudienceKind.CampaignKeeper, campaignId);

    public static LiveAudience Account(Guid accountId) => new(LiveAudienceKind.Account, accountId);
}
