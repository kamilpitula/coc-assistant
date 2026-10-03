namespace CocAssistant.Api.IntegrationTests;

/// <summary>Domain events dispatched after commit through the assembled Api (ADR 0011, PBI-CP-011).</summary>
public class DomainEventDispatchApiTests : IClassFixture<DomainEventApiFactory>, IAsyncLifetime
{
    private readonly DomainEventApiFactory _factory;

    public DomainEventDispatchApiTests(DomainEventApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await ResetDatabaseAsync(_factory);
        _factory.Recorder.Clear();
        _factory.Logs.Clear();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private static async Task<string> IssueInviteAsync(HttpClient client, Guid campaignId, string keeperOid)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/invite", keeperOid));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<InviteResponse>())!.Token;
    }

    private static Task<HttpResponseMessage> JoinAsync(HttpClient client, string token, string oid) =>
        client.SendAsync(BuildRequest(HttpMethod.Post, "/api/campaigns/join", oid, new { token }));

    private async Task<CampaignPlayer> PersistedPlayerAsync(Guid campaignId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CampaignPlayDbContext>();
        var campaign = await dbContext.Campaigns
            .Include(candidate => candidate.Players)
            .SingleAsync(candidate => candidate.Id == campaignId);
        return Assert.Single(campaign.Players);
    }

    [Fact]
    public async Task Given_an_active_invite_When_a_player_joins_Then_exactly_one_player_joined_campaign_event_is_handled_for_the_committed_player()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "events-keeper-1")).Id;
        var token = await IssueInviteAsync(client, campaignId, "events-keeper-1");

        var response = await JoinAsync(client, token, "events-player-1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var player = await PersistedPlayerAsync(campaignId);
        var handled = Assert.IsType<PlayerJoinedCampaign>(Assert.Single(_factory.Recorder.Handled));
        Assert.Equal(new PlayerJoinedCampaign(campaignId, player.Id, player.AccountId, player.JoinedAt), handled);
    }

    [Fact]
    public async Task Given_an_existing_player_When_they_join_again_Then_no_further_event_is_handled()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "events-keeper-2")).Id;
        var token = await IssueInviteAsync(client, campaignId, "events-keeper-2");
        (await JoinAsync(client, token, "events-player-2")).EnsureSuccessStatusCode();

        var response = await JoinAsync(client, token, "events-player-2");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Single(_factory.Recorder.Handled);
    }

    [Fact]
    public async Task Given_the_keeper_When_they_try_to_join_their_own_campaign_Then_no_event_is_handled()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "events-keeper-3")).Id;
        var token = await IssueInviteAsync(client, campaignId, "events-keeper-3");

        var response = await JoinAsync(client, token, "events-keeper-3");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(_factory.Recorder.Handled);
    }

    [Fact]
    public async Task Given_a_handler_that_throws_When_a_player_joins_Then_the_join_succeeds_the_failure_is_logged_and_the_other_handler_runs()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "events-keeper-4")).Id;
        var token = await IssueInviteAsync(client, campaignId, "events-keeper-4");

        var response = await JoinAsync(client, token, "events-player-4");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Single(_factory.Recorder.Handled);
        var error = Assert.Single(_factory.Logs.Errors);
        Assert.Equal(typeof(ServiceProviderDomainEventDispatcher).FullName, error.Category);
        Assert.IsType<InvalidOperationException>(error.Exception);
    }
}
