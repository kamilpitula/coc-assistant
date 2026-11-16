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

    private static Task<HttpResponseMessage> CancelAsync(Table table, Guid requestId, Guid investigatorId, string? oid = null) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, CampaignUri(table, $"/roll-requests/{requestId}/requested-rolls/{investigatorId}/cancel"), oid ?? table.KeeperOid));

    private static Task<HttpResponseMessage> PushableAsync(Table table, string oid) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Get, CampaignUri(table, "/investigators/mine/pushable-rolls"), oid));

    private static Task<HttpResponseMessage> AskPushAsync(Table table, Guid requestId, Guid investigatorId, object body, string? oid = null) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, CampaignUri(table, $"/roll-requests/{requestId}/requested-rolls/{investigatorId}/push"), oid ?? table.HarveyOid, body));

    private static Task<HttpResponseMessage> ApprovePushAsync(Table table, Guid requestId, Guid investigatorId, object body) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, CampaignUri(table, $"/roll-requests/{requestId}/requested-rolls/{investigatorId}/push/approve"), table.KeeperOid, body));

    private static Task<HttpResponseMessage> DeclinePushAsync(Table table, Guid requestId, Guid investigatorId, string? oid = null) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, CampaignUri(table, $"/roll-requests/{requestId}/requested-rolls/{investigatorId}/push/decline"), oid ?? table.KeeperOid, body: new { }));

    private static Task<HttpResponseMessage> ChangePresentAsync(Table table, Guid[] present) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Put, CampaignUri(table, "/active-scene/present-investigators"), table.KeeperOid, new { presentInvestigatorIds = present }));

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

    private static object HiddenLuckRequest(Guid investigatorId) =>
        new
        {
            target = new { kind = "Luck" },
            message = "Something moves upstairs.",
            visibility = "KeeperOnly",
            difficulty = "Regular",
            bonusDice = 0,
            penaltyDice = 0,
            investigators = new[] { new { investigatorId } },
        };

    private static bool HasRollRequest(JsonElement entry, Guid requestId) =>
        entry.TryGetProperty("rollRequestId", out var id) && id.ValueKind != JsonValueKind.Null && id.GetGuid() == requestId;

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

    private static object MythosRequest(Guid investigatorId) =>
        new
        {
            target = new { kind = "Skill", skill = "Cthulhu Mythos" },
            message = (string?)null,
            visibility = "Public",
            difficulty = "Regular",
            bonusDice = 0,
            penaltyDice = 2,
            investigators = new[] { new { investigatorId } },
        };

    // Cthulhu Mythos starts at 0 (project_ruleset.md section 4.7), so with 2 Penalty Dice only a triple-zero tens keep
    // with a units 1 succeeds. The loop is a safety net, not the plan.
    private static async Task<Guid> FailedRollRequestAsync(Table table)
    {
        for (var attempt = 0; attempt < 3; attempt++)
        {
            var requestId = (await JsonAsync(await CreateRollRequestAsync(table, MythosRequest(table.HarveyId)))).GetProperty("id").GetGuid();
            var record = ((await JsonAsync(await RollAsync(table, requestId, table.HarveyId, table.HarveyOid))).GetProperty("rolls")[0]);
            if (!record.GetProperty("percentile").GetProperty("isSuccess").GetBoolean())
            {
                return requestId;
            }
        }

        Assert.Fail("Cthulhu Mythos with 2 Penalty Dice never failed in 3 attempts.");
        throw new InvalidOperationException("Unreachable.");
    }

    private static async Task<Guid> SuccessfulRollRequestAsync(Table table)
    {
        for (var attempt = 0; attempt < 12; attempt++)
        {
            var requestId = (await JsonAsync(await CreateRollRequestAsync(table, SkillRequest(table.HarveyId)))).GetProperty("id").GetGuid();
            var record = ((await JsonAsync(await RollAsync(table, requestId, table.HarveyId, table.HarveyOid))).GetProperty("rolls")[0]);
            if (record.GetProperty("percentile").GetProperty("isSuccess").GetBoolean())
            {
                return requestId;
            }
        }

        Assert.Fail("Spot Hidden at 45 never succeeded in 12 attempts.");
        throw new InvalidOperationException("Unreachable.");
    }

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
        Assert.Equal(request.GetProperty("createdAt").GetString(), waiting.GetProperty("createdAt").GetString());
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

    [Fact]
    public async Task Given_KeeperOnly_When_the_Keeper_creates_Then_it_is_201_with_every_roll_Rolled_and_the_Keeper_as_roller()
    {
        var table = await TableAsync("6");

        var response = await CreateRollRequestAsync(table, HiddenLuckRequest(table.HarveyId));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var request = await JsonAsync(response);
        Assert.Equal("KeeperOnly", request.GetProperty("visibility").GetString());
        var roll = Assert.Single(request.GetProperty("requestedRolls").EnumerateArray());
        Assert.Equal("Rolled", roll.GetProperty("status").GetString());
        var record = Assert.Single(roll.GetProperty("rolls").EnumerateArray());
        Assert.Equal($"Account {table.KeeperOid}", record.GetProperty("rolledBy").GetString());
    }

    [Fact]
    public async Task Given_a_KeeperOnly_request_When_a_Player_reads_or_rolls_Then_it_is_404()
    {
        var table = await TableAsync("6b");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, HiddenLuckRequest(table.HarveyId)))).GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.NotFound, (await GetRollRequestAsync(table, requestId, table.HarveyOid)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await RollAsync(table, requestId, table.HarveyId, table.HarveyOid)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await GetRollRequestAsync(table, requestId)).StatusCode);
    }

    [Fact]
    public async Task Given_a_KeeperOnly_request_When_a_Player_reads_mine_or_the_Wall_Then_it_is_left_out()
    {
        var table = await TableAsync("6c");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, HiddenLuckRequest(table.HarveyId)))).GetProperty("id").GetGuid();

        Assert.Empty((await JsonAsync(await MineAsync(table, table.HarveyOid))).GetProperty("rolls").EnumerateArray());
        var playerWall = await JsonAsync(await table.Client.SendAsync(BuildRequest(HttpMethod.Get, CampaignUri(table, "/wall-entries"), table.HarveyOid)));
        Assert.DoesNotContain(playerWall.GetProperty("entries").EnumerateArray(), entry => HasRollRequest(entry, requestId));
        var keeperWall = await JsonAsync(await table.Client.SendAsync(BuildRequest(HttpMethod.Get, CampaignUri(table, "/wall-entries"), table.KeeperOid)));
        var card = Assert.Single(keeperWall.GetProperty("entries").EnumerateArray(), entry => HasRollRequest(entry, requestId));
        Assert.Equal("KeeperOnly", card.GetProperty("visibility").GetString());
    }

    [Fact]
    public async Task Given_a_refused_shape_When_creating_Then_it_is_a_400_at_the_field()
    {
        var table = await TableAsync("6d");

        var response = await CreateRollRequestAsync(table, new { target = new { kind = "Banana" }, investigators = new[] { new { investigatorId = table.HarveyId } } });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(
            "Choose a skill, a characteristic, or Luck to roll against.",
            (await JsonAsync(response)).GetProperty("errors").GetProperty("target")[0].GetString());
    }

    [Fact]
    public async Task Given_an_unknown_visibility_When_creating_Then_it_is_a_400_at_visibility()
    {
        var table = await TableAsync("6e");
        var body = new
        {
            target = new { kind = "Luck" },
            visibility = "Banana",
            difficulty = "Regular",
            investigators = new[] { new { investigatorId = table.HarveyId } },
        };

        var response = await CreateRollRequestAsync(table, body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(
            "Choose Public or Keeper only visibility.",
            (await JsonAsync(response)).GetProperty("errors").GetProperty("visibility")[0].GetString());
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
    public async Task Given_a_Waiting_roll_When_the_Keeper_cancels_Then_it_is_200_Cancelled_and_leaves_lists_and_badges()
    {
        var table = await TableAsync("cancel-1");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, SkillRequest(table.HarveyId)))).GetProperty("id").GetGuid();

        var cancelled = await CancelAsync(table, requestId, table.HarveyId);

        Assert.Equal(HttpStatusCode.OK, cancelled.StatusCode);
        var roll = await JsonAsync(cancelled);
        Assert.Equal(("Cancelled", 0), (roll.GetProperty("status").GetString(), roll.GetProperty("rolls").GetArrayLength()));
        var cardRoll = Assert.Single((await JsonAsync(await GetRollRequestAsync(table, requestId))).GetProperty("requestedRolls").EnumerateArray());
        Assert.Equal("Cancelled", cardRoll.GetProperty("status").GetString());
        var keeperList = await JsonAsync(await ListActiveSceneRequestsAsync(table));
        Assert.Equal("Cancelled", keeperList.EnumerateArray().Single().GetProperty("requestedRolls")[0].GetProperty("status").GetString());
        var mine = await MineAsync(table, table.HarveyOid);
        Assert.Equal(0, (await JsonAsync(mine)).GetProperty("rolls").GetArrayLength());
    }

    [Fact]
    public async Task Given_a_Player_When_cancelling_Then_it_is_404_and_the_roll_is_still_Waiting()
    {
        var table = await TableAsync("cancel-2");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, SkillRequest(table.HarveyId)))).GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.NotFound, (await CancelAsync(table, requestId, table.HarveyId, table.HarveyOid)).StatusCode);
        var cardRoll = Assert.Single((await JsonAsync(await GetRollRequestAsync(table, requestId))).GetProperty("requestedRolls").EnumerateArray());
        Assert.Equal("Waiting", cardRoll.GetProperty("status").GetString());
    }

    [Theory]
    [InlineData("rolled", "Another change won the race. Fetch again and try again.")]
    [InlineData("cancelled", "This roll was cancelled.")]
    public async Task Given_a_roll_that_is_no_longer_Waiting_When_cancelling_Then_it_is_409_with_the_matching_title(string state, string title)
    {
        var table = await TableAsync($"cancel-3-{state}");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, SkillRequest(table.HarveyId)))).GetProperty("id").GetGuid();
        if (state == "rolled")
        {
            Assert.Equal(HttpStatusCode.OK, (await RollAsync(table, requestId, table.HarveyId)).StatusCode);
        }
        else
        {
            Assert.Equal(HttpStatusCode.OK, (await CancelAsync(table, requestId, table.HarveyId)).StatusCode);
        }

        var again = await CancelAsync(table, requestId, table.HarveyId);

        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        Assert.Equal(title, (await JsonAsync(again)).GetProperty("title").GetString());
    }

    [Fact]
    public async Task Given_a_finished_Scene_When_cancelling_Then_the_Scene_check_wins_with_409()
    {
        var table = await TableAsync("cancel-4");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, SkillRequest(table.HarveyId)))).GetProperty("id").GetGuid();
        await FinishAsync(table);

        var cancelled = await CancelAsync(table, requestId, table.HarveyId);

        Assert.Equal(HttpStatusCode.Conflict, cancelled.StatusCode);
        Assert.Equal("No Scene is Active.", (await JsonAsync(cancelled)).GetProperty("title").GetString());
    }

    [Fact]
    public async Task Given_a_cancelled_roll_When_rolling_Then_it_is_409_with_the_cancelled_title()
    {
        var table = await TableAsync("cancel-5");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, SkillRequest(table.HarveyId)))).GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await CancelAsync(table, requestId, table.HarveyId)).StatusCode);

        var rolled = await RollAsync(table, requestId, table.HarveyId);

        Assert.Equal(HttpStatusCode.Conflict, rolled.StatusCode);
        Assert.Equal("This roll was cancelled.", (await JsonAsync(rolled)).GetProperty("title").GetString());
        var cardRoll = Assert.Single((await JsonAsync(await GetRollRequestAsync(table, requestId))).GetProperty("requestedRolls").EnumerateArray());
        Assert.Equal(("Cancelled", 0), (cardRoll.GetProperty("status").GetString(), cardRoll.GetProperty("rolls").GetArrayLength()));
    }

    [Fact]
    public async Task Given_a_finish_When_finishing_Then_both_rolls_are_Cancelled()
    {
        var table = await TableAsync("cancel-6");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, LuckRequest(table.HarveyId, table.LucyId)))).GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.NoContent, (await FinishAsync(table)).StatusCode);

        var card = await JsonAsync(await GetRollRequestAsync(table, requestId));
        Assert.All(card.GetProperty("requestedRolls").EnumerateArray(), roll => Assert.Equal("Cancelled", roll.GetProperty("status").GetString()));
    }

    [Fact]
    public async Task Given_a_present_change_When_removing_an_Investigator_Then_only_their_roll_is_Cancelled()
    {
        var table = await TableAsync("cancel-7");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, LuckRequest(table.HarveyId, table.LucyId)))).GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.OK, (await ChangePresentAsync(table, [table.HarveyId])).StatusCode);

        var card = await JsonAsync(await GetRollRequestAsync(table, requestId));
        var rolls = card.GetProperty("requestedRolls").EnumerateArray().ToList();
        Assert.Equal("Waiting", rolls.Single(roll => roll.GetProperty("investigatorId").GetGuid() == table.HarveyId).GetProperty("status").GetString());
        Assert.Equal("Cancelled", rolls.Single(roll => roll.GetProperty("investigatorId").GetGuid() == table.LucyId).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Given_a_second_Scene_When_starting_with_finish_Then_the_old_Scenes_rolls_are_Cancelled()
    {
        var table = await TableAsync("cancel-8");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, LuckRequest(table.HarveyId, table.LucyId)))).GetProperty("id").GetGuid();
        var secondScene = await CreateAsync(table.Client, $"/api/campaigns/{table.CampaignId}/scenarios/{table.ScenarioId}/scenes", table.KeeperOid, new { title = "Meeting Knott", location = "Arkham" });

        var started = await table.Client.SendAsync(BuildRequest(
            HttpMethod.Post, $"/api/campaigns/{table.CampaignId}/scenes/{secondScene}/start", table.KeeperOid,
            new { presentInvestigatorIds = new[] { table.HarveyId }, finishActiveScene = true }));

        Assert.Equal(HttpStatusCode.OK, started.StatusCode);
        var card = await JsonAsync(await GetRollRequestAsync(table, requestId));
        Assert.All(card.GetProperty("requestedRolls").EnumerateArray(), roll => Assert.Equal("Cancelled", roll.GetProperty("status").GetString()));
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

    [Fact]
    public async Task Given_a_failed_roll_When_the_Player_asks_to_push_Then_it_is_200_PushAsked_with_the_justification()
    {
        var table = await TableAsync("push-1");
        var requestId = await FailedRollRequestAsync(table);

        var asked = await AskPushAsync(table, requestId, table.HarveyId, new { justification = "  I search every shelf.  " });

        Assert.Equal(HttpStatusCode.OK, asked.StatusCode);
        var roll = await JsonAsync(asked);
        Assert.Equal(("PushAsked", "I search every shelf.", false), (roll.GetProperty("status").GetString(), roll.GetProperty("pushJustification").GetString(), roll.GetProperty("canBePushed").GetBoolean()));
        Assert.Single(roll.GetProperty("rolls").EnumerateArray());
    }

    [Fact]
    public async Task Given_the_Keeper_or_another_Player_When_asking_to_push_Then_it_is_404()
    {
        var table = await TableAsync("push-2");
        var requestId = await FailedRollRequestAsync(table);

        Assert.Equal(HttpStatusCode.NotFound, (await AskPushAsync(table, requestId, table.HarveyId, new { justification = "Trying again." }, table.KeeperOid)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await AskPushAsync(table, requestId, table.HarveyId, new { justification = "Trying again." }, table.LucyOid)).StatusCode);
    }

    [Fact]
    public async Task Given_a_missing_or_too_long_justification_When_asking_to_push_Then_it_is_400_at_justification()
    {
        var table = await TableAsync("push-3");
        var requestId = await FailedRollRequestAsync(table);

        var missing = await AskPushAsync(table, requestId, table.HarveyId, new { justification = "   " });
        var tooLong = await AskPushAsync(table, requestId, table.HarveyId, new { justification = new string('x', 2001) });

        Assert.All([missing, tooLong], response => Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode));
        Assert.Equal("justification", Errors(await JsonAsync(missing)).Single());
        Assert.Equal(
            "The justification is at most 2000 characters.",
            (await JsonAsync(tooLong)).GetProperty("errors").GetProperty("justification")[0].GetString());
    }

    [Fact]
    public async Task Given_a_success_Luck_a_second_ask_or_a_declined_roll_When_asking_to_push_Then_it_is_409()
    {
        var table = await TableAsync("push-4");
        var successId = await SuccessfulRollRequestAsync(table);
        var luckId = (await JsonAsync(await CreateRollRequestAsync(table, LuckRequest(table.HarveyId)))).GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await RollAsync(table, luckId, table.HarveyId, table.HarveyOid)).StatusCode);
        var failedId = await FailedRollRequestAsync(table);
        Assert.Equal(HttpStatusCode.OK, (await AskPushAsync(table, failedId, table.HarveyId, new { justification = "Trying again." })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await DeclinePushAsync(table, failedId, table.HarveyId)).StatusCode);

        Assert.Equal(HttpStatusCode.Conflict, (await AskPushAsync(table, successId, table.HarveyId, new { justification = "Trying again." })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await AskPushAsync(table, luckId, table.HarveyId, new { justification = "Trying again." })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await AskPushAsync(table, failedId, table.HarveyId, new { justification = "Trying once more." })).StatusCode);
    }

    [Fact]
    public async Task Given_a_hidden_roll_When_asking_to_push_Then_it_is_404()
    {
        var table = await TableAsync("push-5");
        var requestId = (await JsonAsync(await CreateRollRequestAsync(table, HiddenLuckRequest(table.HarveyId)))).GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.NotFound, (await AskPushAsync(table, requestId, table.HarveyId, new { justification = "Trying again." })).StatusCode);
    }

    [Fact]
    public async Task Given_a_push_asked_roll_When_the_Keeper_approves_Then_the_Player_rolls_a_second_pushed_record()
    {
        var table = await TableAsync("push-6");
        var requestId = await FailedRollRequestAsync(table);
        Assert.Equal(HttpStatusCode.OK, (await AskPushAsync(table, requestId, table.HarveyId, new { justification = "I search every shelf." })).StatusCode);

        var approved = await ApprovePushAsync(table, requestId, table.HarveyId, new { bonusDice = 1, penaltyDice = 0 });

        Assert.Equal(HttpStatusCode.OK, approved.StatusCode);
        var pushed = await JsonAsync(approved);
        Assert.Equal(("Pushed", 1, 0), (pushed.GetProperty("status").GetString(), pushed.GetProperty("pushBonusDice").GetInt32(), pushed.GetProperty("pushPenaltyDice").GetInt32()));

        var rolled = await RollAsync(table, requestId, table.HarveyId, table.HarveyOid);

        Assert.Equal(HttpStatusCode.OK, rolled.StatusCode);
        var roll = await JsonAsync(rolled);
        Assert.Equal("Rolled", roll.GetProperty("status").GetString());
        var records = roll.GetProperty("rolls").EnumerateArray().ToArray();
        Assert.Equal(2, records.Length);
        Assert.False(records[0].GetProperty("isPushed").GetBoolean());
        Assert.True(records[1].GetProperty("isPushed").GetBoolean());

        var card = await JsonAsync(await GetRollRequestAsync(table, requestId, table.LucyOid));
        var cardRoll = Assert.Single(card.GetProperty("requestedRolls").EnumerateArray());
        Assert.Equal(("I search every shelf.", 2), (cardRoll.GetProperty("pushJustification").GetString(), cardRoll.GetProperty("rolls").GetArrayLength()));
    }

    [Fact]
    public async Task Given_dice_outside_0_and_2_When_approving_Then_it_is_400_at_dice()
    {
        var table = await TableAsync("push-7");
        var requestId = await FailedRollRequestAsync(table);
        Assert.Equal(HttpStatusCode.OK, (await AskPushAsync(table, requestId, table.HarveyId, new { justification = "Trying again." })).StatusCode);

        var high = await ApprovePushAsync(table, requestId, table.HarveyId, new { bonusDice = 3, penaltyDice = 0 });
        var missing = await ApprovePushAsync(table, requestId, table.HarveyId, new { });

        Assert.All([high, missing], response => Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode));
        Assert.Equal("dice", Errors(await JsonAsync(high)).Single());
    }

    [Fact]
    public async Task Given_a_roll_that_is_not_push_asked_When_approving_or_declining_Then_it_is_409()
    {
        var table = await TableAsync("push-8");
        var requestId = await FailedRollRequestAsync(table);

        var approved = await ApprovePushAsync(table, requestId, table.HarveyId, new { bonusDice = 0, penaltyDice = 0 });
        var declined = await DeclinePushAsync(table, requestId, table.HarveyId);

        Assert.All([approved, declined], response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        Assert.Equal("Another change won the race. Fetch again and try again.", (await JsonAsync(approved)).GetProperty("title").GetString());
    }

    [Fact]
    public async Task Given_a_Player_When_approving_or_declining_Then_it_is_404()
    {
        var table = await TableAsync("push-9");
        var requestId = await FailedRollRequestAsync(table);
        Assert.Equal(HttpStatusCode.OK, (await AskPushAsync(table, requestId, table.HarveyId, new { justification = "Trying again." })).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await DeclinePushAsync(table, requestId, table.HarveyId, table.HarveyOid)).StatusCode);
        var approved = await table.Client.SendAsync(BuildRequest(
            HttpMethod.Post, CampaignUri(table, $"/roll-requests/{requestId}/requested-rolls/{table.HarveyId}/push/approve"),
            table.HarveyOid, new { bonusDice = 0, penaltyDice = 0 }));

        Assert.Equal(HttpStatusCode.NotFound, approved.StatusCode);
    }

    [Fact]
    public async Task Given_a_finished_Scene_When_pushing_Then_it_is_409()
    {
        var table = await TableAsync("push-10");
        var answerId = await FailedRollRequestAsync(table);
        Assert.Equal(HttpStatusCode.OK, (await AskPushAsync(table, answerId, table.HarveyId, new { justification = "Trying again." })).StatusCode);
        var decideId = await FailedRollRequestAsync(table);
        await FinishAsync(table);

        var asked = await AskPushAsync(table, decideId, table.HarveyId, new { justification = "Trying again." });
        var approved = await ApprovePushAsync(table, answerId, table.HarveyId, new { bonusDice = 0, penaltyDice = 0 });
        var declined = await DeclinePushAsync(table, answerId, table.HarveyId);

        Assert.All([asked, approved, declined], response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        Assert.Equal("No Scene is Active.", (await JsonAsync(asked)).GetProperty("title").GetString());
    }

    [Fact]
    public async Task Given_a_declined_push_When_listing_pushable_Then_it_leaves_and_cannot_be_asked_again()
    {
        var table = await TableAsync("push-11");
        var requestId = await FailedRollRequestAsync(table);
        Assert.Equal(HttpStatusCode.OK, (await AskPushAsync(table, requestId, table.HarveyId, new { justification = "Trying again." })).StatusCode);

        var pushable = await JsonAsync(await PushableAsync(table, table.HarveyOid));
        var pushableRoll = Assert.Single(pushable.GetProperty("rolls").EnumerateArray()).GetProperty("roll");
        Assert.Equal("PushAsked", pushableRoll.GetProperty("status").GetString());
        Assert.Equal("Trying again.", pushableRoll.GetProperty("pushJustification").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await PushableAsync(table, table.KeeperOid)).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await DeclinePushAsync(table, requestId, table.HarveyId)).StatusCode);

        var after = await JsonAsync(await PushableAsync(table, table.HarveyOid));
        Assert.Empty(after.GetProperty("rolls").EnumerateArray());
        Assert.Equal(HttpStatusCode.Conflict, (await AskPushAsync(table, requestId, table.HarveyId, new { justification = "Trying once more." })).StatusCode);
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
