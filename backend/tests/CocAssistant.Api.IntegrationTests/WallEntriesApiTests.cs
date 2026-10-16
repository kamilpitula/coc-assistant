namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Campaign Wall API (specs/campaign-play/spec.md, Wall Entry API; Scenario "Keeper-only Wall Entry stays hidden";
/// Regression Guardrail: Keeper-only Wall Entries never appear in Player-visible data). A Player must not read or
/// infer a Keeper-only entry through any response: not its text, its id, a count, a cursor, or an error.
/// </summary>
public class WallEntriesApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private const string SecretText = "The cultist is the butler.";

    private readonly IdentityApiFactory _factory;

    public WallEntriesApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private static string WallUri(Guid campaignId, string query = "") => $"/api/campaigns/{campaignId}/wall-entries{query}";

    private static async Task<HttpResponseMessage> PostAsync(HttpClient client, Guid campaignId, string oid, object body) =>
        await client.SendAsync(BuildRequest(HttpMethod.Post, WallUri(campaignId), oid, body));

    private static async Task<WallEntryPageResponse> ListAsync(HttpClient client, Guid campaignId, string oid, string query = "")
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, WallUri(campaignId, query), oid));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<WallEntryPageResponse>())!;
    }

    private static async Task<WallEntryResponse> AddAsync(
        HttpClient client, Guid campaignId, string oid, string text, string? visibility = null)
    {
        var response = await PostAsync(client, campaignId, oid, new { text, visibility });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<WallEntryResponse>())!;
    }

    // Problem details carry a per-request traceId; everything else must match.
    private static string WithoutTraceId(string body) =>
        System.Text.RegularExpressions.Regex.Replace(body, "\"traceId\":\"[^\"]*\"", string.Empty);

    private async Task<(HttpClient Client, Guid CampaignId)> CampaignWithPlayerAsync(string keeper, string player)
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, keeper)).Id;
        await JoinAsPlayerAsync(client, campaignId, keeper, player);
        return (client, campaignId);
    }

    [Fact]
    public async Task Given_a_keeper_When_adding_public_and_keeper_only_entries_Then_the_keeper_lists_both_newest_first_with_exact_fields()
    {
        var (client, campaignId) = await CampaignWithPlayerAsync("wall-keeper-1", "wall-player-1");

        await AddAsync(client, campaignId, "wall-keeper-1", "First.");
        await AddAsync(client, campaignId, "wall-keeper-1", SecretText, "KeeperOnly");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, WallUri(campaignId), "wall-keeper-1"));
        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        var page = await ListAsync(client, campaignId, "wall-keeper-1");

        Assert.Equal(["entries", "nextCursor"], document.RootElement.EnumerateObject().Select(property => property.Name).Order());
        Assert.All(
            document.RootElement.GetProperty("entries").EnumerateArray(),
            entry => Assert.Equal(
                ["authorDisplayName", "createdAt", "id", "text", "visibility"],
                entry.EnumerateObject().Select(property => property.Name).Order()));
        Assert.Equal([SecretText, "First."], page.Entries.Select(entry => entry.Text));
        Assert.Equal(["KeeperOnly", "Public"], page.Entries.Select(entry => entry.Visibility));
        Assert.Equal(DisplayNameFor("wall-keeper-1"), page.Entries[0].AuthorDisplayName);
    }

    [Fact]
    public async Task Given_keeper_only_entries_When_a_player_lists_the_wall_Then_no_part_of_them_is_in_the_response()
    {
        var (client, campaignId) = await CampaignWithPlayerAsync("wall-keeper-2", "wall-player-2");
        await AddAsync(client, campaignId, "wall-keeper-2", "Known to all.");
        var secret = await AddAsync(client, campaignId, "wall-keeper-2", SecretText, "KeeperOnly");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, WallUri(campaignId), "wall-player-2"));

        var body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain(SecretText, body, StringComparison.Ordinal);
        Assert.DoesNotContain(secret.Id.ToString(), body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("KeeperOnly", body, StringComparison.Ordinal);
        var page = await ListAsync(client, campaignId, "wall-player-2");
        Assert.Equal(["Known to all."], page.Entries.Select(entry => entry.Text));
        Assert.Null(page.NextCursor);
    }

    [Fact]
    public async Task Given_interleaved_entries_When_a_player_pages_with_a_limit_Then_pages_and_cursors_follow_only_public_entries()
    {
        var (client, campaignId) = await CampaignWithPlayerAsync("wall-keeper-3", "wall-player-3");
        for (var number = 1; number <= 4; number++)
        {
            await AddAsync(client, campaignId, "wall-keeper-3", $"Public {number}");
            await AddAsync(client, campaignId, "wall-keeper-3", $"Secret {number}", "KeeperOnly");
        }

        var first = await ListAsync(client, campaignId, "wall-player-3", "?limit=3");
        var second = await ListAsync(client, campaignId, "wall-player-3", $"?limit=3&cursor={first.NextCursor}");

        Assert.Equal(["Public 4", "Public 3", "Public 2"], first.Entries.Select(entry => entry.Text));
        Assert.Equal(["Public 1"], second.Entries.Select(entry => entry.Text));
        Assert.Null(second.NextCursor);
    }

    [Theory]
    [InlineData("?limit=0")]
    [InlineData("?limit=51")]
    [InlineData("?cursor=not-a-cursor")]
    public async Task Given_an_invalid_limit_or_cursor_When_listing_Then_it_is_a_bad_request(string query)
    {
        var (client, campaignId) = await CampaignWithPlayerAsync("wall-keeper-4", "wall-player-4");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, WallUri(campaignId, query), "wall-player-4"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_player_When_adding_without_a_visibility_or_as_public_Then_a_public_entry_is_created_and_the_keeper_sees_it()
    {
        var (client, campaignId) = await CampaignWithPlayerAsync("wall-keeper-5", "wall-player-5");

        var omitted = await AddAsync(client, campaignId, "wall-player-5", "I search the desk.");
        var explicitPublic = await AddAsync(client, campaignId, "wall-player-5", "I read the letter.", "Public");

        Assert.Equal(["Public", "Public"], new[] { omitted.Visibility, explicitPublic.Visibility });
        Assert.Equal(DisplayNameFor("wall-player-5"), omitted.AuthorDisplayName);
        var keeperPage = await ListAsync(client, campaignId, "wall-keeper-5");
        Assert.Equal(["I read the letter.", "I search the desk."], keeperPage.Entries.Select(entry => entry.Text));
    }

    [Fact]
    public async Task Given_a_player_When_adding_a_keeper_only_entry_Then_it_is_a_bad_request_that_names_no_entry_and_nothing_is_stored()
    {
        var (client, campaignId) = await CampaignWithPlayerAsync("wall-keeper-6", "wall-player-6");

        var response = await PostAsync(client, campaignId, "wall-player-6", new { text = "Secret.", visibility = "KeeperOnly" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty((await ListAsync(client, campaignId, "wall-keeper-6")).Entries);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Given_empty_text_When_adding_Then_it_is_a_bad_request(string text)
    {
        var (client, campaignId) = await CampaignWithPlayerAsync("wall-keeper-7", "wall-player-7");

        var response = await PostAsync(client, campaignId, "wall-keeper-7", new { text });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Given_text_over_the_limit_or_an_unknown_visibility_When_adding_Then_it_is_a_bad_request()
    {
        var (client, campaignId) = await CampaignWithPlayerAsync("wall-keeper-8", "wall-player-8");

        var tooLong = await PostAsync(client, campaignId, "wall-keeper-8", new { text = new string('a', 2001) });
        var unknown = await PostAsync(client, campaignId, "wall-keeper-8", new { text = "Hi.", visibility = "Secret" });

        Assert.Equal(HttpStatusCode.BadRequest, tooLong.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, unknown.StatusCode);
    }

    [Fact]
    public async Task Given_a_non_member_When_reading_adding_or_removing_Then_every_call_is_not_found()
    {
        var (client, campaignId) = await CampaignWithPlayerAsync("wall-keeper-9", "wall-player-9");
        var entry = await AddAsync(client, campaignId, "wall-keeper-9", "Hello.");

        var list = await client.SendAsync(BuildRequest(HttpMethod.Get, WallUri(campaignId), "wall-stranger-9"));
        var add = await PostAsync(client, campaignId, "wall-stranger-9", new { text = "Hi." });
        var remove = await client.SendAsync(
            BuildRequest(HttpMethod.Delete, $"{WallUri(campaignId)}/{entry.Id}", "wall-stranger-9"));

        Assert.Equal([HttpStatusCode.NotFound, HttpStatusCode.NotFound, HttpStatusCode.NotFound], [list.StatusCode, add.StatusCode, remove.StatusCode]);
    }

    [Fact]
    public async Task Given_an_unauthenticated_request_When_using_the_wall_Then_it_is_unauthorized()
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, WallUri(Guid.NewGuid()));
        request.Headers.Add("X-Test-Unauthenticated", "true");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_player_When_removing_a_public_a_keeper_only_or_a_missing_entry_Then_the_responses_are_identical_not_found_and_nothing_is_removed()
    {
        var (client, campaignId) = await CampaignWithPlayerAsync("wall-keeper-10", "wall-player-10");
        var publicEntry = await AddAsync(client, campaignId, "wall-keeper-10", "Public.");
        var secret = await AddAsync(client, campaignId, "wall-keeper-10", SecretText, "KeeperOnly");

        var responses = new List<(HttpStatusCode Status, string Body)>();
        foreach (var id in new[] { publicEntry.Id, secret.Id, Guid.NewGuid() })
        {
            var response = await client.SendAsync(BuildRequest(HttpMethod.Delete, $"{WallUri(campaignId)}/{id}", "wall-player-10"));
            responses.Add((response.StatusCode, WithoutTraceId(await response.Content.ReadAsStringAsync())));
        }

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.NotFound, response.Status));
        Assert.Single(responses.Select(response => response.Body).Distinct());
        Assert.Equal(2, (await ListAsync(client, campaignId, "wall-keeper-10")).Entries.Count);
    }

    [Fact]
    public async Task Given_an_entry_When_the_keeper_removes_it_Then_it_is_gone_for_everyone_and_a_second_removal_is_not_found()
    {
        var (client, campaignId) = await CampaignWithPlayerAsync("wall-keeper-11", "wall-player-11");
        var entry = await AddAsync(client, campaignId, "wall-player-11", "Mine.");

        var removed = await client.SendAsync(BuildRequest(HttpMethod.Delete, $"{WallUri(campaignId)}/{entry.Id}", "wall-keeper-11"));
        var again = await client.SendAsync(BuildRequest(HttpMethod.Delete, $"{WallUri(campaignId)}/{entry.Id}", "wall-keeper-11"));

        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, again.StatusCode);
        Assert.Empty((await ListAsync(client, campaignId, "wall-keeper-11")).Entries);
        Assert.Empty((await ListAsync(client, campaignId, "wall-player-11")).Entries);
    }

    [Fact]
    public async Task Given_two_campaigns_When_the_keeper_of_one_uses_the_others_entry_id_Then_it_is_not_found_and_lists_stay_separate()
    {
        var (client, campaignId) = await CampaignWithPlayerAsync("wall-keeper-12", "wall-player-12");
        var otherCampaignId = (await CreateCampaignAsync(client, "wall-keeper-12b")).Id;
        var entry = await AddAsync(client, campaignId, "wall-keeper-12", "Here.");
        await AddAsync(client, otherCampaignId, "wall-keeper-12b", "There.");

        var crossRemove = await client.SendAsync(
            BuildRequest(HttpMethod.Delete, $"{WallUri(otherCampaignId)}/{entry.Id}", "wall-keeper-12b"));

        Assert.Equal(HttpStatusCode.NotFound, crossRemove.StatusCode);
        Assert.Equal(["Here."], (await ListAsync(client, campaignId, "wall-keeper-12")).Entries.Select(item => item.Text));
        Assert.Equal(["There."], (await ListAsync(client, otherCampaignId, "wall-keeper-12b")).Entries.Select(item => item.Text));
    }
}
