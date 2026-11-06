namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// Giving and taking back Items (specs/scene-play/spec.md, API Contracts and Scenarios; PBI-SPL-003): every give and take-back
/// status with its check order, the held and revealed delete refusals, the myItems signals that reach only the Keeper and the
/// gaining or losing Players, and the held-Items reads. Authorization for every route is in ScenePlayAuthorizationMatrixTests.
/// </summary>
public class ItemHolderApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public ItemHolderApiTests(IdentityApiFactory factory) => _factory = factory;

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
        Guid SceneId,
        Guid ItemId,
        Guid LinkId);

    private async Task<Table> TableAsync(string suffix, bool start = true)
    {
        var client = _factory.CreateClient();
        var keeper = $"holder-keeper-{suffix}";
        var harveyOid = $"holder-harvey-{suffix}";
        var lucyOid = $"holder-lucy-{suffix}";
        var campaignId = (await CreateCampaignAsync(client, keeper)).Id;
        await JoinAsPlayerAsync(client, campaignId, keeper, harveyOid);
        await JoinAsPlayerAsync(client, campaignId, keeper, lucyOid);
        var harvey = await CreateApprovedAsync(client, campaignId, keeper, harveyOid, "Harvey Walters");
        var lucy = await CreateApprovedAsync(client, campaignId, keeper, lucyOid, "Lucy Ward");
        var scenario = await CreateAsync(client, $"/api/campaigns/{campaignId}/scenarios", keeper, new { title = "The Haunting" });
        var scene = await CreateAsync(client, $"/api/campaigns/{campaignId}/scenarios/{scenario}/scenes", keeper, new { title = "The Corbitt House", location = "Boston Road" });
        var itemId = (await CreateItemAsync(client, campaignId, keeper)).GetProperty("id").GetGuid();
        var linkId = (await LinkItemAsync(client, (campaignId, scenario, scene), keeper, itemId)).GetProperty("id").GetGuid();
        if (start)
        {
            var started = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/scenes/{scene}/start", keeper, new { presentInvestigatorIds = new[] { harvey, lucy }, finishActiveScene = false }));
            Assert.Equal(HttpStatusCode.OK, started.StatusCode);
        }

        return new Table(client, keeper, harveyOid, lucyOid, $"holder-stranger-{suffix}", campaignId, harvey, lucy, scenario, scene, itemId, linkId);
    }

    private static async Task<Guid> CreateAsync(HttpClient client, string uri, string oid, object body)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, uri, oid, body));
        Assert.True(response.StatusCode is HttpStatusCode.Created or HttpStatusCode.OK, $"POST {uri} answered {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return (await BodyAsync(response)).GetProperty("id").GetGuid();
    }

    private static string ItemsUri(Table table, Guid itemId, string suffix = "") => $"/api/campaigns/{table.CampaignId}/items/{itemId}{suffix}";

    private static Task<HttpResponseMessage> GiveAsync(Table table, Guid itemId, Guid investigatorId, string? oid = null) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, ItemsUri(table, itemId, "/give"), oid ?? table.KeeperOid, new { investigatorId }));

    private static Task<HttpResponseMessage> TakeBackAsync(Table table, Guid itemId, string? oid = null) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, ItemsUri(table, itemId, "/take-back"), oid ?? table.KeeperOid));

    private static Task<HttpResponseMessage> MineAsync(Table table, string? oid = null) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{table.CampaignId}/investigators/mine/items", oid ?? table.HarveyOid));

    private static Task<HttpResponseMessage> ForInvestigatorAsync(Table table, Guid investigatorId, string? oid = null) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{table.CampaignId}/investigators/{investigatorId}/items", oid ?? table.KeeperOid));

    private static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();

    private static async Task<IReadOnlyList<string>> ErrorKeysAsync(HttpResponseMessage response) =>
        (await JsonAsync(response)).GetProperty("errors").EnumerateObject().Select(error => error.Name).ToList();

    private async Task<Guid?> HolderOfAsync(Guid itemId)
    {
        using var scope = _factory.Services.CreateScope();
        var stored = await scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>().Items.SingleAsync(candidate => candidate.Id == itemId);
        return stored.HolderInvestigatorId;
    }

    private async Task<int> RevealRowsAsync()
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>().Set<Reveal>().CountAsync();
    }

    [Fact]
    public async Task Given_a_linked_Item_When_the_Keeper_gives_it_Then_it_is_200_with_the_reveal_and_the_holder_is_set()
    {
        var table = await TableAsync("1");

        var response = await GiveAsync(table, table.ItemId, table.HarveyId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var reveal = await JsonAsync(response);
        Assert.Equal(("Item", "Walter Corbitt's diary", table.ItemId), (reveal.GetProperty("subjectType").GetString(), reveal.GetProperty("title").GetString(), reveal.GetProperty("subjectId").GetGuid()));
        Assert.Equal(Description, reveal.GetProperty("content").GetRawText());
        var recipient = Assert.Single(reveal.GetProperty("recipients").EnumerateArray());
        Assert.Equal((table.HarveyId, "Harvey Walters"), (recipient.GetProperty("id").GetGuid(), recipient.GetProperty("name").GetString()));
        Assert.Equal(table.HarveyId, await HolderOfAsync(table.ItemId));
        Assert.Equal(table.HarveyId, (await GetItemAsync(table.Client, table.CampaignId, table.ItemId, table.KeeperOid)).GetProperty("holder").GetProperty("investigatorId").GetGuid());
        var link = Assert.Single((await GetSceneAsync(table.Client, (table.CampaignId, table.ScenarioId, table.SceneId), table.KeeperOid)).GetProperty("itemLinks").EnumerateArray());
        Assert.Equal(table.HarveyId, link.GetProperty("item").GetProperty("holder").GetProperty("investigatorId").GetGuid());
    }

    [Fact]
    public async Task Given_held_Items_When_reading_them_Then_the_Player_sees_snapshots_without_Item_ids_newest_first_and_the_Keeper_sees_Item_ids()
    {
        var table = await TableAsync("2");
        var otherId = (await CreateItemAsync(table.Client, table.CampaignId, table.KeeperOid, "The cellar key")).GetProperty("id").GetGuid();
        await LinkItemAsync(table.Client, (table.CampaignId, table.ScenarioId, table.SceneId), table.KeeperOid, otherId);
        await GiveAsync(table, table.ItemId, table.HarveyId);
        await GiveAsync(table, otherId, table.HarveyId);

        var mine = await MineAsync(table);

        Assert.Equal(HttpStatusCode.OK, mine.StatusCode);
        var body = await JsonAsync(mine);
        Assert.Equal("Harvey Walters", body.GetProperty("investigatorName").GetString());
        var items = body.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, items.Count);
        Assert.True(items[0].GetProperty("givenAt").GetDateTimeOffset() >= items[1].GetProperty("givenAt").GetDateTimeOffset());
        Assert.DoesNotContain("itemId", await mine.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        var keeper = await JsonAsync(await ForInvestigatorAsync(table, table.HarveyId));
        Assert.Equal([otherId, table.ItemId], keeper.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("itemId").GetGuid()).ToArray());
        Assert.Equal("Harvey Walters", keeper.GetProperty("investigatorName").GetString());
        Assert.Equal(0, (await JsonAsync(await MineAsync(table, table.LucyOid))).GetProperty("items").GetArrayLength());
        Assert.Equal(0, (await JsonAsync(await ForInvestigatorAsync(table, table.LucyId))).GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task Given_a_missing_Item_When_giving_Then_it_is_404()
    {
        var table = await TableAsync("3");

        var response = await GiveAsync(table, Guid.NewGuid(), table.HarveyId);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(0, await RevealRowsAsync());
    }

    [Fact]
    public async Task Given_an_unlinked_Item_and_an_absent_recipient_When_giving_Then_the_missing_link_is_reported_first()
    {
        var table = await TableAsync("4");
        var looseId = (await CreateItemAsync(table.Client, table.CampaignId, table.KeeperOid, "Elsewhere")).GetProperty("id").GetGuid();
        await table.Client.SendAsync(BuildRequest(HttpMethod.Put, $"/api/campaigns/{table.CampaignId}/active-scene/present-investigators", table.KeeperOid, new { presentInvestigatorIds = new[] { table.HarveyId } }));

        var response = await GiveAsync(table, looseId, table.LucyId);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(["itemId"], await ErrorKeysAsync(response));
        Assert.Equal(0, await RevealRowsAsync());
    }

    [Fact]
    public async Task Given_a_linked_Item_When_giving_to_an_absent_Investigator_Then_it_is_400_on_the_recipient()
    {
        var table = await TableAsync("5");
        await table.Client.SendAsync(BuildRequest(HttpMethod.Put, $"/api/campaigns/{table.CampaignId}/active-scene/present-investigators", table.KeeperOid, new { presentInvestigatorIds = new[] { table.HarveyId } }));

        var response = await GiveAsync(table, table.ItemId, table.LucyId);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(["investigatorId"], await ErrorKeysAsync(response));
        Assert.Null(await HolderOfAsync(table.ItemId));
    }

    [Fact]
    public async Task Given_the_current_holder_When_giving_again_Then_it_is_400_and_the_holder_is_unchanged()
    {
        var table = await TableAsync("6");
        var given = await GiveAsync(table, table.ItemId, table.HarveyId);
        Assert.Equal(HttpStatusCode.OK, given.StatusCode);

        var response = await GiveAsync(table, table.ItemId, table.HarveyId);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(["investigatorId"], await ErrorKeysAsync(response));
        Assert.Equal("This Investigator already holds the Item.", (await JsonAsync(response)).GetProperty("errors").GetProperty("investigatorId")[0].GetString());
        Assert.Equal(1, await RevealRowsAsync());
    }

    [Fact]
    public async Task Given_no_Item_When_giving_Then_it_is_404_even_with_no_Active_Scene()
    {
        var table = await TableAsync("7");
        Assert.Equal(HttpStatusCode.NoContent, (await table.Client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{table.CampaignId}/active-scene/finish", table.KeeperOid))).StatusCode);

        var response = await GiveAsync(table, Guid.NewGuid(), table.HarveyId);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_no_Active_Scene_When_giving_an_existing_Item_Then_it_is_409()
    {
        var table = await TableAsync("17");
        Assert.Equal(HttpStatusCode.NoContent, (await table.Client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{table.CampaignId}/active-scene/finish", table.KeeperOid))).StatusCode);

        var response = await GiveAsync(table, table.ItemId, table.HarveyId);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("No Scene is Active.", await ProblemTitleAsync(response));
    }

    [Fact]
    public async Task Given_a_Player_or_a_non_member_When_giving_or_taking_back_Then_each_is_404_and_nothing_changes()
    {
        var table = await TableAsync("8");

        var playerGive = await GiveAsync(table, table.ItemId, table.HarveyId, table.HarveyOid);
        var strangerGive = await GiveAsync(table, table.ItemId, table.HarveyId, table.StrangerOid);
        var playerTakeBack = await TakeBackAsync(table, table.ItemId, table.HarveyOid);

        Assert.Equal(HttpStatusCode.NotFound, playerGive.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, strangerGive.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, playerTakeBack.StatusCode);
        Assert.Null(await HolderOfAsync(table.ItemId));
        Assert.Equal(0, await RevealRowsAsync());
    }

    [Fact]
    public async Task Given_a_held_Item_When_taking_it_back_Then_it_is_204_and_taking_back_again_is_still_204()
    {
        var table = await TableAsync("9");
        Assert.Equal(HttpStatusCode.OK, (await GiveAsync(table, table.ItemId, table.HarveyId)).StatusCode);

        var first = await TakeBackAsync(table, table.ItemId);
        var second = await TakeBackAsync(table, table.ItemId);

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
        Assert.Null(await HolderOfAsync(table.ItemId));
        Assert.Equal(1, await RevealRowsAsync());
    }

    [Fact]
    public async Task Given_a_missing_Item_When_taking_it_back_Then_it_is_404()
    {
        var table = await TableAsync("10");

        var response = await TakeBackAsync(table, Guid.NewGuid());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_callers_without_an_Approved_Investigator_When_reading_held_Items_Then_each_is_404()
    {
        var table = await TableAsync("11");
        Assert.Equal(HttpStatusCode.OK, (await GiveAsync(table, table.ItemId, table.HarveyId)).StatusCode);
        await JoinAsPlayerAsync(table.Client, table.CampaignId, table.KeeperOid, table.StrangerOid);

        var keeperMine = await MineAsync(table, table.KeeperOid);
        var strangerMine = await MineAsync(table, table.StrangerOid);
        var playerOther = await ForInvestigatorAsync(table, table.HarveyId, table.HarveyOid);
        var keeperUnknown = await ForInvestigatorAsync(table, Guid.NewGuid());

        Assert.Equal(HttpStatusCode.NotFound, keeperMine.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, strangerMine.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, playerOther.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, keeperUnknown.StatusCode);
    }

    [Fact]
    public async Task Given_a_held_Item_When_deleting_it_Then_it_is_409_and_everything_stays()
    {
        var table = await TableAsync("12");
        Assert.Equal(HttpStatusCode.OK, (await GiveAsync(table, table.ItemId, table.HarveyId)).StatusCode);

        var response = await table.Client.SendAsync(BuildRequest(HttpMethod.Delete, $"/api/campaigns/{table.CampaignId}/items/{table.ItemId}", table.KeeperOid));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(HeldTitle, await ProblemTitleAsync(response));
        Assert.Equal((1, 1, 1), (await CountAsync(_factory, "Items"), await CountAsync(_factory, "ItemLinks"), await RevealRowsAsync()));
    }

    [Fact]
    public async Task Given_a_deleted_Item_When_giving_it_Then_it_is_404()
    {
        var table = await TableAsync("13");
        Assert.Equal(HttpStatusCode.NoContent, (await table.Client.SendAsync(BuildRequest(HttpMethod.Delete, $"/api/campaigns/{table.CampaignId}/scenarios/{table.ScenarioId}/scenes/{table.SceneId}/item-links/{table.LinkId}", table.KeeperOid))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await table.Client.SendAsync(BuildRequest(HttpMethod.Delete, $"/api/campaigns/{table.CampaignId}/items/{table.ItemId}", table.KeeperOid))).StatusCode);

        var response = await GiveAsync(table, table.ItemId, table.HarveyId);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_taken_back_Item_When_unlinking_and_deleting_it_Then_the_surviving_give_Reveal_still_refuses_the_delete()
    {
        var table = await TableAsync("14");
        Assert.Equal(HttpStatusCode.OK, (await GiveAsync(table, table.ItemId, table.HarveyId)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await TakeBackAsync(table, table.ItemId)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await table.Client.SendAsync(BuildRequest(HttpMethod.Delete, $"/api/campaigns/{table.CampaignId}/scenarios/{table.ScenarioId}/scenes/{table.SceneId}/item-links/{table.LinkId}", table.KeeperOid))).StatusCode);

        var response = await table.Client.SendAsync(BuildRequest(HttpMethod.Delete, $"/api/campaigns/{table.CampaignId}/items/{table.ItemId}", table.KeeperOid));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(InPlayTitle, await ProblemTitleAsync(response));
        Assert.Equal(1, await RevealRowsAsync());
    }

    [Fact]
    public async Task Given_a_revealed_Item_Handout_When_deleting_it_or_its_Item_Then_each_is_409_and_the_snapshot_stays()
    {
        var table = await TableAsync("15");
        var handout = await table.Client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{table.CampaignId}/items/{table.ItemId}/handouts", table.KeeperOid, new { kind = "Text", visibility = "PlayerFacing", title = "The last entry", content = Json(Description) }));
        Assert.Equal(HttpStatusCode.Created, handout.StatusCode);
        var handoutId = (await BodyAsync(handout)).GetProperty("id").GetGuid();
        var revealed = await table.Client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{table.CampaignId}/active-scene/reveals", table.KeeperOid, new { subject = new { type = "Handout", id = handoutId }, investigatorIds = new[] { table.HarveyId } }));
        Assert.Equal(HttpStatusCode.OK, revealed.StatusCode);

        var deleteHandout = await table.Client.SendAsync(BuildRequest(HttpMethod.Delete, $"/api/campaigns/{table.CampaignId}/items/{table.ItemId}/handouts/{handoutId}", table.KeeperOid));
        var deleteItem = await table.Client.SendAsync(BuildRequest(HttpMethod.Delete, $"/api/campaigns/{table.CampaignId}/items/{table.ItemId}", table.KeeperOid));

        Assert.Equal(HttpStatusCode.Conflict, deleteHandout.StatusCode);
        Assert.Equal(HandoutsKeptTitle, await ProblemTitleAsync(deleteHandout));
        Assert.Equal(HttpStatusCode.Conflict, deleteItem.StatusCode);
        Assert.Equal(InPlayTitle, await ProblemTitleAsync(deleteItem));
        Assert.Equal((1, 1), (await CountAsync(_factory, "Items"), await CountAsync(_factory, "Handouts")));
    }

    [Fact]
    public async Task Given_connected_members_When_the_Keeper_gives_Then_only_the_Keeper_and_the_holder_hear_it()
    {
        var table = await TableAsync("16");
        var (keeperHub, _) = await CampaignHubTestClient.SubscribeAsync(_factory, table.KeeperOid, table.CampaignId);
        var (harveyHub, _) = await CampaignHubTestClient.SubscribeAsync(_factory, table.HarveyOid, table.CampaignId);
        var (lucyHub, _) = await CampaignHubTestClient.SubscribeAsync(_factory, table.LucyOid, table.CampaignId);
        await using var _1 = keeperHub;
        await using var _2 = harveyHub;
        await using var _3 = lucyHub;

        Assert.Equal(HttpStatusCode.OK, (await GiveAsync(table, table.ItemId, table.HarveyId)).StatusCode);
        await table.Client.SendAsync(BuildRequest(HttpMethod.Put, $"/api/campaigns/{table.CampaignId}/active-scene/present-investigators", table.KeeperOid, new { presentInvestigatorIds = new[] { table.HarveyId, table.LucyId } }));

        Assert.Equal("sceneReveals", await TopicsUntilActiveSceneAsync(keeperHub, table.CampaignId));
        Assert.Equal("myItems,myClues", await TopicsUntilActiveSceneAsync(harveyHub, table.CampaignId));
        Assert.Equal(string.Empty, await TopicsUntilActiveSceneAsync(lucyHub, table.CampaignId));
    }

    [Fact]
    public async Task Given_connected_members_When_the_Item_moves_and_is_taken_back_Then_each_former_holder_hears_myItems_without_myClues()
    {
        var table = await TableAsync("17");
        var (keeperHub, _) = await CampaignHubTestClient.SubscribeAsync(_factory, table.KeeperOid, table.CampaignId);
        var (harveyHub, _) = await CampaignHubTestClient.SubscribeAsync(_factory, table.HarveyOid, table.CampaignId);
        var (lucyHub, _) = await CampaignHubTestClient.SubscribeAsync(_factory, table.LucyOid, table.CampaignId);
        await using var _1 = keeperHub;
        await using var _2 = harveyHub;
        await using var _3 = lucyHub;

        Assert.Equal(HttpStatusCode.OK, (await GiveAsync(table, table.ItemId, table.HarveyId)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await GiveAsync(table, table.ItemId, table.LucyId)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await TakeBackAsync(table, table.ItemId)).StatusCode);
        await table.Client.SendAsync(BuildRequest(HttpMethod.Put, $"/api/campaigns/{table.CampaignId}/active-scene/present-investigators", table.KeeperOid, new { presentInvestigatorIds = new[] { table.HarveyId, table.LucyId } }));

        Assert.Equal("sceneReveals|sceneReveals|sceneReveals", await TopicsUntilActiveSceneAsync(keeperHub, table.CampaignId));
        Assert.Equal("myItems,myClues|myItems", await TopicsUntilActiveSceneAsync(harveyHub, table.CampaignId));
        Assert.Equal("myItems,myClues|myItems", await TopicsUntilActiveSceneAsync(lucyHub, table.CampaignId));
    }

    // The activeScene signal is sent after the holder change and in order on every connection, so everything a client heard before it is what the change sent.
    private static async Task<string> TopicsUntilActiveSceneAsync(CampaignHubTestClient client, Guid campaignId)
    {
        var before = new List<string>();
        while (true)
        {
            if (await client.NextMessageAsync() is CampaignDataChangedMessage message && message.CampaignId == campaignId)
            {
                var topics = message.Topics.ToArray();
                if (topics.SequenceEqual(["activeScene"]))
                {
                    return string.Join('|', before);
                }

                before.Add(string.Join(',', topics));
            }
        }
    }
}
