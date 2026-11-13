namespace CocAssistant.ScenarioPreparation.Domain.RollRequests;

/// <summary>Why a Roll Request was refused: the shape, the Investigators, the target, the dice, or the message.</summary>
public enum RollRequestCreationOutcome
{
    Created,
    EmptyInvestigators,
    DuplicateInvestigator,
    InvestigatorNotPresent,
    InvalidTarget,
    InvalidLuckTarget,
    InvalidDice,
    MessageTooLong,
}

/// <summary>The creation outcome, with the request only when it was created.</summary>
public sealed record RollRequestCreation(RollRequestCreationOutcome Outcome, RollRequest? Request);
