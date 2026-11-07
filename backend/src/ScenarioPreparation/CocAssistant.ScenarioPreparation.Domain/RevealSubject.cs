namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>What a Reveal shows: a Handout (of the Scene or of a linked Item), a Non-Player Entity link, or a linked Item.</summary>
public enum RevealSubjectType
{
    Handout,
    NonPlayerEntity,
    Item,
}

/// <summary>The material a Keeper asks to reveal: its type and its id on the Active Scene (a Handout id, a Non-Player Entity link id, or an Item id).</summary>
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
public sealed record RevealResult(RevealOutcome Outcome, Reveal? Reveal, Item? OwningItem = null);

/// <summary>How giving an Item ended: the checks run in this order, and a refused give changes nothing.</summary>
public enum GiveItemOutcome
{
    Given,

    /// <summary>The Scene is not Active. Checked first.</summary>
    NotActive,

    /// <summary>The Item is not linked to the Active Scene.</summary>
    SubjectNotFound,

    /// <summary>The Investigator is not present on the Active Scene.</summary>
    RecipientNotPresent,

    /// <summary>The Investigator already holds the Item.</summary>
    AlreadyHolder,
}

/// <summary>The give Reveal when <see cref="GiveItemOutcome.Given"/>, with the former holder, if the Item moved.</summary>
public sealed record GiveItemResult(GiveItemOutcome Outcome, Reveal? Reveal, Guid? FormerHolderId);
