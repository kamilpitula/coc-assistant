namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>How giving an Item ended; the refusals are the domain's, in its order, and NoActiveScene covers a Scene that is no longer Active.</summary>
public enum ItemGiveOutcome
{
    Given,
    ItemNotFound,
    NoActiveScene,
    NotLinked,
    RecipientNotPresent,
    AlreadyHolder,
    Conflict,
}

/// <summary>The give Reveal when <see cref="ItemGiveOutcome.Given"/>, and the former holder when the Item moved.</summary>
public sealed record ItemGiveResult(ItemGiveOutcome Outcome, RevealView? Reveal, Guid? FormerHolderId);

/// <summary>How taking an Item back ended.</summary>
public enum ItemTakeBackOutcome
{
    TakenBack,
    ItemNotFound,
    NotHeld,
    Conflict,
}

/// <summary>The former holder when <see cref="ItemTakeBackOutcome.TakenBack"/>, otherwise null.</summary>
public sealed record ItemTakeBackResult(ItemTakeBackOutcome Outcome, Guid? FormerHolderId);

/// <summary>An Item an Investigator holds with the give Reveal snapshot that set the holder.</summary>
public sealed record HeldItemView(Guid ItemId, Guid InvestigatorId, RevealView GiveReveal);
