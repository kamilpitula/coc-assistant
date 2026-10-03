namespace CocAssistant.CampaignPlay.Domain.Presence;

/// <summary>
/// The open, subscribed connections of one Campaign's members. Pure and side-effect free: it turns connections opened
/// and closed into member transitions (specs/campaign-play/spec.md, Live connection contract, Presence tracking; ADR 0010).
/// Members are keyed by memberId, which maps one to one to an Account within a Campaign.
/// </summary>
public sealed class CampaignPresence
{
    private readonly Dictionary<string, Guid> _memberByConnection = new(StringComparer.Ordinal);

    /// <summary>The members with at least one open connection.</summary>
    public IReadOnlyCollection<Guid> ConnectedMembers => _memberByConnection.Values.Distinct().ToList();

    public bool IsEmpty => _memberByConnection.Count == 0;

    /// <summary>Records an open connection; returns Connected only for the member's first connection.</summary>
    public PresenceTransition? Open(string connectionId, Guid memberId)
    {
        var wasConnected = IsConnected(memberId);
        _memberByConnection[connectionId] = memberId;
        return wasConnected ? null : new PresenceTransition(memberId, MemberPresence.Connected);
    }

    /// <summary>Forgets a closed connection; returns NotConnected only when it was the member's last one.</summary>
    public PresenceTransition? Close(string connectionId)
    {
        if (!_memberByConnection.Remove(connectionId, out var memberId))
        {
            return null;
        }

        return IsConnected(memberId) ? null : new PresenceTransition(memberId, MemberPresence.NotConnected);
    }

    private bool IsConnected(Guid memberId) => _memberByConnection.ContainsValue(memberId);
}
