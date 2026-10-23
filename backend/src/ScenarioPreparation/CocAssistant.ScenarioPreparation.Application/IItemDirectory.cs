namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>One row of the Campaign's Item list: the name and the number of Scenes that link the Item.</summary>
public sealed record ItemSummary(Guid Id, string Name, int SceneCount);

/// <summary>Application read port for the Campaign's Item list, implemented by Infrastructure as a projection.</summary>
public interface IItemDirectory
{
    /// <summary>The Campaign's Items ordered by name, then id.</summary>
    Task<IReadOnlyList<ItemSummary>> ListForCampaignAsync(Guid campaignId, CancellationToken cancellationToken);
}
