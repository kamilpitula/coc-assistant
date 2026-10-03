namespace CocAssistant.Api.IntegrationTests;

/// <summary>Integration tests for Campaign Invite management and the Player join workflow against a real SQL Server database.</summary>
public class CampaignMembershipApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public CampaignMembershipApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<string> IssueInviteAsync(HttpClient client, Guid campaignId, string keeperOid)
    {
        var response = await client.SendAsync(
            BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/invite", keeperOid));
        response.EnsureSuccessStatusCode();
        var invite = await response.Content.ReadFromJsonAsync<InviteResponse>();
        return invite!.Token;
    }

    private static HttpRequestMessage BuildJoinRequest(string token, string oid)
    {
        var request = BuildRequest(HttpMethod.Post, "/api/campaigns/join", oid);
        request.Content = JsonContent.Create(new { token });
        return request;
    }

    [Fact]
    public async Task Given_a_keeper_When_issuing_an_invite_Then_an_active_invite_is_returned()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "invite-keeper-1")).Id;

        var response = await client.SendAsync(
            BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/invite", "invite-keeper-1"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var invite = await response.Content.ReadFromJsonAsync<InviteResponse>();
        Assert.False(string.IsNullOrWhiteSpace(invite!.Token));
        Assert.Equal("Active", invite.Status);
    }

    [Fact]
    public async Task Given_a_non_keeper_When_issuing_an_invite_Then_it_is_not_found()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "invite-keeper-2")).Id;

        var response = await client.SendAsync(
            BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/invite", "intruder-2"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_an_active_invite_When_the_keeper_gets_it_Then_the_same_token_is_returned()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "invite-keeper-3")).Id;
        var token = await IssueInviteAsync(client, campaignId, "invite-keeper-3");

        var response = await client.SendAsync(
            BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/invite", "invite-keeper-3"));

        response.EnsureSuccessStatusCode();
        var invite = await response.Content.ReadFromJsonAsync<InviteResponse>();
        Assert.Equal(token, invite!.Token);
    }

    [Fact]
    public async Task Given_a_non_keeper_When_getting_the_invite_Then_it_is_not_found()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "invite-keeper-4")).Id;
        await IssueInviteAsync(client, campaignId, "invite-keeper-4");

        var response = await client.SendAsync(
            BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/invite", "intruder-4"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_an_active_invite_When_the_keeper_replaces_it_Then_a_new_token_is_issued()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "invite-keeper-5")).Id;
        var firstToken = await IssueInviteAsync(client, campaignId, "invite-keeper-5");

        var response = await client.SendAsync(
            BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/invite/replace", "invite-keeper-5"));

        response.EnsureSuccessStatusCode();
        var invite = await response.Content.ReadFromJsonAsync<InviteResponse>();
        Assert.NotEqual(firstToken, invite!.Token);
    }

    [Fact]
    public async Task Given_an_active_invite_When_the_keeper_revokes_it_Then_no_active_invite_remains()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "invite-keeper-6")).Id;
        await IssueInviteAsync(client, campaignId, "invite-keeper-6");

        var revokeResponse = await client.SendAsync(
            BuildRequest(HttpMethod.Delete, $"/api/campaigns/{campaignId}/invite", "invite-keeper-6"));
        Assert.Equal(HttpStatusCode.NoContent, revokeResponse.StatusCode);

        var getResponse = await client.SendAsync(
            BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/invite", "invite-keeper-6"));
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task Given_a_non_keeper_When_revoking_the_invite_Then_it_is_not_found()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "invite-keeper-7")).Id;
        await IssueInviteAsync(client, campaignId, "invite-keeper-7");

        var response = await client.SendAsync(
            BuildRequest(HttpMethod.Delete, $"/api/campaigns/{campaignId}/invite", "intruder-7"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_an_active_invite_When_an_account_joins_Then_it_becomes_a_player()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "join-keeper-1")).Id;
        var token = await IssueInviteAsync(client, campaignId, "join-keeper-1");

        var response = await client.SendAsync(BuildJoinRequest(token, "player-1"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<JoinCampaignResponse>();
        Assert.Equal("Joined", result!.Outcome);
        Assert.Equal(campaignId, result.CampaignId);
    }

    [Fact]
    public async Task Given_a_player_When_they_join_again_Then_they_are_already_a_member()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "join-keeper-2")).Id;
        var token = await IssueInviteAsync(client, campaignId, "join-keeper-2");
        await client.SendAsync(BuildJoinRequest(token, "player-2"));

        var response = await client.SendAsync(BuildJoinRequest(token, "player-2"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<JoinCampaignResponse>();
        Assert.Equal("AlreadyMember", result!.Outcome);
    }

    [Fact]
    public async Task Given_a_revoked_invite_When_an_account_joins_Then_it_is_not_found()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "join-keeper-3")).Id;
        var token = await IssueInviteAsync(client, campaignId, "join-keeper-3");
        await client.SendAsync(BuildRequest(HttpMethod.Delete, $"/api/campaigns/{campaignId}/invite", "join-keeper-3"));

        var response = await client.SendAsync(BuildJoinRequest(token, "player-3"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_replaced_invite_When_an_account_uses_the_old_token_Then_it_is_not_found()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "join-keeper-4")).Id;
        var oldToken = await IssueInviteAsync(client, campaignId, "join-keeper-4");
        await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/invite/replace", "join-keeper-4"));

        var response = await client.SendAsync(BuildJoinRequest(oldToken, "player-4"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_an_unknown_token_When_an_account_joins_Then_it_is_not_found()
    {
        var client = _factory.CreateClient();

        var response = await client.SendAsync(BuildJoinRequest("not-a-real-token", "player-5"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_campaign_at_its_player_limit_When_another_account_joins_Then_the_limit_is_reached()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "limit-keeper-1")).Id;
        var token = await IssueInviteAsync(client, campaignId, "limit-keeper-1");

        for (var i = 0; i < 8; i++)
        {
            var joinResponse = await client.SendAsync(BuildJoinRequest(token, $"limit-player-{i}"));
            joinResponse.EnsureSuccessStatusCode();
        }

        var response = await client.SendAsync(BuildJoinRequest(token, "limit-player-overflow"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<JoinCampaignResponse>();
        Assert.Equal("LimitReached", result!.Outcome);
    }

    [Fact]
    public async Task Given_a_campaign_with_a_configured_limit_of_two_When_a_third_account_joins_Then_the_limit_is_reached()
    {
        var client = _factory.CreateClient();
        var createRequest = BuildRequest(HttpMethod.Post, "/api/campaigns", "limit-keeper-2");
        createRequest.Content = JsonContent.Create(new { name = "The Haunting", playerLimit = 2 });
        var createResponse = await client.SendAsync(createRequest);
        createResponse.EnsureSuccessStatusCode();
        var campaignId = (await createResponse.Content.ReadFromJsonAsync<CampaignResponse>())!.Id;
        var token = await IssueInviteAsync(client, campaignId, "limit-keeper-2");

        for (var i = 0; i < 2; i++)
        {
            var joinResponse = await client.SendAsync(BuildJoinRequest(token, $"configured-limit-player-{i}"));
            joinResponse.EnsureSuccessStatusCode();
        }

        var response = await client.SendAsync(BuildJoinRequest(token, "configured-limit-player-overflow"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<JoinCampaignResponse>();
        Assert.Equal("LimitReached", result!.Outcome);
    }

    private async Task<int> CountActiveInvitesAsync(Guid campaignId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CampaignPlayDbContext>();
        return await dbContext.Campaigns
            .Where(campaign => campaign.Id == campaignId)
            .SelectMany(campaign => campaign.Invites)
            .CountAsync(invite => invite.Status == CampaignInviteStatus.Active);
    }

    [Fact]
    public async Task Given_no_active_invite_When_the_keeper_issues_several_invites_at_once_Then_all_receive_the_single_active_invite()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "invite-race-keeper-1")).Id;

        var responses = await Task.WhenAll(Enumerable.Range(0, 4)
            .Select(_ => client.SendAsync(
                BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/invite", "invite-race-keeper-1"))));

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.OK, response.StatusCode));
        var tokens = await Task.WhenAll(responses.Select(async response =>
            (await response.Content.ReadFromJsonAsync<InviteResponse>())!.Token));
        Assert.Single(tokens.Distinct());
        Assert.Equal(1, await CountActiveInvitesAsync(campaignId));
    }

    [Fact]
    public async Task Given_an_active_invite_When_the_keeper_replaces_it_twice_at_once_Then_exactly_one_invite_stays_active()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "invite-race-keeper-2")).Id;
        await IssueInviteAsync(client, campaignId, "invite-race-keeper-2");

        var responses = await Task.WhenAll(Enumerable.Range(0, 2)
            .Select(_ => client.SendAsync(
                BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/invite/replace", "invite-race-keeper-2"))));

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.OK, response.StatusCode));
        Assert.Equal(1, await CountActiveInvitesAsync(campaignId));
    }

    [Fact]
    public async Task Given_more_concurrent_joiners_than_slots_When_they_join_at_once_Then_exactly_the_limit_are_admitted()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "race-keeper-1")).Id;
        var token = await IssueInviteAsync(client, campaignId, "race-keeper-1");

        const int playerLimit = 8;
        const int contenders = playerLimit + 4;

        var joins = Enumerable.Range(0, contenders)
            .Select(i => client.SendAsync(BuildJoinRequest(token, $"race-player-{i}")))
            .ToArray();
        var responses = await Task.WhenAll(joins);

        var joined = responses.Count(response => response.StatusCode == HttpStatusCode.OK);
        Assert.Equal(playerLimit, joined);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CampaignPlayDbContext>();
        var storedPlayers = await dbContext.Campaigns
            .Where(campaign => campaign.Id == campaignId)
            .SelectMany(campaign => campaign.Players)
            .CountAsync();
        Assert.Equal(playerLimit, storedPlayers);
    }
}
