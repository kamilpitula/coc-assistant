namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Active Scene API (specs/scene-play/spec.md, API Contracts, Scenarios): the lifecycle, every 400 and 409 with their order, the
/// three read shapes, the Wall Entries, the hub signal, concurrency, and Campaign isolation. Authorization for every route is in
/// ScenePlayAuthorizationMatrixTests.
/// </summary>
public class ActiveSceneApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public ActiveSceneApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private sealed record Table(
        HttpClient Client,
        string KeeperOid,
        string HarveyOid,
        string LucyOid,
        Guid CampaignId,
        Guid HarveyId,
        Guid LucyId,
        Guid ScenarioId,
        Guid MeetingKnott,
        Guid CorbittHouse);

    private async Task<Table> TableAsync(string suffix)
    {
        var client = _factory.CreateClient();
        var keeper = $"active-keeper-{suffix}";
        var harveyOid = $"active-harvey-{suffix}";
        var lucyOid = $"active-lucy-{suffix}";
        var campaignId = (await CreateCampaignAsync(client, keeper)).Id;
        await JoinAsPlayerAsync(client, campaignId, keeper, harveyOid);
        await JoinAsPlayerAsync(client, campaignId, keeper, lucyOid);
        var harvey = await CreateApprovedAsync(client, campaignId, keeper, harveyOid, "Harvey Walters");
        var lucy = await CreateApprovedAsync(client, campaignId, keeper, lucyOid, "Lucy Ward");
        var scenario = await CreateAsync(client, $"/api/campaigns/{campaignId}/scenarios", keeper, new { title = "The Haunting" });
        var scenes = $"/api/campaigns/{campaignId}/scenarios/{scenario}/scenes";
        var meetingKnott = await CreateAsync(client, scenes, keeper, new { title = "Meeting Knott", location = "Arkham" });
        var corbittHouse = await CreateAsync(client, scenes, keeper, new { title = "The Corbitt House", location = "Boston Road" });
        return new Table(client, keeper, harveyOid, lucyOid, campaignId, harvey, lucy, scenario, meetingKnott, corbittHouse);
    }

    private static async Task<Guid> CreateAsync(HttpClient client, string uri, string oid, object body)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, uri, oid, body));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static string StartUri(Table table, Guid sceneId) => $"/api/campaigns/{table.CampaignId}/scenes/{sceneId}/start";

    private static string ActiveUri(Table table) => $"/api/campaigns/{table.CampaignId}/active-scene";

    private static Task<HttpResponseMessage> StartAsync(Table table, Guid sceneId, Guid[] present, bool finishActiveScene = false, string? oid = null) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, StartUri(table, sceneId), oid ?? table.KeeperOid, new { presentInvestigatorIds = present, finishActiveScene }));

    private static Task<HttpResponseMessage> FinishAsync(Table table) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, ActiveUri(table) + "/finish", table.KeeperOid));

    private static Task<HttpResponseMessage> ChangePresentAsync(Table table, Guid[] present) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Put, ActiveUri(table) + "/present-investigators", table.KeeperOid, new { presentInvestigatorIds = present }));

    private static Task<HttpResponseMessage> GetActiveAsync(Table table, string oid) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Get, ActiveUri(table), oid));

    private static async Task<JsonElement> JsonAsync(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>();

    private static async Task<string> TitleAsync(HttpResponseMessage response) => (await JsonAsync(response)).GetProperty("title").GetString()!;

    private static async Task<string> SceneStatusAsync(Table table, Guid sceneId)
    {
        var response = await table.Client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{table.CampaignId}/scenarios/{table.ScenarioId}/scenes/{sceneId}", table.KeeperOid));
        return (await JsonAsync(response)).GetProperty("status").GetString()!;
    }

    private static async Task<List<string>> WallTextsAsync(Table table, string oid)
    {
        var response = await table.Client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{table.CampaignId}/wall-entries", oid));
        var page = await JsonAsync(response);
        return page.GetProperty("entries").EnumerateArray().Select(entry => entry.GetProperty("text").GetString()!).ToList();
    }

    [Fact]
    public async Task Given_the_Keeper_When_starting_reading_and_finishing_a_Scene_Then_each_step_answers_its_shape_and_the_Wall_names_the_title()
    {
        var table = await TableAsync("1");

        var start = await StartAsync(table, table.CorbittHouse, [table.HarveyId, table.LucyId]);
        var keeperRead = await GetActiveAsync(table, table.KeeperOid);
        var finish = await FinishAsync(table);
        var afterFinish = await GetActiveAsync(table, table.KeeperOid);

        Assert.Equal(HttpStatusCode.OK, start.StatusCode);
        var started = await JsonAsync(start);
        Assert.Equal(("The Corbitt House", "The Haunting", "Boston Road"), (started.GetProperty("title").GetString(), started.GetProperty("scenarioTitle").GetString(), started.GetProperty("location").GetString()));
        Assert.Equal(["Harvey Walters", "Lucy Ward"], started.GetProperty("investigatorsPresent").EnumerateArray().Select(investigator => investigator.GetProperty("name").GetString()).ToArray());
        Assert.Equal(JsonValueKind.Array, started.GetProperty("reveals").ValueKind);
        Assert.Equal(0, started.GetProperty("reveals").GetArrayLength());
        Assert.Equal(started.GetRawText(), (await JsonAsync(keeperRead)).GetRawText());
        Assert.Equal(HttpStatusCode.NoContent, finish.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, afterFinish.StatusCode);
        Assert.Equal("Finished", await SceneStatusAsync(table, table.CorbittHouse));
        Assert.Equal(["Scene finished: The Corbitt House", "Scene started: The Corbitt House"], (await WallTextsAsync(table, table.HarveyOid)).Order().ToArray());
    }

    [Fact]
    public async Task Given_two_Prepared_Scenes_When_starting_the_later_one_Then_the_earlier_stays_Prepared()
    {
        var table = await TableAsync("2");

        Assert.Equal(HttpStatusCode.OK, (await StartAsync(table, table.CorbittHouse, [table.HarveyId])).StatusCode);

        Assert.Equal("Prepared", await SceneStatusAsync(table, table.MeetingKnott));
        Assert.Equal("Active", await SceneStatusAsync(table, table.CorbittHouse));
    }

    [Fact]
    public async Task Given_an_Active_Scene_When_starting_another_without_finishing_Then_it_is_a_409_and_nothing_changes()
    {
        var table = await TableAsync("3");
        await StartAsync(table, table.MeetingKnott, [table.HarveyId]);

        var refused = await StartAsync(table, table.CorbittHouse, [table.HarveyId]);

        Assert.Equal(HttpStatusCode.Conflict, refused.StatusCode);
        Assert.Equal("Another Scene is Active.", await TitleAsync(refused));
        Assert.Equal(("Active", "Prepared"), (await SceneStatusAsync(table, table.MeetingKnott), await SceneStatusAsync(table, table.CorbittHouse)));
    }

    [Fact]
    public async Task Given_an_Active_Scene_When_starting_another_and_asking_to_finish_Then_the_old_is_Finished_the_new_Active_and_both_entries_exist()
    {
        var table = await TableAsync("4");
        await StartAsync(table, table.MeetingKnott, [table.HarveyId]);

        var response = await StartAsync(table, table.CorbittHouse, [table.LucyId], finishActiveScene: true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(("Finished", "Active"), (await SceneStatusAsync(table, table.MeetingKnott), await SceneStatusAsync(table, table.CorbittHouse)));
        var wall = await WallTextsAsync(table, table.LucyOid);
        Assert.Contains("Scene finished: Meeting Knott", wall);
        Assert.Contains("Scene started: The Corbitt House", wall);
    }

    [Fact]
    public async Task Given_an_unacceptable_present_list_When_starting_Then_it_is_a_400_keyed_presentInvestigatorIds_and_no_Scene_is_Active()
    {
        var table = await TableAsync("5");
        var otherCampaign = (await CreateCampaignAsync(table.Client, table.KeeperOid + "-b")).Id;
        await JoinAsPlayerAsync(table.Client, otherCampaign, table.KeeperOid + "-b", table.HarveyOid + "-b");
        var foreign = await CreateApprovedAsync(table.Client, otherCampaign, table.KeeperOid + "-b", table.HarveyOid + "-b", "Foreign Investigator");

        foreach (var list in new[] { Array.Empty<Guid>(), [table.HarveyId, table.HarveyId], [Guid.NewGuid()], [foreign] })
        {
            var response = await StartAsync(table, table.CorbittHouse, list);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Contains("presentInvestigatorIds", (await JsonAsync(response)).GetProperty("errors").EnumerateObject().Select(property => property.Name));
        }

        Assert.Equal(HttpStatusCode.NoContent, (await GetActiveAsync(table, table.KeeperOid)).StatusCode);
        Assert.Equal("Prepared", await SceneStatusAsync(table, table.CorbittHouse));
    }

    [Fact]
    public async Task Given_a_Submitted_Investigator_When_starting_with_it_present_Then_it_is_a_400_and_no_Scene_is_Active()
    {
        var table = await TableAsync("6");
        await JoinAsPlayerAsync(table.Client, table.CampaignId, table.KeeperOid, "active-third-6");
        var submitted = await CreateSubmittedAsync(table.Client, table.CampaignId, "active-third-6", "Submitted One");

        var response = await StartAsync(table, table.CorbittHouse, [table.HarveyId, submitted]);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await GetActiveAsync(table, table.KeeperOid)).StatusCode);
    }

    [Fact]
    public async Task Given_several_failures_at_once_When_starting_Then_the_error_order_is_404_then_409_not_prepared_then_409_active_then_400()
    {
        var table = await TableAsync("7");

        Assert.Equal(HttpStatusCode.NotFound, (await StartAsync(table, Guid.NewGuid(), [])).StatusCode);
        await StartAsync(table, table.MeetingKnott, [table.HarveyId]);
        var notPrepared = await StartAsync(table, table.MeetingKnott, []);
        Assert.Equal(HttpStatusCode.Conflict, notPrepared.StatusCode);
        Assert.Equal("Only a Prepared Scene can be started.", await TitleAsync(notPrepared));
        var activeExists = await StartAsync(table, table.CorbittHouse, []);
        Assert.Equal(HttpStatusCode.Conflict, activeExists.StatusCode);
        Assert.Equal("Another Scene is Active.", await TitleAsync(activeExists));
        Assert.Equal(HttpStatusCode.BadRequest, (await StartAsync(table, table.CorbittHouse, [], finishActiveScene: true)).StatusCode);
        Assert.Equal("Active", await SceneStatusAsync(table, table.MeetingKnott));
    }

    [Fact]
    public async Task Given_no_Active_Scene_When_finishing_or_changing_who_is_present_Then_both_are_409()
    {
        var table = await TableAsync("8");

        Assert.Equal(HttpStatusCode.Conflict, (await FinishAsync(table)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await ChangePresentAsync(table, [table.HarveyId])).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await ChangePresentAsync(table, [])).StatusCode);
    }

    [Fact]
    public async Task Given_an_Active_Scene_When_the_Keeper_changes_who_is_present_Then_the_new_set_is_read_back_and_a_bad_list_is_a_400()
    {
        var table = await TableAsync("9");
        await StartAsync(table, table.CorbittHouse, [table.HarveyId]);

        var changed = await ChangePresentAsync(table, [table.LucyId]);
        var bad = await ChangePresentAsync(table, []);
        var read = await JsonAsync(await GetActiveAsync(table, table.KeeperOid));

        Assert.Equal(HttpStatusCode.OK, changed.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        Assert.Equal(["Lucy Ward"], read.GetProperty("investigatorsPresent").EnumerateArray().Select(investigator => investigator.GetProperty("name").GetString()).ToArray());
        Assert.Equal(["Scene started: The Corbitt House"], await WallTextsAsync(table, table.HarveyOid));
    }

    [Fact]
    public async Task Given_an_Active_Scene_When_Players_read_it_Then_a_present_Player_sees_names_without_ids_and_another_sees_only_the_title()
    {
        var table = await TableAsync("10");
        await StartAsync(table, table.CorbittHouse, [table.HarveyId]);

        var present = await JsonAsync(await GetActiveAsync(table, table.HarveyOid));
        var absentResponse = await GetActiveAsync(table, table.LucyOid);
        var absentBody = await absentResponse.Content.ReadAsStringAsync();

        Assert.Equal(("The Corbitt House", "Boston Road", true), (present.GetProperty("title").GetString(), present.GetProperty("location").GetString(), present.GetProperty("isPresent").GetBoolean()));
        var only = Assert.Single(present.GetProperty("investigatorsPresent").EnumerateArray());
        Assert.Equal(("Harvey Walters", true), (only.GetProperty("name").GetString(), only.GetProperty("isYours").GetBoolean()));
        Assert.Equal(["isYours", "name"], only.EnumerateObject().Select(property => property.Name).Order().ToArray());
        Assert.DoesNotContain(table.HarveyId.ToString(), present.GetRawText(), StringComparison.OrdinalIgnoreCase);
        Assert.Equal(0, present.GetProperty("reveals").GetArrayLength());
        Assert.Equal(["isPresent", "title"], JsonDocument.Parse(absentBody).RootElement.EnumerateObject().Select(property => property.Name).Order().ToArray());
        Assert.False(JsonDocument.Parse(absentBody).RootElement.GetProperty("isPresent").GetBoolean());
    }

    [Fact]
    public async Task Given_a_Scene_with_a_Player_facing_Handout_When_it_is_started_Then_a_present_Player_sees_no_Handout()
    {
        var table = await TableAsync("11");
        var handout = PreparedScenarioSeed.HandoutBody("start", "ReadAloud", "PlayerFacing");
        var created = await table.Client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{table.CampaignId}/scenarios/{table.ScenarioId}/scenes/{table.CorbittHouse}/handouts", table.KeeperOid, handout));
        created.EnsureSuccessStatusCode();
        await StartAsync(table, table.CorbittHouse, [table.HarveyId]);

        var body = await (await GetActiveAsync(table, table.HarveyOid)).Content.ReadAsStringAsync();

        Assert.DoesNotContain(PreparedScenarioSeed.SecretPrefix, body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Given_a_Player_When_running_the_Scene_Then_every_write_is_404_and_nothing_changes()
    {
        var table = await TableAsync("12");
        await StartAsync(table, table.MeetingKnott, [table.HarveyId]);

        Assert.Equal(HttpStatusCode.NotFound, (await StartAsync(table, table.CorbittHouse, [table.HarveyId], true, table.HarveyOid)).StatusCode);
        var finish = await table.Client.SendAsync(BuildRequest(HttpMethod.Post, ActiveUri(table) + "/finish", table.HarveyOid));
        Assert.Equal(HttpStatusCode.NotFound, finish.StatusCode);
        var change = await table.Client.SendAsync(BuildRequest(HttpMethod.Put, ActiveUri(table) + "/present-investigators", table.HarveyOid, new { presentInvestigatorIds = new[] { table.LucyId } }));
        Assert.Equal(HttpStatusCode.NotFound, change.StatusCode);
        Assert.Equal(("Active", "Prepared"), (await SceneStatusAsync(table, table.MeetingKnott), await SceneStatusAsync(table, table.CorbittHouse)));
    }

    [Fact]
    public async Task Given_an_Active_Scene_in_Campaign_A_When_a_member_of_Campaign_B_asks_Then_every_call_is_404()
    {
        var a = await TableAsync("13a");
        var b = await TableAsync("13b");
        await StartAsync(a, a.CorbittHouse, [a.HarveyId]);

        var read = await b.Client.SendAsync(BuildRequest(HttpMethod.Get, ActiveUri(a), b.KeeperOid));
        var startForeignScene = await b.Client.SendAsync(BuildRequest(HttpMethod.Post, StartUri(b, a.MeetingKnott), b.KeeperOid, new { presentInvestigatorIds = new[] { b.HarveyId }, finishActiveScene = false }));

        Assert.Equal(HttpStatusCode.NotFound, read.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, startForeignScene.StatusCode);
        Assert.Equal("Prepared", await SceneStatusAsync(a, a.MeetingKnott));
    }

    [Fact]
    public async Task Given_two_different_Scenes_started_at_the_same_time_When_both_arrive_Then_exactly_one_is_Active_and_the_other_is_409()
    {
        var table = await TableAsync("14");

        var responses = await Task.WhenAll(
            StartAsync(table, table.MeetingKnott, [table.HarveyId]),
            StartAsync(table, table.CorbittHouse, [table.LucyId]));

        Assert.Equal([HttpStatusCode.OK, HttpStatusCode.Conflict], responses.Select(response => response.StatusCode).Order().ToArray());
        var statuses = new[] { await SceneStatusAsync(table, table.MeetingKnott), await SceneStatusAsync(table, table.CorbittHouse) };
        Assert.Equal(1, statuses.Count(status => status == "Active"));
    }

    [Fact]
    public async Task Given_the_same_Scene_started_at_the_same_time_with_the_same_list_When_both_arrive_Then_exactly_one_wins()
    {
        var table = await TableAsync("15");

        var responses = await Task.WhenAll(
            StartAsync(table, table.CorbittHouse, [table.HarveyId, table.LucyId]),
            StartAsync(table, table.CorbittHouse, [table.HarveyId, table.LucyId]));

        Assert.Equal([HttpStatusCode.OK, HttpStatusCode.Conflict], responses.Select(response => response.StatusCode).Order().ToArray());
        Assert.Equal(2, (await JsonAsync(await GetActiveAsync(table, table.KeeperOid))).GetProperty("investigatorsPresent").GetArrayLength());
    }

    [Fact]
    public async Task Given_a_finish_then_start_racing_a_plain_finish_When_both_arrive_Then_the_Campaign_never_has_two_Active_Scenes()
    {
        var table = await TableAsync("16");
        await StartAsync(table, table.MeetingKnott, [table.HarveyId]);

        var responses = await Task.WhenAll(StartAsync(table, table.CorbittHouse, [table.LucyId], finishActiveScene: true), FinishAsync(table));

        Assert.All(responses, response => Assert.Contains(response.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.NoContent, HttpStatusCode.Conflict }));
        var statuses = new[] { await SceneStatusAsync(table, table.MeetingKnott), await SceneStatusAsync(table, table.CorbittHouse) };
        Assert.True(statuses.Count(status => status == "Active") <= 1);
        Assert.Equal("Finished", statuses[0]);
    }

    [Fact]
    public async Task Given_connected_members_When_the_Keeper_starts_changes_and_finishes_Then_members_of_that_Campaign_only_hear_activeScene()
    {
        var table = await TableAsync("17");
        var other = await TableAsync("17b");
        var (harvey, _) = await CampaignHubTestClient.SubscribeAsync(_factory, table.HarveyOid, table.CampaignId);
        var (outsider, _) = await CampaignHubTestClient.SubscribeAsync(_factory, other.HarveyOid, other.CampaignId);
        await using var _1 = harvey;
        await using var _2 = outsider;

        await StartAsync(table, table.CorbittHouse, [table.HarveyId]);
        Assert.Equal(["activeScene"], await NextDataChangedTopicsAsync(harvey, table.CampaignId, "wallEntries"));
        await ChangePresentAsync(table, [table.LucyId]);
        Assert.Equal(["activeScene"], await NextDataChangedTopicsAsync(harvey, table.CampaignId));
        await FinishAsync(table);
        Assert.Equal(["activeScene"], await NextDataChangedTopicsAsync(harvey, table.CampaignId, "wallEntries"));

        Assert.Empty(await DrainDataChangedAsync(outsider, table.CampaignId));
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

    // Skips the Wall signals the transition also sends, and returns the topics of the next other CampaignDataChanged message.
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
}
