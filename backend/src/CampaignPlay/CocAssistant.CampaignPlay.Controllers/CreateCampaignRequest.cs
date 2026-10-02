namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>Creates a Campaign; an omitted Player limit uses the Campaign default of eight.</summary>
public record CreateCampaignRequest(
    [Required] string Name,
    [Range(Campaign.MinPlayerLimit, Campaign.MaxPlayerLimit)] int? PlayerLimit = null);
