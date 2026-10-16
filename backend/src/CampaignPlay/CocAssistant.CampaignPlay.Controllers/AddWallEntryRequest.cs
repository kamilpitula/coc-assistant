namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>Adds a Wall Entry; the visibility defaults to Public, and a Player may only choose Public.</summary>
public record AddWallEntryRequest([Required] string Text, string? Visibility);
