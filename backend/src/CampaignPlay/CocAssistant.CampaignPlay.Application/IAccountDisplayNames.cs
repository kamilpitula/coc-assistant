namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Application port for the display names of Accounts, owned by Campaign Play and implemented by Infrastructure
/// on top of Identity (ADR 0008). Campaign Play never stores a copy of a name.
/// </summary>
public interface IAccountDisplayNames
{
    /// <summary>Returns the display name of each known Account; unknown ids are omitted.</summary>
    Task<IReadOnlyDictionary<Guid, string>> GetDisplayNamesAsync(
        IReadOnlyCollection<Guid> accountIds,
        CancellationToken cancellationToken);
}
