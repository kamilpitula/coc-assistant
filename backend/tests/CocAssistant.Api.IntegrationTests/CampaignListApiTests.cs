namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// GET /api/campaigns (specs/campaign-list/spec.md, API; Regression Guardrails: a Player item never carries the
/// Player limit, the awaiting-review count, Account ids, or Investigator ids, and a non-member never receives a
/// Campaign).
/// </summary>
public class CampaignListApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public CampaignListApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private static async Task<(string Body, JsonElement[] Items)> ReadListAsync(HttpClient client, string callerOid)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, "/api/campaigns", callerOid));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        return (body, document.RootElement.EnumerateArray().Select(item => item.Clone()).ToArray());
    }

    private static string[] PropertyNamesOf(JsonElement item) =>
        item.EnumerateObject().Select(property => property.Name).Order(StringComparer.Ordinal).ToArray();

    [Fact]
    public async Task Given_an_account_without_campaigns_When_listing_Then_the_list_is_empty()
    {
        var client = _factory.CreateClient();
        await CreateCampaignAsync(client, "list-keeper-0");

        var (body, _) = await ReadListAsync(client, "list-stranger-0");

        Assert.Equal("[]", body);
    }

    [Fact]
    public async Task Given_a_keeper_campaign_When_the_keeper_lists_Then_the_item_has_exactly_the_keeper_properties_and_counts()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "list-keeper-1");
        await JoinAsPlayerAsync(client, campaign.Id, "list-keeper-1", "list-player-1a");
        await JoinAsPlayerAsync(client, campaign.Id, "list-keeper-1", "list-player-1b");
        await CreateApprovedAsync(client, campaign.Id, "list-keeper-1", "list-player-1a", "Mae Doyle");
        await CreateSubmittedAsync(client, campaign.Id, "list-player-1b", "Dr. Ames");

        var (body, items) = await ReadListAsync(client, "list-keeper-1");

        var item = Assert.Single(items);
        Assert.Equal(
            ["approvedInvestigatorCount", "awaitingReviewCount", "era", "id", "name", "playerCount", "playerLimit", "role"],
            PropertyNamesOf(item));
        Assert.Equal(
            $"id={campaign.Id},name=The Haunting,era=1920s,role=Keeper,playerCount=2,playerLimit=8,approvedInvestigatorCount=1,awaitingReviewCount=1",
            string.Join(",", item.EnumerateObject().Select(property => $"{property.Name}={property.Value}")));
        Assert.DoesNotContain(campaign.KeeperAccountId.ToString(), body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Given_a_player_campaign_When_the_player_lists_Then_the_item_has_exactly_the_player_properties_and_no_ids()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "list-keeper-2");
        await JoinAsPlayerAsync(client, campaign.Id, "list-keeper-2", "list-player-2");
        await JoinAsPlayerAsync(client, campaign.Id, "list-keeper-2", "list-other-2");
        var ownId = await CreateSubmittedAsync(client, campaign.Id, "list-player-2", "Harvey Walters");
        var otherId = await CreateSubmittedAsync(client, campaign.Id, "list-other-2", "Dr. Ames");

        var (body, items) = await ReadListAsync(client, "list-player-2");

        var item = Assert.Single(items);
        Assert.Equal(
            ["approvedInvestigatorCount", "era", "id", "keeperName", "myInvestigator", "name", "playerCount", "role"],
            PropertyNamesOf(item));
        Assert.Equal("Player", item.GetProperty("role").GetString());
        Assert.Equal(DisplayNameFor("list-keeper-2"), item.GetProperty("keeperName").GetString());
        Assert.Equal(2, item.GetProperty("playerCount").GetInt32());
        Assert.Equal(0, item.GetProperty("approvedInvestigatorCount").GetInt32());
        Assert.Equal(
            "status=Submitted,name=Harvey Walters",
            string.Join(",", item.GetProperty("myInvestigator").EnumerateObject().Select(property => $"{property.Name}={property.Value}")));
        Assert.DoesNotContain(campaign.KeeperAccountId.ToString(), body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(ownId.ToString(), body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(otherId.ToString(), body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Dr. Ames", body);
    }

    [Fact]
    public async Task Given_a_player_without_an_investigator_When_listing_Then_myInvestigator_is_null()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "list-keeper-3");
        await JoinAsPlayerAsync(client, campaign.Id, "list-keeper-3", "list-player-3");

        var (_, items) = await ReadListAsync(client, "list-player-3");

        Assert.Equal(JsonValueKind.Null, Assert.Single(items).GetProperty("myInvestigator").ValueKind);
    }

    [Fact]
    public async Task Given_kept_and_joined_campaigns_When_listing_Then_kept_come_first_newest_first_and_others_are_not_listed()
    {
        var client = _factory.CreateClient();
        var joinedOlder = await CreateCampaignAsync(client, "list-keeper-4a");
        var joinedNewer = await CreateCampaignAsync(client, "list-keeper-4b");
        var keptOlder = await CreateCampaignAsync(client, "list-caller-4");
        var keptNewer = await CreateCampaignAsync(client, "list-caller-4");
        var notJoined = await CreateCampaignAsync(client, "list-keeper-4a");
        await JoinAsPlayerAsync(client, joinedOlder.Id, "list-keeper-4a", "list-caller-4");
        await JoinAsPlayerAsync(client, joinedNewer.Id, "list-keeper-4b", "list-caller-4");

        var (body, items) = await ReadListAsync(client, "list-caller-4");

        Assert.Equal(
            [keptNewer.Id, keptOlder.Id, joinedNewer.Id, joinedOlder.Id],
            items.Select(item => item.GetProperty("id").GetGuid()));
        Assert.DoesNotContain(notJoined.Id.ToString(), body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Given_an_unauthenticated_request_When_listing_Then_it_is_unauthorized()
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/campaigns");
        request.Headers.Add("X-Test-Unauthenticated", "true");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
