namespace CocAssistant.CampaignPlay.Domain.Wall;

/// <summary>
/// What a Wall Entry records (specs/campaign-play/spec.md, Wall Entry kinds). A RollRequest entry carries a play record's
/// id and its card is composed by the client reading that record (ADR 0033); it has no text and can never be removed.
/// </summary>
public enum WallEntryKind
{
    Text,
    RollRequest,
}
