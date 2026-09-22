namespace CocAssistant.CampaignPlay.Domain;

/// <summary>A persistent story container owned by one Keeper, identified by their Account.</summary>
public class Campaign
{
    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public Guid KeeperAccountId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

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
    }

    /// <summary>True only for the Account that owns this Campaign as its Keeper.</summary>
    public bool IsKeeper(Guid accountId) => accountId != Guid.Empty && KeeperAccountId == accountId;
}
