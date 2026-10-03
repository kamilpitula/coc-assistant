namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// GET /api/campaigns/{campaignId}/members (specs/campaign-play/spec.md, Campaign members API; Scenario "Non-member
/// cannot read a Campaign's roster"; Regression Guardrail: the roster never includes Account ids or Investigator data).
/// </summary>
public class CampaignMembersApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public CampaignMembersApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Given_a_campaign_with_a_player_When_the_player_reads_the_members_Then_the_keeper_comes_first_and_the_player_is_marked()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "members-keeper-1")).Id;
        await JoinAsPlayerAsync(client, campaignId, "members-keeper-1", "members-player-1");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/members", "members-player-1"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var members = await response.Content.ReadFromJsonAsync<List<CampaignMemberResponse>>();
        Assert.NotNull(members);
        Assert.Equal(
            [
                (DisplayNameFor("members-keeper-1"), "Keeper", false),
                (DisplayNameFor("members-player-1"), "Player", true),
            ],
            members.Select(member => (member.DisplayName, member.Role, member.IsYou)));
        Assert.Equal(campaignId.ToString(), members[0].MemberId);
    }

    [Fact]
    public async Task Given_a_campaign_When_the_members_are_read_Then_each_entry_has_only_memberId_displayName_role_and_isYou()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "members-keeper-2");
        await JoinAsPlayerAsync(client, campaign.Id, "members-keeper-2", "members-player-2");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaign.Id}/members", "members-player-2"));

        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        Assert.All(
            document.RootElement.EnumerateArray(),
            entry => Assert.Equal(
                ["displayName", "isYou", "memberId", "role"],
                entry.EnumerateObject().Select(property => property.Name).Order()));
        Assert.DoesNotContain(campaign.KeeperAccountId.ToString(), body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Given_a_campaign_When_a_non_member_reads_the_members_Then_it_is_not_found()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "members-keeper-3")).Id;

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/members", "members-stranger-3"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_an_unauthenticated_request_When_reading_the_members_Then_it_is_unauthorized()
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/campaigns/{Guid.NewGuid()}/members");
        request.Headers.Add("X-Test-Unauthenticated", "true");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
