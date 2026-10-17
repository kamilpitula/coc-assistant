namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>Where a Scene is in play (CONTEXT.md): it moves only Prepared, then Active, then Finished.</summary>
public enum SceneStatus
{
    Prepared,
    Active,
    Finished,
}
