namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Scene History API (specs/scene-play/spec.md, Scene History): the Keeper and Player shapes, the newest-started order,
/// Prepared exclusion, Campaign isolation, and the sceneHistory hub signal. Authorization for the route is in
/// ScenePlayAuthorizationMatrixTests.
/// </summary>
public class SceneHistoryApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public SceneHistoryApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private sealed record Table(
        HttpClient Client,
        string KeeperOid,
        string HarveyOid,
        string LucyOid,
        string StrangerOid,
        Guid CampaignId,
        Guid HarveyId,
        Guid LucyId,
        Guid HauntingId,
        Guid DunwichId,
        Guid MeetingKnott,
        Guid CorbittHouse,
        Guid StrangeHouse,
        Guid Festival);

    private async Task<Table> TableAsync(string suffix)
    {
        var client = _factory.CreateClient();
        var keeper = $"history-keeper-{suffix}";
        var harveyOid = $"history-harvey-{suffix}";
        var lucyOid = $"history-lucy-{suffix}";
        var campaignId = (await CreateCampaignAsync(client, keeper)).Id;
        await JoinAsPlayerAsync(client, campaignId, keeper, harveyOid);
        await JoinAsPlayerAsync(client, campaignId, keeper, lucyOid);
        var harvey = await CreateApprovedAsync(client, campaignId, keeper, harveyOid, "Harvey Walters");
        var lucy = await CreateApprovedAsync(client, campaignId, keeper, lucyOid, "Lucy Ward");
        var haunting = await CreateAsync(client, $"/api/campaigns/{campaignId}/scenarios", keeper, new { title = "The Haunting" });
        var hauntingScenes = $"/api/campaigns/{campaignId}/scenarios/{haunting}/scenes";
        var meetingKnott = await CreateAsync(client, hauntingScenes, keeper, new { title = "Meeting Knott", location = "Arkham" });
        var corbittHouse = await CreateAsync(client, hauntingScenes, keeper, new { title = "The Corbitt House", location = "Boston Road" });
        var dunwich = await CreateAsync(client, $"/api/campaigns/{campaignId}/scenarios", keeper, new { title = "The Dunwich Horror" });
        var dunwichScenes = $"/api/campaigns/{campaignId}/scenarios/{dunwich}/scenes";
        var strangeHouse = await CreateAsync(client, dunwichScenes, keeper, new { title = "The Strange High House" });
        var festival = await CreateAsync(client, dunwichScenes, keeper, new { title = "The Festival" });
        return new Table(client, keeper, harveyOid, lucyOid, $"history-stranger-{suffix}", campaignId, harvey, lucy, haunting, dunwich, meetingKnott, corbittHouse, strangeHouse, festival);
    }

    private static async Task<Guid> CreateAsync(HttpClient client, string uri, string oid, object body)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, uri, oid, body));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static string HistoryUri(Table table) => $"/api/campaigns/{table.CampaignId}/scene-history";

    private static Task<HttpResponseMessage> StartAsync(Table table, Guid sceneId, Guid[] present, bool finishActiveScene = false) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{table.CampaignId}/scenes/{sceneId}/start", table.KeeperOid, new { presentInvestigatorIds = present, finishActiveScene }));

    private static Task<HttpResponseMessage> FinishAsync(Table table) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{table.CampaignId}/active-scene/finish", table.KeeperOid));

    private static Task<HttpResponseMessage> GetHistoryAsync(Table table, string oid) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Get, HistoryUri(table), oid));

    private static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();

    private static Task<Guid> AddTextHandoutAsync(Table table, Guid sceneId, string title) =>
        CreateAsync(table.Client, $"/api/campaigns/{table.CampaignId}/scenarios/{table.HauntingId}/scenes/{sceneId}/handouts", table.KeeperOid, new { kind = "ReadAloud", visibility = "PlayerFacing", title, content = PreparedScenarioSeed.Json(PreparedScenarioSeed.RichText("The door creaks open")) });

    private static async Task RevealHandoutAsync(Table table, Guid handoutId, Guid[] to)
    {
        var response = await table.Client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{table.CampaignId}/active-scene/reveals", table.KeeperOid, new { subject = new { type = "Handout", id = handoutId }, investigatorIds = to }));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // Starts the Corbitt House with both Investigators, reveals a Handout to Harvey, then starts the Strange High House
    // finishing the Corbitt House in the same save, so the finished Scene's FinishedAt is the new Scene's StartedAt.
    private static async Task PlayTwoScenesAsync(Table table)
    {
        Assert.Equal(HttpStatusCode.OK, (await StartAsync(table, table.CorbittHouse, [table.HarveyId, table.LucyId])).StatusCode);
        await RevealHandoutAsync(table, await AddTextHandoutAsync(table, table.CorbittHouse, "The cellar door"), [table.HarveyId]);
        Assert.Equal(HttpStatusCode.OK, (await StartAsync(table, table.StrangeHouse, [table.LucyId], finishActiveScene: true)).StatusCode);
    }

    [Fact]
    public async Task Given_played_scenes_When_the_Keeper_reads_history_Then_the_newest_started_come_first_with_every_reveal_and_present_names()
    {
        var table = await TableAsync("1");
        await PlayTwoScenesAsync(table);

        var response = await GetHistoryAsync(table, table.KeeperOid);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var scenes = (await JsonAsync(response)).GetProperty("scenes").EnumerateArray().ToList();
        Assert.Equal(["The Strange High House", "The Corbitt House"], scenes.Select(scene => scene.GetProperty("title").GetString()).ToList());
        Assert.Equal(["The Dunwich Horror", "The Haunting"], scenes.Select(scene => scene.GetProperty("scenarioTitle").GetString()).ToList());
        Assert.True(scenes[0].GetProperty("startedAt").GetDateTimeOffset() > scenes[1].GetProperty("startedAt").GetDateTimeOffset());
        Assert.Equal(JsonValueKind.Null, scenes[0].GetProperty("finishedAt").ValueKind);
        Assert.Equal(scenes[0].GetProperty("startedAt").GetDateTimeOffset(), scenes[1].GetProperty("finishedAt").GetDateTimeOffset());
        Assert.Equal(["Lucy Ward"], scenes[0].GetProperty("investigatorsPresent").EnumerateArray().Select(investigator => investigator.GetProperty("name").GetString()).ToList());
        Assert.Equal(["Harvey Walters", "Lucy Ward"], scenes[1].GetProperty("investigatorsPresent").EnumerateArray().Select(investigator => investigator.GetProperty("name").GetString()).ToList());
        var reveal = scenes[1].GetProperty("reveals").EnumerateArray().Single();
        Assert.Equal("The cellar door", reveal.GetProperty("title").GetString());
        Assert.Equal(["Harvey Walters"], reveal.GetProperty("recipients").EnumerateArray().Select(recipient => recipient.GetProperty("name").GetString()).ToList());
        Assert.NotEqual(Guid.Empty, reveal.GetProperty("subjectId").GetGuid());
    }

    [Fact]
    public async Task Given_played_scenes_When_a_Player_reads_history_Then_only_their_reveals_are_listed_without_present_or_hidden_ids()
    {
        var table = await TableAsync("2");
        await PlayTwoScenesAsync(table);

        var response = await GetHistoryAsync(table, table.HarveyOid);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var history = await JsonAsync(response);
        Assert.Equal("Harvey Walters", history.GetProperty("investigatorName").GetString());
        var scenes = history.GetProperty("scenes").EnumerateArray().ToList();
        Assert.Equal(["The Strange High House", "The Corbitt House"], scenes.Select(scene => scene.GetProperty("title").GetString()).ToList());
        Assert.All(scenes, scene =>
        {
            Assert.False(scene.TryGetProperty("investigatorsPresent", out _));
            Assert.False(scene.TryGetProperty("scenarioId", out _));
            Assert.False(scene.TryGetProperty("location", out _));
            Assert.True(scene.TryGetProperty("startedAt", out _));
            Assert.True(scene.TryGetProperty("finishedAt", out _));
        });
        Assert.Empty(scenes[0].GetProperty("reveals").EnumerateArray());
        var reveal = scenes[1].GetProperty("reveals").EnumerateArray().Single();
        Assert.Equal("The cellar door", reveal.GetProperty("title").GetString());
        Assert.False(reveal.TryGetProperty("subjectId", out _));
        Assert.False(reveal.TryGetProperty("recipients", out _));
    }

    [Fact]
    public async Task Given_a_Player_without_an_Approved_Investigator_When_reading_history_Then_every_Scene_is_listed_with_no_reveals()
    {
        var table = await TableAsync("3");
        await PlayTwoScenesAsync(table);
        var benOid = "history-ben-3";
        await JoinAsPlayerAsync(table.Client, table.CampaignId, table.KeeperOid, benOid);

        var response = await GetHistoryAsync(table, benOid);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var history = await JsonAsync(response);
        Assert.Equal(JsonValueKind.Null, history.GetProperty("investigatorName").ValueKind);
        var scenes = history.GetProperty("scenes").EnumerateArray().ToList();
        Assert.Equal(["The Strange High House", "The Corbitt House"], scenes.Select(scene => scene.GetProperty("title").GetString()).ToList());
        Assert.All(scenes, scene => Assert.Empty(scene.GetProperty("reveals").EnumerateArray()));
    }

    [Fact]
    public async Task Given_callers_who_may_not_read_When_reading_history_Then_anonymous_is_401_and_non_members_are_404()
    {
        var table = await TableAsync("4");

        var anonymous = await table.Client.SendAsync(new HttpRequestMessage(HttpMethod.Get, HistoryUri(table)) { Headers = { { "X-Test-Unauthenticated", "true" } } });
        var stranger = await GetHistoryAsync(table, table.StrangerOid);
        var unknown = await table.Client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{Guid.NewGuid()}/scene-history", table.KeeperOid));

        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, stranger.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
    }

    [Fact]
    public async Task Given_connected_members_When_the_Keeper_plays_Scenes_Then_members_of_that_Campaign_only_hear_sceneHistory_with_activeScene()
    {
        var table = await TableAsync("5");
        var other = await TableAsync("5b");
        var (harvey, _) = await CampaignHubTestClient.SubscribeAsync(_factory, table.HarveyOid, table.CampaignId);
        var (outsider, _) = await CampaignHubTestClient.SubscribeAsync(_factory, other.HarveyOid, other.CampaignId);
        await using var _1 = harvey;
        await using var _2 = outsider;

        await StartAsync(table, table.CorbittHouse, [table.HarveyId, table.LucyId]);
        Assert.Equal(["activeScene", "sceneHistory"], await NextDataChangedTopicsAsync(harvey, table.CampaignId, "wallEntries"));
        await FinishAsync(table);
        Assert.Equal(["activeScene", "sceneHistory"], await NextDataChangedTopicsAsync(harvey, table.CampaignId, "wallEntries"));

        Assert.Empty(await DrainDataChangedAsync(outsider, table.CampaignId));
    }

    // Skips the Wall signals the transitions also send, and returns the topics of the next other CampaignDataChanged message.
    private static async Task<string[]> NextDataChangedTopicsAsync(CampaignHubTestClient client, Guid campaignId, params string[] skipped)
    {
        while (true)
        {
            if (await client.NextMessageAsync() is CampaignDataChangedMessage message && message.CampaignId == campaignId && !message.Topics.SequenceEqual(skipped))
            {
                return message.Topics.ToArray();
            }
        }
    }

    // Reads until the client has been quiet for its receive timeout, and returns the data-changed messages about the Campaign.
    private static async Task<List<CampaignDataChangedMessage>> DrainDataChangedAsync(CampaignHubTestClient client, Guid campaignId)
    {
        var received = new List<CampaignDataChangedMessage>();
        try
        {
            while (true)
            {
                if (await client.NextMessageAsync() is CampaignDataChangedMessage message && message.CampaignId == campaignId)
                {
                    received.Add(message);
                }
            }
        }
        catch (OperationCanceledException)
        {
            return received;
        }
    }
}
