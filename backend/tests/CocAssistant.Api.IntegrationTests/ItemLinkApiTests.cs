namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Scene Item link API (specs/scenario-preparation/spec.md, Scene API; PBI-SP-008 D4): 201 for a new link, 200 with the existing
/// link for an Item already linked, 400 keyed <c>itemId</c> for an Item outside the Campaign, 409 for a Finished Scene (checked
/// before the Item), unlink, the <c>itemLinks</c> of the Scene response, and the Scene removal cascade (ADR 0016, ADR 0018, ADR 0022).
/// </summary>
public class ItemLinkApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public ItemLinkApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Given_a_keeper_When_linking_two_Items_Then_each_is_201_and_get_Scene_lists_them_in_order_linked_with_the_live_names()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "ilink-keeper-1");
        var diaryId = (await CreateItemAsync(client, scene.CampaignId, "ilink-keeper-1", "Walter Corbitt's diary")).GetProperty("id").GetGuid();
        var keyId = (await CreateItemAsync(client, scene.CampaignId, "ilink-keeper-1", "The cellar key")).GetProperty("id").GetGuid();

        var first = await LinkItemAsync(client, scene, "ilink-keeper-1", diaryId);
        var second = await LinkItemAsync(client, scene, "ilink-keeper-1", keyId);
        await client.SendAsync(BuildRequest(HttpMethod.Put, ItemsUri(scene.CampaignId, $"/{diaryId}"), "ilink-keeper-1", ItemBody("The diary")));
        var loaded = await GetSceneAsync(client, scene, "ilink-keeper-1");

        Assert.Equal(["id", "item"], first.EnumerateObject().Select(property => property.Name));
        Assert.Equal(["id", "name"], first.GetProperty("item").EnumerateObject().Select(property => property.Name));
        Assert.Equal(second.GetProperty("item").GetProperty("id").GetGuid(), keyId);
        var links = loaded.GetProperty("itemLinks").EnumerateArray().ToList();
        Assert.Equal(["The diary", "The cellar key"], links.Select(link => link.GetProperty("item").GetProperty("name").GetString()));
        Assert.Equal(first.GetProperty("id").GetGuid(), links[0].GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task Given_a_new_Scene_When_reading_it_Then_itemLinks_is_an_empty_array()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "ilink-keeper-2");

        var loaded = await GetSceneAsync(client, scene, "ilink-keeper-2");

        Assert.Equal(JsonValueKind.Array, loaded.GetProperty("itemLinks").ValueKind);
        Assert.Equal(0, loaded.GetProperty("itemLinks").GetArrayLength());
    }

    [Fact]
    public async Task Given_an_Item_already_linked_When_linking_it_again_Then_it_is_200_with_the_existing_link_and_no_second_row()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "ilink-keeper-3");
        var itemId = (await CreateItemAsync(client, scene.CampaignId, "ilink-keeper-3")).GetProperty("id").GetGuid();
        var first = await LinkItemAsync(client, scene, "ilink-keeper-3", itemId);

        var again = await client.SendAsync(BuildRequest(HttpMethod.Post, ItemLinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId), "ilink-keeper-3", new { itemId }));

        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Equal(first.GetRawText(), (await BodyAsync(again)).GetRawText());
        Assert.Equal(1, await CountAsync(_factory, "ItemLinks"));
    }

    [Fact]
    public async Task Given_an_Item_of_the_same_Campaign_linked_to_two_Scenes_When_getting_each_Scene_Then_both_list_it()
    {
        var client = _factory.CreateClient();
        var first = await SceneAsync(client, "ilink-keeper-4");
        var second = await SceneInCampaignAsync(client, first.CampaignId, "ilink-keeper-4", "The cellar");
        var itemId = (await CreateItemAsync(client, first.CampaignId, "ilink-keeper-4")).GetProperty("id").GetGuid();

        await LinkItemAsync(client, first, "ilink-keeper-4", itemId);
        await LinkItemAsync(client, second, "ilink-keeper-4", itemId);

        Assert.Equal(1, (await GetSceneAsync(client, first, "ilink-keeper-4")).GetProperty("itemLinks").GetArrayLength());
        Assert.Equal(1, (await GetSceneAsync(client, second, "ilink-keeper-4")).GetProperty("itemLinks").GetArrayLength());
        Assert.Equal(2, (await GetItemAsync(client, first.CampaignId, itemId, "ilink-keeper-4")).GetProperty("scenes").GetArrayLength());
    }

    [Fact]
    public async Task Given_a_missing_unknown_or_foreign_itemId_When_linking_Then_each_is_a_400_keyed_itemId_with_the_same_message()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "ilink-keeper-5");
        var otherCampaignId = (await CreateCampaignAsync(client, "ilink-keeper-5")).Id;
        var foreignId = (await CreateItemAsync(client, otherCampaignId, "ilink-keeper-5", "Elsewhere")).GetProperty("id").GetGuid();

        async Task<IReadOnlyDictionary<string, string[]>> PostAsync(object body) =>
            await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Post, ItemLinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId), "ilink-keeper-5", body)));

        var missing = await PostAsync(new { });
        var unknown = await PostAsync(new { itemId = Guid.NewGuid() });
        var foreign = await PostAsync(new { itemId = foreignId });

        Assert.All(new[] { missing, unknown, foreign }, problems =>
        {
            Assert.Equal(["itemId"], problems.Keys);
            Assert.Equal(["Choose an Item of this Campaign."], problems["itemId"]);
        });
        Assert.Equal(0, await CountAsync(_factory, "ItemLinks"));
    }

    [Fact]
    public async Task Given_an_Active_Scene_When_linking_and_unlinking_Then_both_succeed()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "ilink-keeper-6");
        var itemId = (await CreateItemAsync(client, scene.CampaignId, "ilink-keeper-6")).GetProperty("id").GetGuid();
        await PlayAsync(_factory, scene.SceneId, SceneStatus.Active);

        var link = await LinkItemAsync(client, scene, "ilink-keeper-6", itemId);
        var unlink = await client.SendAsync(BuildRequest(HttpMethod.Delete, ItemLinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId, $"/{link.GetProperty("id").GetGuid()}"), "ilink-keeper-6"));

        Assert.Equal(HttpStatusCode.NoContent, unlink.StatusCode);
        Assert.Equal(1, await CountAsync(_factory, "Items"));
    }

    [Fact]
    public async Task Given_a_Finished_Scene_When_linking_or_unlinking_Then_each_is_the_same_409_title_even_for_an_Item_outside_the_Campaign_and_links_are_unchanged()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "ilink-keeper-7");
        var itemId = (await CreateItemAsync(client, scene.CampaignId, "ilink-keeper-7")).GetProperty("id").GetGuid();
        var otherId = (await CreateItemAsync(client, scene.CampaignId, "ilink-keeper-7", "Another")).GetProperty("id").GetGuid();
        var link = await LinkItemAsync(client, scene, "ilink-keeper-7", itemId);
        await PlayAsync(_factory, scene.SceneId, SceneStatus.Finished);
        var linksUri = ItemLinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId);

        var post = await client.SendAsync(BuildRequest(HttpMethod.Post, linksUri, "ilink-keeper-7", new { itemId = otherId }));
        var outsider = await client.SendAsync(BuildRequest(HttpMethod.Post, linksUri, "ilink-keeper-7", new { itemId = Guid.NewGuid() }));
        var delete = await client.SendAsync(BuildRequest(HttpMethod.Delete, $"{linksUri}/{link.GetProperty("id").GetGuid()}", "ilink-keeper-7"));

        Assert.All([post, outsider, delete], response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        foreach (var response in new[] { post, outsider, delete })
        {
            Assert.Equal(FinishedTitle, await ProblemTitleAsync(response));
        }

        Assert.Equal(1, await CountAsync(_factory, "ItemLinks"));
    }

    [Fact]
    public async Task Given_a_link_When_unlinking_Then_it_is_204_the_Scene_no_longer_lists_it_and_the_Item_stays()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "ilink-keeper-8");
        var itemId = (await CreateItemAsync(client, scene.CampaignId, "ilink-keeper-8")).GetProperty("id").GetGuid();
        var link = await LinkItemAsync(client, scene, "ilink-keeper-8", itemId);

        var response = await client.SendAsync(BuildRequest(HttpMethod.Delete, ItemLinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId, $"/{link.GetProperty("id").GetGuid()}"), "ilink-keeper-8"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty((await GetSceneAsync(client, scene, "ilink-keeper-8")).GetProperty("itemLinks").EnumerateArray());
        Assert.Empty((await GetItemAsync(client, scene.CampaignId, itemId, "ilink-keeper-8")).GetProperty("scenes").EnumerateArray());
    }

    [Fact]
    public async Task Given_a_Prepared_Scene_with_an_Item_link_When_removing_the_Scene_Then_the_link_goes_and_the_Item_stays()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "ilink-keeper-9");
        var itemId = (await CreateItemAsync(client, scene.CampaignId, "ilink-keeper-9")).GetProperty("id").GetGuid();
        await LinkItemAsync(client, scene, "ilink-keeper-9", itemId);

        var response = await client.SendAsync(BuildRequest(HttpMethod.Delete, SceneUri(scene.CampaignId, scene.ScenarioId, scene.SceneId), "ilink-keeper-9"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal((0, 1), (await CountAsync(_factory, "ItemLinks"), await CountAsync(_factory, "Items")));
        Assert.Empty((await GetItemAsync(client, scene.CampaignId, itemId, "ilink-keeper-9")).GetProperty("scenes").EnumerateArray());
    }

    [Fact]
    public async Task Given_a_player_or_another_keeper_or_other_ids_When_using_the_link_endpoints_Then_each_is_the_same_404()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "ilink-keeper-10");
        await JoinAsPlayerAsync(client, scene.CampaignId, "ilink-keeper-10", "ilink-player-10");
        var otherScene = await SceneAsync(client, "ilink-other-keeper-10");
        var itemId = (await CreateItemAsync(client, scene.CampaignId, "ilink-keeper-10")).GetProperty("id").GetGuid();
        var linkId = (await LinkItemAsync(client, scene, "ilink-keeper-10", itemId)).GetProperty("id").GetGuid();
        var otherScenario = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{scene.CampaignId}/scenarios", "ilink-keeper-10", new { title = "Another" }));
        var otherScenarioId = (await BodyAsync(otherScenario)).GetProperty("id").GetGuid();

        async Task<IReadOnlyList<string>> AnswersAsync(string oid, Guid campaignId, Guid scenarioId, Guid sceneId, Guid link)
        {
            var responses = new[]
            {
                await client.SendAsync(BuildRequest(HttpMethod.Post, ItemLinksUri(campaignId, scenarioId, sceneId), oid, new { itemId })),
                await client.SendAsync(BuildRequest(HttpMethod.Delete, ItemLinksUri(campaignId, scenarioId, sceneId, $"/{link}"), oid)),
            };
            Assert.All(responses, response => Assert.Equal(HttpStatusCode.NotFound, response.StatusCode));
            return [await WithoutTraceIdAsync(responses[0]), await WithoutTraceIdAsync(responses[1])];
        }

        var player = await AnswersAsync("ilink-player-10", scene.CampaignId, scene.ScenarioId, scene.SceneId, linkId);
        var otherKeeper = await AnswersAsync("ilink-other-keeper-10", scene.CampaignId, scene.ScenarioId, scene.SceneId, linkId);
        var missingCampaign = await AnswersAsync("ilink-keeper-10", Guid.NewGuid(), scene.ScenarioId, scene.SceneId, linkId);
        var wrongScenario = await AnswersAsync("ilink-keeper-10", scene.CampaignId, otherScenarioId, scene.SceneId, linkId);
        var unknownScene = await AnswersAsync("ilink-keeper-10", scene.CampaignId, scene.ScenarioId, Guid.NewGuid(), linkId);
        var foreignScene = await AnswersAsync("ilink-keeper-10", scene.CampaignId, otherScene.ScenarioId, otherScene.SceneId, linkId);
        var unknownLink = await client.SendAsync(BuildRequest(HttpMethod.Delete, ItemLinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId, $"/{Guid.NewGuid()}"), "ilink-keeper-10"));

        Assert.All(new[] { otherKeeper, missingCampaign, wrongScenario, unknownScene, foreignScene }, answers => Assert.Equal(player, answers));
        Assert.Equal(player[1], await WithoutTraceIdAsync(unknownLink));
        Assert.Equal(1, await CountAsync(_factory, "ItemLinks"));
    }
}
