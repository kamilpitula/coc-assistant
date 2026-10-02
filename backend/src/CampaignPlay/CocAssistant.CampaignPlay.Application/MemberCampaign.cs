namespace CocAssistant.CampaignPlay.Application;

/// <summary>A Campaign as read by one of its members, together with that member's role.</summary>
public sealed record MemberCampaign(Campaign Campaign, CampaignRole Role);
