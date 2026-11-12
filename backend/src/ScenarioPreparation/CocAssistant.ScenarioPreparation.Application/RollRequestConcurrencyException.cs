namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>Raised when saving lost a race on a Requested Roll's version: another roll of the same roll won (ADR 0032).</summary>
public class RollRequestConcurrencyException : Exception
{
    public RollRequestConcurrencyException(Exception innerException)
        : base("The Requested Roll changed concurrently.", innerException)
    {
    }
}
