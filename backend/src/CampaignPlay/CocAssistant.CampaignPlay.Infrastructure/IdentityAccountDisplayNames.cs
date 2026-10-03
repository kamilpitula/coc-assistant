namespace CocAssistant.CampaignPlay.Infrastructure;

/// <summary>Adapts Identity's display-name query to Campaign Play's <see cref="IAccountDisplayNames"/> port (ADR 0008).</summary>
public sealed class IdentityAccountDisplayNames : IAccountDisplayNames
{
    private readonly AccountDisplayNameQuery _query;

    public IdentityAccountDisplayNames(AccountDisplayNameQuery query)
    {
        _query = query;
    }

    public Task<IReadOnlyDictionary<Guid, string>> GetDisplayNamesAsync(
        IReadOnlyCollection<Guid> accountIds,
        CancellationToken cancellationToken) =>
        _query.GetDisplayNamesAsync(accountIds, cancellationToken);
}
