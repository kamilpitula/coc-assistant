namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>How linking or editing a Scene link ended. NotFound covers every case the caller may not distinguish (ADR 0013).</summary>
public enum NonPlayerEntityLinkWriteOutcome
{
    Saved,
    NotFound,
    NonPlayerEntityNotInCampaign,
    InvalidPlayerFacingName,
    InvalidPlayerFacingDescription,
    Finished,
}

/// <summary>The link when <see cref="NonPlayerEntityLinkWriteOutcome.Saved"/>, otherwise null.</summary>
public sealed record NonPlayerEntityLinkWriteResult(NonPlayerEntityLinkWriteOutcome Outcome, NonPlayerEntityLinkView? Link);

/// <summary>How unlinking ended.</summary>
public enum NonPlayerEntityUnlinkOutcome
{
    Unlinked,
    NotFound,
    Finished,
}
