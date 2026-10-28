namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>Raised when saving lost a race on a Scene's version: the Scene was started, finished, re-staffed, or guarded by another request (ADR 0025).</summary>
public class SceneConcurrencyException : Exception
{
    public SceneConcurrencyException(Exception innerException)
        : base("The Scene changed concurrently.", innerException)
    {
    }
}
