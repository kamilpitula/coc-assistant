namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Subscribing to and leaving a Campaign's Presence (specs/campaign-play/spec.md, Live connection contract;
/// Scenarios "Non-member cannot subscribe to a Campaign's Presence", "A member connecting is shown without reloading",
/// "A member leaving is shown without reloading", "A member with another open tab stays connected").
/// </summary>
public class CampaignPresenceServiceTests : IDisposable
{
    private readonly CampaignPlayScenario _scenario = new();
    private readonly InMemoryPresenceTracker _tracker = new();
    private readonly RecordingCampaignLiveUpdates _liveUpdates = new();

    private async Task<PresenceMembership?> FindMembershipAsync(Guid campaignId, Guid accountId)
    {
        using var context = _scenario.Fixture.CreateContext();
        return await Service(context).FindMembershipAsync(campaignId, accountId, CancellationToken.None);
    }

    private async Task<PresenceSnapshot> SubscribeAsync(Guid campaignId, Guid accountId, string connectionId)
    {
        var membership = await FindMembershipAsync(campaignId, accountId);
        using var context = _scenario.Fixture.CreateContext();
        return await Service(context).OpenAsync(membership!, connectionId, CancellationToken.None);
    }

    private async Task DisconnectAsync(string connectionId)
    {
        using var context = _scenario.Fixture.CreateContext();
        await Service(context).DisconnectAsync(connectionId, CancellationToken.None);
    }

    private CampaignPresenceService Service(CampaignPlayDbContext context) =>
        new(_scenario.Fixture.CreateRepository(context), _tracker, _liveUpdates);

    private async Task<(Guid CampaignId, Guid PlayerMemberId)> CreateCampaignWithPlayerAsync()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        var membership = await FindMembershipAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        return (campaignId, membership!.MemberId);
    }

    [Fact]
    public async Task Given_a_non_member_When_finding_its_membership_Then_there_is_none_and_nothing_is_recorded()
    {
        var campaignId = await _scenario.CreateCampaignAsync();

        Assert.Null(await FindMembershipAsync(campaignId, CampaignPlayScenario.StrangerAccountId));
        Assert.Empty(await _tracker.GetConnectedMembersAsync(campaignId, CancellationToken.None));
        Assert.Empty(_liveUpdates.Published);
    }

    [Fact]
    public async Task Given_no_campaign_When_finding_a_membership_Then_there_is_none()
    {
        Assert.Null(await FindMembershipAsync(Guid.NewGuid(), CampaignPlayScenario.KeeperAccountId));
    }

    [Fact]
    public async Task Given_the_keeper_When_finding_the_membership_Then_it_carries_the_keeper_role_and_memberId()
    {
        var campaignId = await _scenario.CreateCampaignAsync();

        var membership = await FindMembershipAsync(campaignId, CampaignPlayScenario.KeeperAccountId);

        Assert.Equal(campaignId, membership!.CampaignId);
        Assert.Equal(campaignId, membership.MemberId);
        Assert.Equal(CampaignRole.Keeper, membership.Role);
    }

    [Fact]
    public async Task Given_a_member_When_the_first_connection_subscribes_Then_connected_is_published_and_the_snapshot_includes_them()
    {
        var (campaignId, playerMemberId) = await CreateCampaignWithPlayerAsync();
        await SubscribeAsync(campaignId, CampaignPlayScenario.KeeperAccountId, "keeper-1");
        _liveUpdates.Published.Clear();

        var snapshot = await SubscribeAsync(campaignId, CampaignPlayScenario.PlayerAccountId, "player-1");

        Assert.Equal(campaignId, snapshot.CampaignId);
        Assert.Equal([campaignId, playerMemberId], snapshot.ConnectedMembers.OrderBy(id => id != campaignId));
        Assert.Equal(
            [
                new PublishedPresenceChanged(
                    LiveAudience.Campaign(campaignId),
                    campaignId,
                    new PresenceTransition(playerMemberId, MemberPresence.Connected)),
            ],
            _liveUpdates.Published);
    }

    [Fact]
    public async Task Given_a_connected_member_When_another_tab_subscribes_or_closes_Then_nothing_is_published()
    {
        var (campaignId, _) = await CreateCampaignWithPlayerAsync();
        await SubscribeAsync(campaignId, CampaignPlayScenario.PlayerAccountId, "player-1");
        _liveUpdates.Published.Clear();

        await SubscribeAsync(campaignId, CampaignPlayScenario.PlayerAccountId, "player-2");
        await DisconnectAsync("player-1");

        Assert.Empty(_liveUpdates.Published);
    }

    [Fact]
    public async Task Given_a_member_with_one_connection_When_it_disconnects_Then_not_connected_is_published_to_the_campaign()
    {
        var (campaignId, playerMemberId) = await CreateCampaignWithPlayerAsync();
        await SubscribeAsync(campaignId, CampaignPlayScenario.PlayerAccountId, "player-1");
        _liveUpdates.Published.Clear();

        await DisconnectAsync("player-1");

        Assert.Equal(
            [
                new PublishedPresenceChanged(
                    LiveAudience.Campaign(campaignId),
                    campaignId,
                    new PresenceTransition(playerMemberId, MemberPresence.NotConnected)),
            ],
            _liveUpdates.Published);
    }

    public void Dispose() => _scenario.Dispose();
}
