namespace CocAssistant.ScenePlay.Application;

/// <summary>An Investigator present with its Approved record when there is one; the name is null when it is not Approved.</summary>
internal sealed record PresentInvestigator(Guid Id, Guid? PlayerAccountId, string? Name);

/// <summary>Resolves present ids to their Approved records, by name then id, so every view lists them in one order.</summary>
internal static class PresentInvestigators
{
    public static List<PresentInvestigator> Resolve(IReadOnlyList<Guid> presentIds, IReadOnlyList<ApprovedInvestigatorRef> approved) =>
        presentIds
            .Select(id => approved.FirstOrDefault(candidate => candidate.InvestigatorId == id) is { } match
                ? new PresentInvestigator(id, match.PlayerAccountId, match.Name)
                : new PresentInvestigator(id, null, null))
            .OrderBy(investigator => investigator.Name, StringComparer.OrdinalIgnoreCase)
            .ThenBy(investigator => investigator.Id)
            .ToList();
}
