namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>How linking an Item ended. NotFound covers every case the caller may not distinguish (ADR 0013).</summary>
public enum ItemLinkWriteOutcome
{
    Linked,
    AlreadyLinked,
    NotFound,
    ItemNotInCampaign,
    Finished,
}

/// <summary>The link when <see cref="ItemLinkWriteOutcome.Linked"/> or <see cref="ItemLinkWriteOutcome.AlreadyLinked"/>, otherwise null.</summary>
public sealed record ItemLinkWriteResult(ItemLinkWriteOutcome Outcome, ItemLinkView? Link);

/// <summary>How unlinking an Item ended.</summary>
public enum ItemUnlinkOutcome
{
    Unlinked,
    NotFound,
    Finished,
}
