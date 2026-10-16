namespace CocAssistant.CampaignPlay.Domain.Wall;

/// <summary>The result of an Account attempting to author a Wall Entry in a Campaign.</summary>
public enum WallEntryAuthoringOutcome
{
    Created,
    NotAMember,
    PlayersCanOnlyAuthorPublic,
    InvalidText,
}

/// <summary>The outcome of authoring, with the entry only when it was created.</summary>
public sealed record WallEntryAuthoring(WallEntryAuthoringOutcome Outcome, WallEntry? Entry);
