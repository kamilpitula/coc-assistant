namespace CocAssistant.CampaignPlay.Domain;

/// <summary>A persistent story container owned by one Keeper, identified by their Account.</summary>
public class Campaign
{
    /// <summary>The default number of Players a Campaign admits before the limit is reached.</summary>
    public const int DefaultPlayerLimit = 8;

    private readonly List<CampaignInvite> _invites = [];
    private readonly List<CampaignPlayer> _players = [];

    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public Guid KeeperAccountId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public int PlayerLimit { get; private set; }

    /// <summary>Incremented on every membership change so concurrent joins cannot exceed the Player limit.</summary>
    public int MembershipVersion { get; private set; }

    private Campaign()
    {
        Name = string.Empty;
    }

    public Campaign(string name, Guid keeperAccountId, DateTimeOffset createdAt)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Campaign name is required.", nameof(name));
        }

        if (keeperAccountId == Guid.Empty)
        {
            throw new ArgumentException("Keeper account is required.", nameof(keeperAccountId));
        }

        Id = Guid.NewGuid();
        Name = name.Trim();
        KeeperAccountId = keeperAccountId;
        CreatedAt = createdAt;
        PlayerLimit = DefaultPlayerLimit;
    }

    public IReadOnlyCollection<CampaignInvite> Invites => _invites;

    public IReadOnlyCollection<CampaignPlayer> Players => _players;

    /// <summary>The single Invite that can currently admit Players, or null when none is active.</summary>
    public CampaignInvite? ActiveInvite => _invites.SingleOrDefault(invite => invite.IsActive);

    public int PlayerCount => _players.Count;

    /// <summary>True only for the Account that owns this Campaign as its Keeper.</summary>
    public bool IsKeeper(Guid accountId) => accountId != Guid.Empty && KeeperAccountId == accountId;

    /// <summary>Issues a fresh active Invite, replacing any Invite that was previously active.</summary>
    public CampaignInvite IssueInvite(string token, DateTimeOffset now)
    {
        ActiveInvite?.Replace();
        var invite = new CampaignInvite(Id, token, now);
        _invites.Add(invite);
        return invite;
    }

    /// <summary>Revokes the active Invite; returns false when there is nothing to revoke.</summary>
    public bool RevokeActiveInvite()
    {
        var active = ActiveInvite;
        if (active is null)
        {
            return false;
        }

        active.Revoke();
        return true;
    }

    /// <summary>Admits an Account as a Player when the Invite token is active and the limit allows it.</summary>
    public JoinCampaignOutcome Join(Guid accountId, string token, DateTimeOffset now)
    {
        if (accountId == KeeperAccountId)
        {
            return JoinCampaignOutcome.KeeperCannotJoin;
        }

        var invite = _invites.SingleOrDefault(candidate => candidate.Token == token);
        if (invite is null || !invite.IsActive)
        {
            return JoinCampaignOutcome.InvalidInvite;
        }

        if (_players.Any(player => player.AccountId == accountId))
        {
            return JoinCampaignOutcome.AlreadyMember;
        }

        if (_players.Count >= PlayerLimit)
        {
            return JoinCampaignOutcome.LimitReached;
        }

        _players.Add(new CampaignPlayer(Id, accountId, invite.Id, now));
        MembershipVersion++;
        return JoinCampaignOutcome.Joined;
    }
}
