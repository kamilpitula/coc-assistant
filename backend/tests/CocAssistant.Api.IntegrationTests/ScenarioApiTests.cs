namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Scenario API (specs/scenario-preparation/spec.md: create, append, edit, reorder, Keeper-only). A Player, another
/// Campaign's Keeper, and a Scenario id from another Campaign all get an identical 404 (ADR 0013).
/// </summary>
public class ScenarioApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public ScenarioApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private static string ScenariosUri(Guid campaignId, string suffix = "") => $"/api/campaigns/{campaignId}/scenarios{suffix}";

    private static async Task<ScenarioResponse> CreateScenarioAsync(
        HttpClient client, Guid campaignId, string oid, string title, string? keeperNotes = null)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, ScenariosUri(campaignId), oid, new { title, keeperNotes }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ScenarioResponse>())!;
    }

    private static async Task<IReadOnlyList<string>> TitlesAsync(HttpClient client, Guid campaignId, string oid)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, ScenariosUri(campaignId), oid));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var list = await response.Content.ReadFromJsonAsync<ScenarioListResponse>();
        return list!.Scenarios.Select(scenario => scenario.Title).ToList();
    }

    private static Task<HttpResponseMessage> ReorderAsync(HttpClient client, Guid campaignId, string oid, params Guid[] ids) =>
        client.SendAsync(BuildRequest(HttpMethod.Put, ScenariosUri(campaignId, "/order"), oid, new { scenarioIds = ids }));

    private static async Task<IReadOnlyList<string>> ErrorKeysAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("errors").EnumerateObject().Select(property => property.Name).ToList();
    }

    // Problem details carry a per-request traceId; everything else must match.
    private static string WithoutTraceId(string body) =>
        System.Text.RegularExpressions.Regex.Replace(body, "\"traceId\":\"[^\"]*\"", string.Empty);

    [Fact]
    public async Task Given_a_keeper_When_creating_two_scenarios_Then_each_is_201_and_the_list_get_and_edit_work_in_order()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scenario-keeper-1")).Id;

        var first = await CreateScenarioAsync(client, campaignId, "scenario-keeper-1", "  The Haunting ", " Cellar key. ");
        var second = await CreateScenarioAsync(client, campaignId, "scenario-keeper-1", "Edge of Darkness");

        var get = await client.SendAsync(BuildRequest(HttpMethod.Get, ScenariosUri(campaignId, $"/{first.Id}"), "scenario-keeper-1"));
        var edit = await client.SendAsync(
            BuildRequest(HttpMethod.Put, ScenariosUri(campaignId, $"/{second.Id}"), "scenario-keeper-1", new { title = "Edge", keeperNotes = (string?)null }));

        Assert.Equal(("The Haunting", "Cellar key.", string.Empty), (first.Title, first.KeeperNotes, second.KeeperNotes));
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        Assert.Equal(first, await get.Content.ReadFromJsonAsync<ScenarioResponse>());
        Assert.Equal(HttpStatusCode.OK, edit.StatusCode);
        Assert.Equal(new ScenarioResponse(second.Id, "Edge", string.Empty), await edit.Content.ReadFromJsonAsync<ScenarioResponse>());
        Assert.Equal(["The Haunting", "Edge"], await TitlesAsync(client, campaignId, "scenario-keeper-1"));
    }

    [Fact]
    public async Task Given_a_scenario_response_When_read_Then_it_has_only_id_title_and_keeper_notes()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scenario-keeper-2")).Id;
        await CreateScenarioAsync(client, campaignId, "scenario-keeper-2", "The Haunting");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, ScenariosUri(campaignId), "scenario-keeper-2"));

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var scenario = document.RootElement.GetProperty("scenarios")[0];
        Assert.Equal(["id", "keeperNotes", "title"], scenario.EnumerateObject().Select(property => property.Name).Order());
    }

    [Fact]
    public async Task Given_three_scenarios_When_the_keeper_reorders_them_Then_the_response_and_later_reads_use_the_new_order()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scenario-keeper-3")).Id;
        var a = await CreateScenarioAsync(client, campaignId, "scenario-keeper-3", "A");
        var b = await CreateScenarioAsync(client, campaignId, "scenario-keeper-3", "B");
        var c = await CreateScenarioAsync(client, campaignId, "scenario-keeper-3", "C");

        var response = await ReorderAsync(client, campaignId, "scenario-keeper-3", c.Id, a.Id, b.Id);
        await CreateScenarioAsync(client, campaignId, "scenario-keeper-3", "D");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var list = await response.Content.ReadFromJsonAsync<ScenarioListResponse>();
        Assert.Equal(["C", "A", "B"], list!.Scenarios.Select(scenario => scenario.Title));
        Assert.Equal(["C", "A", "B", "D"], await TitlesAsync(client, campaignId, "scenario-keeper-3"));
    }

    [Fact]
    public async Task Given_no_scenarios_When_reordering_with_an_empty_list_Then_it_is_an_empty_200()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scenario-keeper-4")).Id;

        var response = await ReorderAsync(client, campaignId, "scenario-keeper-4");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty((await response.Content.ReadFromJsonAsync<ScenarioListResponse>())!.Scenarios);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task Given_an_empty_blank_or_missing_title_When_creating_Then_it_is_a_bad_request_keyed_by_title(string? title)
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scenario-keeper-5")).Id;

        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, ScenariosUri(campaignId), "scenario-keeper-5", new { title }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(["title"], await ErrorKeysAsync(response));
    }

    [Fact]
    public async Task Given_a_title_or_notes_over_the_limit_When_creating_and_editing_Then_each_is_a_bad_request_keyed_by_its_field()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scenario-keeper-6")).Id;
        var existing = await CreateScenarioAsync(client, campaignId, "scenario-keeper-6", "Keep");

        var longTitle = await client.SendAsync(
            BuildRequest(HttpMethod.Post, ScenariosUri(campaignId), "scenario-keeper-6", new { title = new string('a', 201) }));
        var longNotes = await client.SendAsync(
            BuildRequest(HttpMethod.Post, ScenariosUri(campaignId), "scenario-keeper-6", new { title = "T", keeperNotes = new string('n', 10_001) }));
        var editLongNotes = await client.SendAsync(
            BuildRequest(HttpMethod.Put, ScenariosUri(campaignId, $"/{existing.Id}"), "scenario-keeper-6", new { title = "T", keeperNotes = new string('n', 10_001) }));

        Assert.Equal(["title"], await ErrorKeysAsync(longTitle));
        Assert.Equal(["keeperNotes"], await ErrorKeysAsync(longNotes));
        Assert.Equal(["keeperNotes"], await ErrorKeysAsync(editLongNotes));
        Assert.Equal(["Keep"], await TitlesAsync(client, campaignId, "scenario-keeper-6"));
    }

    [Fact]
    public async Task Given_a_reorder_with_a_duplicate_id_or_without_the_id_list_When_applied_Then_it_is_a_bad_request()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scenario-keeper-7")).Id;
        var a = await CreateScenarioAsync(client, campaignId, "scenario-keeper-7", "A");
        await CreateScenarioAsync(client, campaignId, "scenario-keeper-7", "B");

        var duplicate = await ReorderAsync(client, campaignId, "scenario-keeper-7", a.Id, a.Id);
        var noBodyRequest = BuildRequest(HttpMethod.Put, ScenariosUri(campaignId, "/order"), "scenario-keeper-7");
        noBodyRequest.Content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json");
        var noBody = await client.SendAsync(noBodyRequest);

        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
        Assert.Equal(["scenarioIds"], await ErrorKeysAsync(duplicate));
        Assert.Equal(HttpStatusCode.BadRequest, noBody.StatusCode);
        Assert.Equal(["A", "B"], await TitlesAsync(client, campaignId, "scenario-keeper-7"));
    }

    [Fact]
    public async Task Given_a_stale_order_When_a_scenario_is_missing_extra_or_from_another_campaign_Then_it_is_a_409_that_names_no_id()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scenario-keeper-8")).Id;
        var otherCampaignId = (await CreateCampaignAsync(client, "scenario-keeper-8")).Id;
        var a = await CreateScenarioAsync(client, campaignId, "scenario-keeper-8", "A");
        var b = await CreateScenarioAsync(client, campaignId, "scenario-keeper-8", "B");
        var foreign = await CreateScenarioAsync(client, otherCampaignId, "scenario-keeper-8", "Foreign");

        var missing = await ReorderAsync(client, campaignId, "scenario-keeper-8", b.Id);
        var extra = await ReorderAsync(client, campaignId, "scenario-keeper-8", b.Id, a.Id, Guid.NewGuid());
        var otherCampaigns = await ReorderAsync(client, campaignId, "scenario-keeper-8", b.Id, foreign.Id);

        Assert.All([missing, extra, otherCampaigns], response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        var body = await otherCampaigns.Content.ReadAsStringAsync();
        Assert.DoesNotContain(foreign.Id.ToString(), body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(a.Id.ToString(), body, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(["A", "B"], await TitlesAsync(client, campaignId, "scenario-keeper-8"));
    }

    [Fact]
    public async Task Given_a_player_or_another_keeper_or_a_missing_campaign_When_using_every_endpoint_Then_each_is_the_same_404()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scenario-keeper-9")).Id;
        await JoinAsPlayerAsync(client, campaignId, "scenario-keeper-9", "scenario-player-9");
        await CreateCampaignAsync(client, "scenario-keeper-9b");
        var scenario = await CreateScenarioAsync(client, campaignId, "scenario-keeper-9", "Secret plot", "Secret notes");
        var request = new { title = "Mine", keeperNotes = "x" };

        var results = new List<(HttpStatusCode Status, string Body)>();
        foreach (var (oid, target) in new[]
                 {
                     ("scenario-player-9", campaignId),
                     ("scenario-keeper-9b", campaignId),
                     ("scenario-keeper-9", Guid.NewGuid()),
                 })
        {
            var calls = new[]
            {
                BuildRequest(HttpMethod.Get, ScenariosUri(target), oid),
                BuildRequest(HttpMethod.Get, ScenariosUri(target, $"/{scenario.Id}"), oid),
                BuildRequest(HttpMethod.Post, ScenariosUri(target), oid, request),
                BuildRequest(HttpMethod.Put, ScenariosUri(target, $"/{scenario.Id}"), oid, request),
                BuildRequest(HttpMethod.Put, ScenariosUri(target, "/order"), oid, new { scenarioIds = new[] { scenario.Id } }),
            };
            foreach (var call in calls)
            {
                var response = await client.SendAsync(call);
                results.Add((response.StatusCode, WithoutTraceId(await response.Content.ReadAsStringAsync())));
            }
        }

        Assert.All(results, result => Assert.Equal(HttpStatusCode.NotFound, result.Status));
        Assert.All(results, result => Assert.DoesNotContain("Secret", result.Body, StringComparison.Ordinal));
        Assert.Equal(["Secret plot"], await TitlesAsync(client, campaignId, "scenario-keeper-9"));
    }

    [Fact]
    public async Task Given_a_scenario_of_the_keepers_other_campaign_When_used_through_this_campaign_Then_get_and_edit_are_404()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scenario-keeper-10")).Id;
        var otherCampaignId = (await CreateCampaignAsync(client, "scenario-keeper-10")).Id;
        var foreign = await CreateScenarioAsync(client, otherCampaignId, "scenario-keeper-10", "Foreign");

        var get = await client.SendAsync(BuildRequest(HttpMethod.Get, ScenariosUri(campaignId, $"/{foreign.Id}"), "scenario-keeper-10"));
        var edit = await client.SendAsync(
            BuildRequest(HttpMethod.Put, ScenariosUri(campaignId, $"/{foreign.Id}"), "scenario-keeper-10", new { title = "Changed" }));

        Assert.Equal([HttpStatusCode.NotFound, HttpStatusCode.NotFound], [get.StatusCode, edit.StatusCode]);
        Assert.Equal(["Foreign"], await TitlesAsync(client, otherCampaignId, "scenario-keeper-10"));
    }

    [Fact]
    public async Task Given_an_unauthenticated_request_When_using_the_scenario_endpoints_Then_it_is_unauthorized()
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, ScenariosUri(Guid.NewGuid()));
        request.Headers.Add("X-Test-Unauthenticated", "true");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
