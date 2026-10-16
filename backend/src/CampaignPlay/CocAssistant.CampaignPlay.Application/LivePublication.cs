namespace CocAssistant.CampaignPlay.Application;

/// <summary>One live update to publish: the topics that changed and the audience that may hear them.</summary>
public sealed record LivePublication(LiveAudience Audience, IReadOnlyList<CampaignDataTopic> Topics);
