namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>
/// The authenticated Campaign hub (specs/campaign-play/spec.md, Live connection contract; ADR 0009). It handles
/// transport concerns only: the Account and Campaign groups. Membership and Presence are decided by
/// <see cref="CampaignPresenceService"/>.
/// </summary>
[Authorize]
public sealed class CampaignHub : Hub<ICampaignClient>
{
    public const string Path = "/hubs/campaign";

    private const string AccountIdKey = "CampaignHub.AccountId";

    private readonly CallerAccountResolver _callerAccountResolver;
    private readonly CampaignPresenceService _presenceService;

    public CampaignHub(CallerAccountResolver callerAccountResolver, CampaignPresenceService presenceService)
    {
        _callerAccountResolver = callerAccountResolver;
        _presenceService = presenceService;
    }

    /// <summary>Resolves the caller's Account once, because IUserIdProvider is synchronous (ADR 0009).</summary>
    public override async Task OnConnectedAsync()
    {
        var accountId = await _callerAccountResolver.ResolveAsync(Context.User!, Context.ConnectionAborted);
        if (accountId is null)
        {
            Context.Abort();
            return;
        }

        Context.Items[AccountIdKey] = accountId.Value;
        await Groups.AddToGroupAsync(Context.ConnectionId, CampaignHubGroups.Account(accountId.Value), Context.ConnectionAborted);
    }

    /// <summary>
    /// Subscribes a Campaign Member's connection and returns the Presence snapshot. Groups are joined before the
    /// connection is recorded, so no change between the snapshot and the subscription is missed.
    /// </summary>
    public async Task<PresenceSnapshotMessage> SubscribeToCampaign(Guid campaignId)
    {
        var cancellationToken = Context.ConnectionAborted;
        var membership = Context.Items.TryGetValue(AccountIdKey, out var accountId)
            ? await _presenceService.FindMembershipAsync(campaignId, (Guid)accountId!, cancellationToken)
            : null;
        if (membership is null)
        {
            throw new HubException("Campaign not found.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, CampaignHubGroups.Campaign(campaignId), cancellationToken);
        if (membership.Role == CampaignRole.Keeper)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, CampaignHubGroups.CampaignKeeper(campaignId), cancellationToken);
        }

        var snapshot = await _presenceService.OpenAsync(membership, Context.ConnectionId, cancellationToken);
        return new PresenceSnapshotMessage(
            snapshot.CampaignId,
            snapshot.ConnectedMembers
                .Select(memberId => new MemberPresenceMessage(memberId.ToString(), nameof(MemberPresence.Connected)))
                .ToList());
    }

    public override Task OnDisconnectedAsync(Exception? exception) =>
        _presenceService.DisconnectAsync(Context.ConnectionId, CancellationToken.None);
}
