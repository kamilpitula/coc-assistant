namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>What a Reveal shows. Only a Handout or a Non-Player Entity link can be revealed today; an Item is refused until PBI-SPL-003.</summary>
public enum RevealSubjectType
{
    Handout,
    NonPlayerEntity,
    Item,
}

/// <summary>The material a Keeper asks to reveal: its type and its id on the Active Scene (a Handout id or a Non-Player Entity link id).</summary>
public sealed record RevealSubject(RevealSubjectType Type, Guid Id);

/// <summary>Whether a Reveal was made, and which rule refused it otherwise. A refused Reveal changes nothing.</summary>
public enum RevealOutcome
{
    Revealed,

    /// <summary>The Scene is not Active. Checked first.</summary>
    NotActive,

    SubjectNotRevealable,
    SubjectNotFound,
    SubjectKeeperFacing,
    NoRecipient,
    DuplicateRecipient,
    RecipientNotPresent,
}

/// <summary>The Reveal when <see cref="RevealOutcome.Revealed"/>, otherwise null.</summary>
public sealed record RevealResult(RevealOutcome Outcome, Reveal? Reveal);
