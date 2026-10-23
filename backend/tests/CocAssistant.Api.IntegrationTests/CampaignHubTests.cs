namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Campaign hub at /hubs/campaign through the assembled Api (specs/campaign-play/spec.md, Live connection contract;
/// ADR 0009). Traces to the Presence scenarios "Unauthenticated connection is rejected", "Non-member cannot subscribe to
/// a Campaign's Presence", "A member connecting is shown without reloading", "A member leaving is shown without
/// reloading", "A member with another open tab stays connected", "Presence stays within its Campaign", and "A Player who
/// joins appears to connected members", and to PBI-CP-005 Verification (members signal, token expiry).
/// Negative checks use a later, expected message as an ordering barrier instead of waiting for time to pass.
/// </summary>
public class CampaignHubTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;
    private readonly List<CampaignHubTestClient> _clients = [];

    public CampaignHubTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public async Task DisposeAsync()
    {
        foreach (var client in _clients)
        {
            await client.DisposeAsync();
        }
    }

    private async Task<(CampaignHubTestClient Client, PresenceSnapshotMessage Snapshot)> SubscribeAsync(string oid, Guid campaignId)
    {
        var subscription = await CampaignHubTestClient.SubscribeAsync(_factory, oid, campaignId);
        _clients.Add(subscription.Client);
        return subscription;
    }

    /// <summary>
    /// Subscribes a member who observes the Campaign. Groups are joined before the connection is recorded, so the
    /// observer's first message is its own Connected; it is consumed here so later messages are the ones under test.
    /// </summary>
    private async Task<CampaignHubTestClient> SubscribeObserverAsync(string oid, Guid campaignId, string memberId)
    {
        var (client, _) = await SubscribeAsync(oid, campaignId);
        Assert.Equal(Presence(campaignId, memberId, "Connected"), await client.NextMessageAsync());
        return client;
    }

    private async Task<string> MemberIdOfAsync(HttpClient client, Guid campaignId, string oid)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/members", oid));
        response.EnsureSuccessStatusCode();
        var members = await response.Content.ReadFromJsonAsync<List<CampaignMemberResponse>>();
        return members!.Single(member => member.IsYou).MemberId;
    }

    private async Task<(Guid CampaignId, string PlayerMemberId)> CreateCampaignWithPlayerAsync(
        HttpClient client,
        string keeperOid,
        string playerOid)
    {
        var campaignId = (await CreateCampaignAsync(client, keeperOid)).Id;
        await JoinAsPlayerAsync(client, campaignId, keeperOid, playerOid);
        return (campaignId, await MemberIdOfAsync(client, campaignId, playerOid));
    }

    private static PresenceChangedMessage Presence(Guid campaignId, string memberId, string presence) =>
        new(campaignId, memberId, presence);

    [Fact]
    public async Task Given_no_valid_token_When_connecting_to_the_campaign_hub_Then_the_connection_is_rejected()
    {
        await using var client = CampaignHubTestClient.CreateUnauthenticated(_factory);

        var exception = await Assert.ThrowsAsync<HttpRequestException>(() => client.Connection.StartAsync());

        Assert.Equal(HttpStatusCode.Unauthorized, exception.StatusCode);
    }

    [Fact]
    public async Task Given_a_member_When_subscribing_Then_the_snapshot_shows_them_connected()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "hub-keeper-1")).Id;

        var (_, snapshot) = await SubscribeAsync("hub-keeper-1", campaignId);

        Assert.Equal(campaignId, snapshot.CampaignId);
        Assert.Equal([new MemberPresenceMessage(campaignId.ToString(), "Connected")], snapshot.Members);
    }

    [Fact]
    public async Task Given_a_non_member_When_subscribing_Then_it_is_refused_and_no_member_sees_them()
    {
        var client = _factory.CreateClient();
        var (campaignId, playerMemberId) = await CreateCampaignWithPlayerAsync(client, "hub-keeper-2", "hub-player-2");
        var keeper = await SubscribeObserverAsync("hub-keeper-2", campaignId, campaignId.ToString());
        await using var stranger = CampaignHubTestClient.Create(_factory, "hub-stranger-2");
        await stranger.Connection.StartAsync();

        var exception = await Assert.ThrowsAsync<HubException>(() => stranger.SubscribeToCampaignAsync(campaignId));

        Assert.Contains("Campaign not found.", exception.Message);
        await SubscribeAsync("hub-player-2", campaignId);
        Assert.Equal(Presence(campaignId, playerMemberId, "Connected"), await keeper.NextMessageAsync());
    }

    [Fact]
    public async Task Given_an_unknown_campaign_When_subscribing_Then_it_is_refused()
    {
        await using var client = CampaignHubTestClient.Create(_factory, "hub-keeper-3");
        await client.Connection.StartAsync();

        var exception = await Assert.ThrowsAsync<HubException>(() => client.SubscribeToCampaignAsync(Guid.NewGuid()));

        Assert.Contains("Campaign not found.", exception.Message);
    }

    [Fact]
    public async Task Given_the_keeper_is_subscribed_When_a_player_connects_and_leaves_Then_the_keeper_sees_connected_then_not_connected()
    {
        var client = _factory.CreateClient();
        var (campaignId, playerMemberId) = await CreateCampaignWithPlayerAsync(client, "hub-keeper-4", "hub-player-4");
        var keeper = await SubscribeObserverAsync("hub-keeper-4", campaignId, campaignId.ToString());

        var (player, snapshot) = await SubscribeAsync("hub-player-4", campaignId);
        Assert.Equal(2, snapshot.Members.Count);
        Assert.Equal(Presence(campaignId, playerMemberId, "Connected"), await keeper.NextMessageAsync());

        await player.Connection.StopAsync();
        Assert.Equal(Presence(campaignId, playerMemberId, "NotConnected"), await keeper.NextMessageAsync());
    }

    [Fact]
    public async Task Given_a_player_with_two_connections_When_one_closes_Then_the_keeper_sees_no_change()
    {
        var client = _factory.CreateClient();
        var (campaignId, playerMemberId) = await CreateCampaignWithPlayerAsync(client, "hub-keeper-5", "hub-player-5");
        await JoinAsPlayerAsync(client, campaignId, "hub-keeper-5", "hub-other-player-5");
        var otherPlayerMemberId = await MemberIdOfAsync(client, campaignId, "hub-other-player-5");
        var keeper = await SubscribeObserverAsync("hub-keeper-5", campaignId, campaignId.ToString());
        var (firstTab, _) = await SubscribeAsync("hub-player-5", campaignId);
        await SubscribeAsync("hub-player-5", campaignId);
        Assert.Equal(Presence(campaignId, playerMemberId, "Connected"), await keeper.NextMessageAsync());

        await firstTab.Connection.StopAsync();
        await SubscribeAsync("hub-other-player-5", campaignId);

        Assert.Equal(Presence(campaignId, otherPlayerMemberId, "Connected"), await keeper.NextMessageAsync());
    }

    [Fact]
    public async Task Given_a_member_of_campaign_a_only_When_a_member_of_campaign_b_connects_Then_they_receive_nothing_for_b()
    {
        var client = _factory.CreateClient();
        var (campaignA, playerAMemberId) = await CreateCampaignWithPlayerAsync(client, "hub-keeper-6a", "hub-player-6a");
        var campaignB = (await CreateCampaignAsync(client, "hub-keeper-6b")).Id;
        var keeperA = await SubscribeObserverAsync("hub-keeper-6a", campaignA, campaignA.ToString());

        await SubscribeAsync("hub-keeper-6b", campaignB);
        await SubscribeAsync("hub-player-6a", campaignA);

        Assert.Equal(Presence(campaignA, playerAMemberId, "Connected"), await keeperA.NextMessageAsync());
    }

    [Fact]
    public async Task Given_subscribed_keepers_of_two_campaigns_When_a_player_joins_one_Then_only_that_campaign_is_told_members_changed()
    {
        var client = _factory.CreateClient();
        var campaignA = (await CreateCampaignAsync(client, "hub-keeper-7a")).Id;
        var campaignB = (await CreateCampaignAsync(client, "hub-keeper-7b")).Id;
        var keeperA = await SubscribeObserverAsync("hub-keeper-7a", campaignA, campaignA.ToString());
        var keeperB = await SubscribeObserverAsync("hub-keeper-7b", campaignB, campaignB.ToString());

        await JoinAsPlayerAsync(client, campaignA, "hub-keeper-7a", "hub-player-7a");
        Assert.Equal<object>(new CampaignDataChangedMessage(campaignA, ["members"]), await keeperA.NextMessageAsync(), CampaignDataChangedComparer.Instance);

        await JoinAsPlayerAsync(client, campaignB, "hub-keeper-7b", "hub-player-7b");
        Assert.Equal<object>(new CampaignDataChangedMessage(campaignB, ["members"]), await keeperB.NextMessageAsync(), CampaignDataChangedComparer.Instance);
    }

    [Fact]
    public async Task Given_a_token_that_expires_When_it_expires_Then_the_server_closes_the_connection()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "hub-keeper-8")).Id;
        var hubClient = CampaignHubTestClient.Create(_factory, "hub-keeper-8", DateTimeOffset.UtcNow.AddSeconds(2));
        _clients.Add(hubClient);
        await hubClient.Connection.StartAsync();
        await hubClient.SubscribeToCampaignAsync(campaignId);

        var closed = await Task.WhenAny(hubClient.Closed, Task.Delay(TimeSpan.FromSeconds(30)));

        Assert.Same(hubClient.Closed, closed);
        Assert.Equal(HubConnectionState.Disconnected, hubClient.Connection.State);
    }

    // Live Wall Entry and Investigator updates (PBI-CP-006). Presence messages are skipped when reading data signals;
    // a negative check is a later, expected signal that must arrive next (the ordering sentinel).

    private enum InvestigatorSetup
    {
        None,
        Submitted,
    }

    private sealed record LiveTable(
        Guid CampaignId,
        Guid InvestigatorId,
        string KeeperOid,
        string OwnerOid,
        CampaignHubTestClient Keeper,
        CampaignHubTestClient Owner,
        CampaignHubTestClient Bystander,
        HttpClient Http);

    /// <summary>A Campaign with a Keeper and two Players, all subscribed; any setup runs before they connect.</summary>
    private async Task<LiveTable> CreateLiveTableAsync(string suffix, InvestigatorSetup setup = InvestigatorSetup.None)
    {
        var http = _factory.CreateClient();
        var keeperOid = $"live-keeper-{suffix}";
        var ownerOid = $"live-owner-{suffix}";
        var bystanderOid = $"live-bystander-{suffix}";
        var campaignId = (await CreateCampaignAsync(http, keeperOid)).Id;
        await JoinAsPlayerAsync(http, campaignId, keeperOid, ownerOid);
        await JoinAsPlayerAsync(http, campaignId, keeperOid, bystanderOid);
        var investigatorId = setup == InvestigatorSetup.Submitted
            ? await CreateSubmittedAsync(http, campaignId, ownerOid, "Harvey Walters")
            : Guid.Empty;
        var keeper = (await SubscribeAsync(keeperOid, campaignId)).Client;
        var owner = (await SubscribeAsync(ownerOid, campaignId)).Client;
        var bystander = (await SubscribeAsync(bystanderOid, campaignId)).Client;
        return new LiveTable(campaignId, investigatorId, keeperOid, ownerOid, keeper, owner, bystander, http);
    }

    private static async Task<CampaignDataChangedMessage> NextDataChangedAsync(CampaignHubTestClient client)
    {
        while (true)
        {
            if (await client.NextMessageAsync() is CampaignDataChangedMessage message)
            {
                return message;
            }
        }
    }

    private static async Task AssertNextAsync(CampaignHubTestClient client, Guid campaignId, string topic) =>
        Assert.Equal<object>(new CampaignDataChangedMessage(campaignId, [topic]), await NextDataChangedAsync(client), CampaignDataChangedComparer.Instance);

    private static async Task<Guid> AddWallEntryAsync(LiveTable table, string visibility)
    {
        var response = await table.Http.SendAsync(BuildRequest(
            HttpMethod.Post, $"/api/campaigns/{table.CampaignId}/wall-entries", table.KeeperOid, new { text = "The lamp goes out.", visibility }));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static async Task RemoveWallEntryAsync(LiveTable table, Guid entryId) =>
        (await table.Http.SendAsync(BuildRequest(HttpMethod.Delete, $"/api/campaigns/{table.CampaignId}/wall-entries/{entryId}", table.KeeperOid)))
            .EnsureSuccessStatusCode();

    private static async Task SendInvestigatorCommandAsync(LiveTable table, HttpMethod method, string path, string oid, object? body = null) =>
        (await table.Http.SendAsync(BuildRequest(method, $"/api/campaigns/{table.CampaignId}/investigators{path}", oid, body)))
            .EnsureSuccessStatusCode();

    /// <summary>Adds a Public entry and expects it as the target's next signal, proving nothing else arrived before it.</summary>
    private static async Task AssertNothingElseBeforeSentinelAsync(LiveTable table, CampaignHubTestClient target)
    {
        await AddWallEntryAsync(table, "Public");
        await AssertNextAsync(target, table.CampaignId, "wallEntries");
    }

    [Fact]
    public async Task Given_connected_members_When_the_keeper_adds_a_public_entry_Then_the_keeper_and_the_players_receive_wall_entries()
    {
        var table = await CreateLiveTableAsync("1");

        await AddWallEntryAsync(table, "Public");

        await AssertNextAsync(table.Keeper, table.CampaignId, "wallEntries");
        await AssertNextAsync(table.Owner, table.CampaignId, "wallEntries");
        await AssertNextAsync(table.Bystander, table.CampaignId, "wallEntries");
    }

    [Fact]
    public async Task Given_connected_members_When_the_keeper_adds_a_keeper_only_entry_Then_only_the_keeper_is_told()
    {
        var table = await CreateLiveTableAsync("2");

        await AddWallEntryAsync(table, "KeeperOnly");
        await AssertNothingElseBeforeSentinelAsync(table, table.Owner);

        await AssertNextAsync(table.Keeper, table.CampaignId, "wallEntries");
        await AssertNextAsync(table.Keeper, table.CampaignId, "wallEntries");
    }

    [Fact]
    public async Task Given_public_and_keeper_only_entries_When_the_keeper_removes_them_Then_only_the_public_removal_reaches_a_player()
    {
        var table = await CreateLiveTableAsync("3");
        var secret = await AddWallEntryAsync(table, "KeeperOnly");
        var known = await AddWallEntryAsync(table, "Public");
        await AssertNextAsync(table.Owner, table.CampaignId, "wallEntries");

        await RemoveWallEntryAsync(table, secret);
        await RemoveWallEntryAsync(table, known);

        await AssertNextAsync(table.Owner, table.CampaignId, "wallEntries");
        await AssertNothingElseBeforeSentinelAsync(table, table.Owner);
    }

    [Fact]
    public async Task Given_a_player_When_they_create_and_start_over_a_draft_Then_the_keeper_and_the_owner_are_told()
    {
        var table = await CreateLiveTableAsync("4");

        await SendInvestigatorCommandAsync(table, HttpMethod.Post, string.Empty, table.OwnerOid);
        await AssertNextAsync(table.Keeper, table.CampaignId, "investigators");
        await AssertNextAsync(table.Owner, table.CampaignId, "myInvestigator");

        await SendInvestigatorCommandAsync(table, HttpMethod.Delete, "/mine", table.OwnerOid);
        await AssertNextAsync(table.Keeper, table.CampaignId, "investigators");
        await AssertNextAsync(table.Owner, table.CampaignId, "myInvestigator");
        await AssertNothingElseBeforeSentinelAsync(table, table.Bystander);
    }

    [Fact]
    public async Task Given_a_draft_When_the_player_submits_Then_the_keeper_and_the_owner_are_told_and_another_player_is_not()
    {
        var http = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(http, "live-keeper-5")).Id;
        await JoinAsPlayerAsync(http, campaignId, "live-keeper-5", "live-owner-5");
        await JoinAsPlayerAsync(http, campaignId, "live-keeper-5", "live-bystander-5");
        await CreateNamedDraftAsync(http, campaignId, "live-owner-5", "Harvey Walters");
        var table = new LiveTable(
            campaignId,
            Guid.Empty,
            "live-keeper-5",
            "live-owner-5",
            (await SubscribeAsync("live-keeper-5", campaignId)).Client,
            (await SubscribeAsync("live-owner-5", campaignId)).Client,
            (await SubscribeAsync("live-bystander-5", campaignId)).Client,
            http);

        await SendInvestigatorCommandAsync(table, HttpMethod.Post, "/mine/submit", table.OwnerOid);

        await AssertNextAsync(table.Keeper, table.CampaignId, "investigators");
        await AssertNextAsync(table.Owner, table.CampaignId, "myInvestigator");
        await AssertNothingElseBeforeSentinelAsync(table, table.Bystander);
    }

    [Fact]
    public async Task Given_a_submitted_investigator_When_the_keeper_approves_Then_every_member_is_told_members_changed()
    {
        var table = await CreateLiveTableAsync("6", InvestigatorSetup.Submitted);

        await SendInvestigatorCommandAsync(table, HttpMethod.Post, $"/{table.InvestigatorId}/approve", table.KeeperOid);

        await AssertNextAsync(table.Keeper, table.CampaignId, "investigators");
        await AssertNextAsync(table.Keeper, table.CampaignId, "members");
        await AssertNextAsync(table.Owner, table.CampaignId, "myInvestigator");
        await AssertNextAsync(table.Owner, table.CampaignId, "members");
        await AssertNextAsync(table.Bystander, table.CampaignId, "members");
        await AssertNothingElseBeforeSentinelAsync(table, table.Bystander);
    }

    [Fact]
    public async Task Given_a_submitted_investigator_When_the_keeper_requests_changes_Then_only_the_keeper_and_the_owner_are_told()
    {
        var table = await CreateLiveTableAsync("7", InvestigatorSetup.Submitted);

        await SendInvestigatorCommandAsync(
            table, HttpMethod.Post, $"/{table.InvestigatorId}/request-changes", table.KeeperOid, new { comment = "Add a backstory." });

        await AssertNextAsync(table.Keeper, table.CampaignId, "investigators");
        await AssertNextAsync(table.Owner, table.CampaignId, "myInvestigator");
        await AssertNothingElseBeforeSentinelAsync(table, table.Bystander);
    }

    [Fact]
    public async Task Given_a_member_of_campaign_a_When_campaign_b_changes_Then_they_receive_only_campaign_a_signals()
    {
        var table = await CreateLiveTableAsync("8");
        var otherCampaignId = (await CreateCampaignAsync(table.Http, "live-keeper-8b")).Id;
        (await table.Http.SendAsync(BuildRequest(
            HttpMethod.Post, $"/api/campaigns/{otherCampaignId}/wall-entries", "live-keeper-8b", new { text = "Elsewhere.", visibility = "Public" })))
            .EnsureSuccessStatusCode();

        await AddWallEntryAsync(table, "Public");

        await AssertNextAsync(table.Owner, table.CampaignId, "wallEntries");
    }

    [Fact]
    public async Task Given_connected_players_When_the_keeper_prepares_scenario_material_Then_the_players_hear_nothing_before_the_next_public_signal()
    {
        var table = await CreateLiveTableAsync("9");

        await PreparedScenarioSeed.PrepareAsync(table.Http, table.CampaignId, table.KeeperOid);
        await AddWallEntryAsync(table, "Public");

        await AssertNextAsync(table.Owner, table.CampaignId, "wallEntries");
        await AssertNextAsync(table.Bystander, table.CampaignId, "wallEntries");
    }

    /// <summary>Compares CampaignDataChanged messages by value, including their topic lists.</summary>
    private sealed class CampaignDataChangedComparer : IEqualityComparer<object>
    {
        public static readonly CampaignDataChangedComparer Instance = new();

        public new bool Equals(object? expected, object? actual) =>
            expected is CampaignDataChangedMessage first
            && actual is CampaignDataChangedMessage second
            && first.CampaignId == second.CampaignId
            && first.Topics.SequenceEqual(second.Topics);

        public int GetHashCode(object message) => message.GetHashCode();
    }
}
