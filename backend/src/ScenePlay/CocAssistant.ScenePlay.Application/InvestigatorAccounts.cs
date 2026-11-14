namespace CocAssistant.ScenePlay.Application;

/// <summary>The Players' Accounts behind a set of Investigators: the owners a roll-request signal must reach.</summary>
internal static class InvestigatorAccounts
{
    internal static IReadOnlyCollection<Guid> PlayerAccountsOf(
        IReadOnlyList<ApprovedInvestigatorRef> approved,
        IEnumerable<Guid> investigatorIds)
    {
        var wanted = new HashSet<Guid>(investigatorIds);
        return approved
            .Where(investigator => wanted.Contains(investigator.InvestigatorId))
            .Select(investigator => investigator.PlayerAccountId)
            .Distinct()
            .ToList();
    }
}
