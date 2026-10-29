namespace CocAssistant.ScenePlay.Application;

/// <summary>
/// Projects a Reveal by who asks. The Player view drops the subject id and the recipients; the Keeper view adds them, with the
/// recipients' names from the Approved Investigators (PBI-SPL-002 D5).
/// </summary>
internal static class RevealProjection
{
    public static PlayerRevealView ForPlayer(SceneRevealRecord reveal) =>
        new(reveal.Id, reveal.RevealedAt, reveal.SubjectKind, reveal.Title, reveal.HandoutKind, reveal.Content, reveal.File, reveal.ImageDescription);

    public static KeeperRevealView ForKeeper(SceneRevealRecord reveal, IReadOnlyList<ApprovedInvestigatorRef> approved) =>
        new(
            ForPlayer(reveal),
            reveal.SubjectId,
            reveal.RecipientIds
                .Select(id => new RevealRecipientView(id, approved.FirstOrDefault(candidate => candidate.InvestigatorId == id)?.Name))
                .OrderBy(recipient => recipient.Name, StringComparer.OrdinalIgnoreCase)
                .ThenBy(recipient => recipient.Id)
                .ToList());

    public static ClueView ForClue(ClueRecord clue) => new(ForPlayer(clue.Reveal), clue.SceneId, clue.SceneTitle);
}
