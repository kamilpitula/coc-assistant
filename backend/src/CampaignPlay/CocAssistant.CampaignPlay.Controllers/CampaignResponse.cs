namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>The Keeper's view of a Campaign.</summary>
public record CampaignResponse(
    Guid Id,
    string Name,
    Guid KeeperAccountId,
    int PlayerLimit,
    string Era,
    IReadOnlyList<string> AllowedCreationMethods,
    string Role);

/// <summary>A Player's reduced view of a Campaign; it carries no Keeper-only data.</summary>
public record PlayerCampaignResponse(
    Guid Id,
    string Name,
    string Era,
    IReadOnlyList<string> AllowedCreationMethods,
    string Role);
