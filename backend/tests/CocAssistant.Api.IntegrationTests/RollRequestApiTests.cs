namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// Requesting rolls in the Active Scene and rolling them (specs/roll-requests/spec.md, API Contracts; PBI-DICE-005):
/// every 400, 404, and 409 with their order, the Keeper-only list, the Player's own list, server dice with the roller named,
/// the non-removable Wall card, and the live signals that reach only the Keeper and the targeted Players.
/// </summary>
public class RollRequestApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public RollRequestApiTests(IdentityApiFactory factory) => _factory = factory;

    public async Task InitializeAsync() => await ResetDatabaseAsync(_factory);

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
        Guid ScenarioId,
        Guid SceneId);

    private async Task<Table> TableAsync(string suffix, bool start = true, bool lucyPresent = true)
    {
        var client = _factory.CreateClient();
        var keeper = $"roll-request-keeper-{suffix}";
        var harveyOid = $"roll-request-harvey-{suffix}";
        var lucyOid = $"roll-request-lucy-{suffix}";
        var campaignId = (await CreateCampaignAsync(client, keeper)).Id;
        await JoinAsPlayerAsync(client, campaignId, keeper, harveyOid);
        await JoinAsPlayerAsync(client, campaignId, keeper, lucyOid);
        var harvey = await CreateApprovedAsync(client, campaignId, keeper, harveyOid, "Harvey Walters");
        var lucy = await CreateApprovedAsync(client, campaignId, keeper, lucyOid, "Lucy Ward");
        var scenario = await CreateAsync(client, $"/api/campaigns/{campaignId}/scenarios", keeper, new { title = "The Haunting" });
        var scene = await CreateAsync(client, $"/api/campaigns/{campaignId}/scenarios/{scenario}/scenes", keeper, new { title = "The Corbitt House", location = "Boston Road" });
        var present = lucyPresent ? new[] { harvey, lucy } : new[] { harvey };
        if (start)
        {
            Assert.Equal(HttpStatusCode.OK, (await StartAsync(client, campaignId, keeper, scene, present)).StatusCode);
        }

        return new Table(client, keeper, harveyOid, lucyOid, $"roll-request-stranger-{suffix}", campaignId, harvey, lucy, scenario, scene);
    }

    private static async Task<Guid> CreateAsync(HttpClient client, string uri, string oid, object body)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, uri, oid, body));
        Assert.True(response.StatusCode is HttpStatusCode.Created or HttpStatusCode.OK, $"POST {uri} answered {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static string CampaignUri(Table table, string suffix) => $"/api/campaigns/{table.CampaignId}{suffix}";

    private static Task<HttpResponseMessage> StartAsync(HttpClient client, Guid campaignId, string keeperOid, Guid sceneId, Guid[] present) =>
        client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/scenes/{sceneId}/start", keeperOid, new { presentInvestigatorIds = present, finishActiveScene = false }));

    private static Task<HttpResponseMessage> FinishAsync(Table table) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, CampaignUri(table, "/active-scene/finish"), table.KeeperOid));

    private static Task<HttpResponseMessage> CreateRollRequestAsync(Table table, object body, string? oid = null) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, CampaignUri(table, "/active-scene/roll-requests"), oid ?? table.KeeperOid, body));

    private static Task<HttpResponseMessage> GetRollRequestAsync(Table table, Guid requestId, string? oid = null) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Get, CampaignUri(table, $"/roll-requests/{requestId}"), oid ?? table.KeeperOid));

    private static Task<HttpResponseMessage> ListActiveSceneRequestsAsync(Table table, string? oid = null) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Get, CampaignUri(table, "/active-scene/roll-requests"), oid ?? table.KeeperOid));

    private static Task<HttpResponseMessage> MineAsync(Table table, string oid) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Get, CampaignUri(table, "/investigators/mine/requested-rolls"), oid));

    private static Task<HttpResponseMessage> RollAsync(Table table, Guid requestId, Guid investigatorId, string? oid = null) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, CampaignUri(table, $"/roll-requests/{requestId}/requested-rolls/{investigatorId}/roll"), oid ?? table.KeeperOid));

    private static object LuckRequest(params Guid[] investigatorIds) =>
        new
        {
            target = new { kind = "Luck" },
            message = "Something moves upstairs.",
            visibility = "Public",
            difficulty = "Regular",
            bonusDice = 0,
            penaltyDice = 0,
            investigators = investigatorIds.Select(id => new { investigatorId = id }).ToArray(),
        };

    private static object SkillRequest(Guid investigatorId) =>
        new
        {
            target = new { kind = "Skill", skill = "Spot Hidden" },
            message = (string?)null,
            visibility = "Public",
            difficulty = "Regular",
            bonusDice = 0,
            penaltyDice = 0,
            investigators = new[] { new { investigatorId } },
        };

    private static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();

    private static string[] Errors(JsonElement problem) => problem.GetProperty("errors").EnumerateObject().Select(error => error.Name).ToArray();

    [Fact]
    public async Task Given_two_Investigators_present_When_the_Keeper_requests_Luck_Then_it_is_201_with_both_Waiting_and_each_Player_sees_theirs()
    {
        var table = await TableAsync("1");

        var created = await CreateRollRequestAsync(table, LuckRequest(table.HarveyId, table.LucyId));

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var request = await JsonAsync(created);
        Assert.Equal("Luck", request.GetProperty("target").GetProperty("kind").GetString());
        var rolls = request.GetProperty("requestedRolls").EnumerateArray().ToArray();
        Assert.Equal([table.HarveyId, table.LucyId], rolls.Select(roll => roll.GetProperty("investigatorId").GetGuid()).ToArray());
        Assert.All(rolls, roll => Assert.Equal("Waiting", roll.GetProperty("status").GetString()));

        var harveyMine = await JsonAsync(await MineAsync(table, table.HarveyOid));
        var waiting = Assert.Single(harveyMine.GetProperty("rolls").EnumerateArray());
        var harveyRoll = rolls.Single(roll => roll.GetProperty("investigatorId").GetGuid() == table.HarveyId);
        Assert.Equal(
            (request.GetProperty("id").GetGuid(), "Something moves upstairs.", harveyRoll.GetProperty("targetValue").GetInt32()),
            (waiting.GetProperty("rollRequestId").GetGuid(), waiting.GetProperty("message").GetString(), waiting.GetProperty("roll").GetProperty("targetValue").GetInt32()));
        var lucyMine = await JsonAsync(await MineAsync(table, table.LucyOid));
        Assert.Equal(1, lucyMine.GetProperty("rolls").GetArrayLength());
    }

    [Fact]
    public async Task Given_a_created_request_When_reading_the_Wall_Then_there_is_one_Public_Roll_Request_card_for_it()
    {
        var table = await TableAsync("2");

        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, LuckRequest(table.HarveyId)))).GetProperty("id").GetGuid();
        var wall = await JsonAsync(await table.Client.SendAsync(BuildRequest(HttpMethod.Get, CampaignUri(table, "/wall-entries"), table.KeeperOid)));

        var entries = wall.GetProperty("entries").EnumerateArray().ToArray();
        var card = Assert.Single(entries, entry => entry.TryGetProperty("rollRequestId", out var id) && id.ValueKind != JsonValueKind.Null);
        Assert.Equal(("RollRequest", requestId, "Public"), (card.GetProperty("kind").GetString(), card.GetProperty("rollRequestId").GetGuid(), card.GetProperty("visibility").GetString()));
    }

    [Fact]
    public async Task Given_a_Player_or_a_stranger_When_creating_Then_it_is_404_and_nothing_is_created()
    {
        var table = await TableAsync("3");

        var asPlayer = await CreateRollRequestAsync(table, LuckRequest(table.HarveyId), table.HarveyOid);
        var asStranger = await CreateRollRequestAsync(table, LuckRequest(table.HarveyId), table.StrangerOid);

        Assert.Equal((HttpStatusCode.NotFound, HttpStatusCode.NotFound), (asPlayer.StatusCode, asStranger.StatusCode));
        Assert.Empty((await JsonAsync(await ListActiveSceneRequestsAsync(table))).EnumerateArray());
    }

    [Fact]
    public async Task Given_no_Active_Scene_When_creating_Then_it_is_409_even_for_an_unknown_target()
    {
        var table = await TableAsync("4", start: false);

        var valid = await CreateRollRequestAsync(table, LuckRequest(table.HarveyId));
        var unknown = await CreateRollRequestAsync(table, new { target = new { kind = "Banana" }, investigators = new[] { new { investigatorId = table.HarveyId } } });

        Assert.All([valid, unknown], response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        Assert.Equal("No Scene is Active.", (await JsonAsync(valid)).GetProperty("title").GetString());
    }

    [Fact]
    public async Task Given_an_Investigator_who_is_not_present_When_creating_Then_it_is_a_400_at_investigators()
    {
        var table = await TableAsync("5", lucyPresent: false);

        var response = await CreateRollRequestAsync(table, LuckRequest(table.LucyId));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Only Investigators present can be asked to roll.", (await JsonAsync(response)).GetProperty("errors").GetProperty("investigators")[0].GetString());
        Assert.Empty((await JsonAsync(await ListActiveSceneRequestsAsync(table))).EnumerateArray());
    }

    [Theory]
    [InlineData("KeeperOnly", "visibility", "Keeper-only rolls arrive in a later update.")]
    [InlineData("Banana", "target", "Choose a skill, a characteristic, or Luck to roll against.")]
    public async Task Given_a_refused_shape_When_creating_Then_it_is_a_400_at_the_field(string visibilityOrKind, string field, string message)
    {
        var table = await TableAsync("6");
        var body = visibilityOrKind == "KeeperOnly"
            ? new { target = new { kind = "Luck" }, visibility = "KeeperOnly", difficulty = "Regular", investigators = new[] { new { investigatorId = table.HarveyId } } }
            : (object)new { target = new { kind = "Banana" }, investigators = new[] { new { investigatorId = table.HarveyId } } };

        var response = await CreateRollRequestAsync(table, body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(message, (await JsonAsync(response)).GetProperty("errors").GetProperty(field)[0].GetString());
    }

    [Theory]
    [InlineData("Spot Hidden", null, "difficulty", "Nightmare", "Choose Regular, Hard, or Extreme difficulty.")]
    public async Task Given_an_unknown_Difficulty_When_creating_Then_it_is_a_400_at_difficulty(string skill, string? specialization, string field, string difficulty, string message)
    {
        var table = await TableAsync("7");

        var response = await CreateRollRequestAsync(table, new { target = new { kind = "Skill", skill, specialization }, difficulty, investigators = new[] { new { investigatorId = table.HarveyId } } });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(message, (await JsonAsync(response)).GetProperty("errors").GetProperty(field)[0].GetString());
    }

    [Fact]
    public async Task Given_Luck_with_Hard_or_dice_When_creating_Then_it_is_a_400_and_a_skill_uses_its_sheet_value()
    {
        var table = await TableAsync("8");

        var hard = await CreateRollRequestAsync(table, new { target = new { kind = "Luck" }, difficulty = "Hard", investigators = new[] { new { investigatorId = table.HarveyId } } });
        var diced = await CreateRollRequestAsync(table, new { target = new { kind = "Luck" }, bonusDice = 1, investigators = new[] { new { investigatorId = table.HarveyId } } });

        Assert.All([hard, diced], response => Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode));
        Assert.Contains("errors", await hard.Content.ReadAsStringAsync(), StringComparison.Ordinal);

        var skill = await JsonAsync(await CreateRollRequestAsync(table, SkillRequest(table.HarveyId)));
        var roll = Assert.Single(skill.GetProperty("requestedRolls").EnumerateArray());
        Assert.Equal((45, false), (roll.GetProperty("targetValue").GetInt32(), roll.GetProperty("usesBaseValue").GetBoolean()));
    }

    [Fact]
    public async Task Given_a_Player_When_reading_the_Keeper_list_Then_it_is_404_and_the_Keeper_sees_the_request()
    {
        var table = await TableAsync("9");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, LuckRequest(table.HarveyId)))).GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.NotFound, (await ListActiveSceneRequestsAsync(table, table.HarveyOid)).StatusCode);
        var keeper = await JsonAsync(await ListActiveSceneRequestsAsync(table));
        Assert.Equal([requestId], keeper.EnumerateArray().Select(request => request.GetProperty("id").GetGuid()).ToArray());
    }

    [Fact]
    public async Task Given_no_Active_Scene_When_reading_lists_Then_they_are_empty()
    {
        var table = await TableAsync("10", start: false);

        Assert.Empty((await JsonAsync(await ListActiveSceneRequestsAsync(table))).EnumerateArray());
        Assert.Empty((await JsonAsync(await MineAsync(table, table.HarveyOid))).GetProperty("rolls").EnumerateArray());
    }

    [Fact]
    public async Task Given_a_Player_without_an_Investigator_When_reading_mine_Then_it_is_404()
    {
        var table = await TableAsync("11");

        Assert.Equal(HttpStatusCode.NotFound, (await MineAsync(table, table.StrangerOid)).StatusCode);
    }

    [Fact]
    public async Task Given_their_own_Waiting_roll_When_a_Player_rolls_Then_every_member_sees_faces_targets_outcome_and_roller_without_reloading()
    {
        var table = await TableAsync("12");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, SkillRequest(table.HarveyId)))).GetProperty("id").GetGuid();

        var rolled = await RollAsync(table, requestId, table.HarveyId, table.HarveyOid);

        Assert.Equal(HttpStatusCode.OK, rolled.StatusCode);
        var roll = await JsonAsync(rolled);
        Assert.Equal("Rolled", roll.GetProperty("status").GetString());
        var record = Assert.Single(roll.GetProperty("rolls").EnumerateArray());
        Assert.Equal($"Account {table.HarveyOid}", record.GetProperty("rolledBy").GetString());
        Assert.NotNull(record.GetProperty("percentile").GetProperty("successLevel").GetString());

        var card = await JsonAsync(await GetRollRequestAsync(table, requestId, table.LucyOid));
        var cardRoll = Assert.Single(card.GetProperty("requestedRolls").EnumerateArray());
        Assert.Equal("Rolled", cardRoll.GetProperty("status").GetString());
        Assert.Equal(record.GetRawText(), cardRoll.GetProperty("rolls")[0].GetRawText());
    }

    [Fact]
    public async Task Given_anothers_roll_When_a_Player_rolls_Then_it_is_404_and_the_roll_is_still_Waiting()
    {
        var table = await TableAsync("13");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, LuckRequest(table.HarveyId, table.LucyId)))).GetProperty("id").GetGuid();

        var response = await RollAsync(table, requestId, table.LucyId, table.HarveyOid);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var card = await JsonAsync(await GetRollRequestAsync(table, requestId));
        Assert.All(card.GetProperty("requestedRolls").EnumerateArray(), roll => Assert.Equal("Waiting", roll.GetProperty("status").GetString()));
    }

    [Fact]
    public async Task Given_a_second_roll_When_rolling_again_Then_it_is_409_with_one_result()
    {
        var table = await TableAsync("14");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, LuckRequest(table.HarveyId)))).GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await RollAsync(table, requestId, table.HarveyId)).StatusCode);

        var again = await RollAsync(table, requestId, table.HarveyId);

        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        var roll = Assert.Single((await JsonAsync(await GetRollRequestAsync(table, requestId))).GetProperty("requestedRolls").EnumerateArray());
        Assert.Equal(1, roll.GetProperty("rolls").GetArrayLength());
    }

    [Fact]
    public async Task Given_a_finished_Scene_When_rolling_Then_it_is_409()
    {
        var table = await TableAsync("15");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, LuckRequest(table.HarveyId)))).GetProperty("id").GetGuid();
        await FinishAsync(table);

        Assert.Equal(HttpStatusCode.Conflict, (await RollAsync(table, requestId, table.HarveyId)).StatusCode);
    }

    [Fact]
    public async Task Given_a_Roll_Request_card_When_the_Keeper_removes_it_Then_it_is_409_and_the_card_stays()
    {
        var table = await TableAsync("16");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, LuckRequest(table.HarveyId)))).GetProperty("id").GetGuid();
        var entryId = (await JsonAsync(await table.Client.SendAsync(BuildRequest(HttpMethod.Get, CampaignUri(table, "/wall-entries"), table.KeeperOid))))
            .GetProperty("entries").EnumerateArray().Single(entry => entry.TryGetProperty("rollRequestId", out var id) && id.ValueKind != JsonValueKind.Null && id.GetGuid() == requestId).GetProperty("id").GetGuid();

        var removed = await table.Client.SendAsync(BuildRequest(HttpMethod.Delete, CampaignUri(table, $"/wall-entries/{entryId}"), table.KeeperOid));

        Assert.Equal(HttpStatusCode.Conflict, removed.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await GetRollRequestAsync(table, requestId)).StatusCode);
    }

    [Fact]
    public async Task Given_connected_members_When_the_Keeper_requests_and_rolls_Then_only_the_Keeper_and_the_targeted_Player_are_signalled()
    {
        var table = await TableAsync("17");
        var (keeperHub, _) = await CampaignHubTestClient.SubscribeAsync(_factory, table.KeeperOid, table.CampaignId);
        var (harveyHub, _) = await CampaignHubTestClient.SubscribeAsync(_factory, table.HarveyOid, table.CampaignId);
        var (lucyHub, _) = await CampaignHubTestClient.SubscribeAsync(_factory, table.LucyOid, table.CampaignId);
        await using var _1 = keeperHub;
        await using var _2 = harveyHub;
        await using var _3 = lucyHub;

        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, LuckRequest(table.HarveyId)))).GetProperty("id").GetGuid();
        await RollAsync(table, requestId, table.HarveyId);
        await table.Client.SendAsync(BuildRequest(HttpMethod.Put, CampaignUri(table, "/active-scene/present-investigators"), table.KeeperOid, new { presentInvestigatorIds = new[] { table.HarveyId, table.LucyId } }));

        Assert.Equal("wallEntries|rollRequests|rollRequests", await TopicsUntilActiveSceneAsync(keeperHub, table.CampaignId));
        Assert.Equal("wallEntries|rollRequests|myRequestedRolls|rollRequests|myRequestedRolls", await TopicsUntilActiveSceneAsync(harveyHub, table.CampaignId));
        Assert.Equal("wallEntries|rollRequests|rollRequests", await TopicsUntilActiveSceneAsync(lucyHub, table.CampaignId));
    }

    // The activeScene and sceneHistory signals are sent after the change and in order on every connection, so everything
    // a client heard before them is what the change sent.
    private static async Task<string> TopicsUntilActiveSceneAsync(CampaignHubTestClient client, Guid campaignId)
    {
        var before = new List<string>();
        while (true)
        {
            if (await client.NextMessageAsync() is CampaignDataChangedMessage message && message.CampaignId == campaignId)
            {
                var topics = message.Topics.ToArray();
                if (topics.SequenceEqual(["activeScene", "sceneHistory"]))
                {
                    return string.Join('|', before);
                }

                before.Add(string.Join(',', topics));
            }
        }
    }
}
