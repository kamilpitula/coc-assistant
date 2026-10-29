namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>Raised when saving a Scene lost the one-Active-Scene race: another Scene of the Campaign became Active first (ADR 0025).</summary>
public class ActiveSceneConflictException : Exception
{
    public ActiveSceneConflictException(Exception innerException)
        : base("Another Scene of the Campaign became Active concurrently.", innerException)
    {
    }
}
