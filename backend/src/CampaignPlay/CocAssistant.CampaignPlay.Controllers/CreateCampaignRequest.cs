namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>
/// Creates a Campaign; an omitted Player limit uses the Campaign default of eight, and omitted rules options
/// use the 1920s Era and every Creation Method.
/// </summary>
public record CreateCampaignRequest(
    [Required] string Name,
    [Range(Campaign.MinPlayerLimit, Campaign.MaxPlayerLimit)] int? PlayerLimit = null,
    [SupportedEra] string? Era = null,
    [CreationMethodNames] string[]? AllowedCreationMethods = null);
