namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>Replaces a Campaign's allowed Creation Methods; at least one is required.</summary>
public record ChangeAllowedCreationMethodsRequest([Required, CreationMethodNames] string[] AllowedCreationMethods);
