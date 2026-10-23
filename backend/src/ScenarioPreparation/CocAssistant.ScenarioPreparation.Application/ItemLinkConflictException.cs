namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>Raised when saving an Item link lost a race: another request already linked the same Item to the Scene (PBI-SP-008 D4).</summary>
public class ItemLinkConflictException : Exception
{
    public ItemLinkConflictException(Exception innerException)
        : base("The Item was linked to the Scene concurrently.", innerException)
    {
    }
}
