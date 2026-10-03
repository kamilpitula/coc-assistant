namespace CocAssistant.Identity.Application;

/// <summary>Reads Account display names for other functionalities, which consume it through their own ports (ADR 0008).</summary>
public class AccountDisplayNameQuery
{
    private readonly IAccountRepository _accounts;

    public AccountDisplayNameQuery(IAccountRepository accounts)
    {
        _accounts = accounts;
    }

    /// <summary>Returns the display name of each known Account; unknown ids are omitted.</summary>
    public async Task<IReadOnlyDictionary<Guid, string>> GetDisplayNamesAsync(
        IReadOnlyCollection<Guid> accountIds,
        CancellationToken cancellationToken)
    {
        var accounts = await _accounts.FindByIdsAsync(accountIds, cancellationToken);
        return accounts.ToDictionary(account => account.Id, account => account.DisplayName);
    }
}
