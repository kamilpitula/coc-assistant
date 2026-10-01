namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>The Campaign Invite a Keeper manages, exposing its shareable token and lifecycle status.</summary>
public record InviteResponse(Guid CampaignId, string Token, string Status);
