namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The rich-text Handout API of an Item (specs/scenario-preparation/spec.md, Item API; PBI-SP-008 D3, D5): the same operations and
/// 400 keys as a Scene's Handouts, no Finished refusal, a 409 on delete while the Item is in play, and an identical 404 for a Player,
/// another Campaign's Keeper and foreign ids (ADR 0013, ADR 0018, ADR 0022).
/// </summary>
public class ItemHandoutApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private const string Text =
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The last entry\"}]}]}}";

    private readonly IdentityApiFactory _factory;

    public ItemHandoutApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private static string HandoutsUri(Guid campaignId, Guid itemId, string suffix = "") => ItemsUri(campaignId, $"/{itemId}/handouts{suffix}");

    private static object HandoutBody(string title = "The last entry", string kind = "Text", string visibility = "PlayerFacing", string content = Text) =>
        new { kind, visibility, title, content = Json(content) };

    private async Task<(HttpClient Client, Guid CampaignId, Guid ItemId)> ItemAsync(string oid)
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, oid)).Id;
        var itemId = (await CreateItemAsync(client, campaignId, oid)).GetProperty("id").GetGuid();
        return (client, campaignId, itemId);
    }

    private static async Task<Guid> AddAsync(HttpClient client, Guid campaignId, Guid itemId, string oid, string title = "The last entry")
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(campaignId, itemId), oid, HandoutBody(title)));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await BodyAsync(response)).GetProperty("id").GetGuid();
    }

    [Fact]
    public async Task Given_a_keeper_When_adding_a_Handout_to_an_Item_Then_it_is_201_and_the_Item_lists_the_summary()
    {
        var (client, campaignId, itemId) = await ItemAsync("ihand-keeper-1");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(campaignId, itemId), "ihand-keeper-1", HandoutBody("  The last entry ")));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await BodyAsync(response);
        Assert.Equal(["id", "kind", "visibility", "title", "content", "file"], body.EnumerateObject().Select(property => property.Name));
        Assert.Equal(("Text", "PlayerFacing", "The last entry"), (body.GetProperty("kind").GetString(), body.GetProperty("visibility").GetString(), body.GetProperty("title").GetString()));
        Assert.Equal(Text, body.GetProperty("content").GetRawText());
        var summary = Assert.Single((await GetItemAsync(client, campaignId, itemId, "ihand-keeper-1")).GetProperty("handouts").EnumerateArray());
        Assert.Equal(["id", "kind", "visibility", "title"], summary.EnumerateObject().Select(property => property.Name));
        Assert.Equal(1, await CountAsync(_factory, "Handouts"));
    }

    [Fact]
    public async Task Given_a_Handout_When_getting_editing_and_reordering_Then_the_Item_keeps_its_own_order()
    {
        var (client, campaignId, itemId) = await ItemAsync("ihand-keeper-2");
        var first = await AddAsync(client, campaignId, itemId, "ihand-keeper-2", "First");
        var second = await AddAsync(client, campaignId, itemId, "ihand-keeper-2", "Second");

        var got = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(campaignId, itemId, $"/{first}"), "ihand-keeper-2"));
        var edited = await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(campaignId, itemId, $"/{first}"), "ihand-keeper-2", HandoutBody("Renamed", "ReadAloud", "KeeperFacing")));
        var reordered = await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(campaignId, itemId, "/order"), "ihand-keeper-2", new { handoutIds = new[] { second, first } }));

        Assert.Equal(HttpStatusCode.OK, got.StatusCode);
        Assert.Equal("First", (await BodyAsync(got)).GetProperty("title").GetString());
        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        Assert.Equal(HttpStatusCode.OK, reordered.StatusCode);
        Assert.Equal(["Second", "Renamed"], (await BodyAsync(reordered)).GetProperty("handouts").EnumerateArray().Select(handout => handout.GetProperty("title").GetString()));
        Assert.Equal(["Second", "Renamed"], (await GetItemAsync(client, campaignId, itemId, "ihand-keeper-2")).GetProperty("handouts").EnumerateArray().Select(handout => handout.GetProperty("title").GetString()));
    }

    [Fact]
    public async Task Given_a_stale_or_duplicate_order_When_reordering_Then_it_is_a_409_or_a_400_and_the_order_is_unchanged()
    {
        var (client, campaignId, itemId) = await ItemAsync("ihand-keeper-3");
        var first = await AddAsync(client, campaignId, itemId, "ihand-keeper-3", "First");
        await AddAsync(client, campaignId, itemId, "ihand-keeper-3", "Second");

        var stale = await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(campaignId, itemId, "/order"), "ihand-keeper-3", new { handoutIds = new[] { first } }));
        var duplicate = await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(campaignId, itemId, "/order"), "ihand-keeper-3", new { handoutIds = new[] { first, first } }));

        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        Assert.Equal("The order does not match the Scene's current Handouts.", await ProblemTitleAsync(stale));
        Assert.Equal(["handoutIds"], (await ProblemsAsync(duplicate)).Keys);
        Assert.Equal(["First", "Second"], (await GetItemAsync(client, campaignId, itemId, "ihand-keeper-3")).GetProperty("handouts").EnumerateArray().Select(handout => handout.GetProperty("title").GetString()));
    }

    [Fact]
    public async Task Given_invalid_fields_When_adding_or_editing_a_Handout_Then_each_is_a_400_keyed_by_the_request_path()
    {
        var (client, campaignId, itemId) = await ItemAsync("ihand-keeper-4");
        var handoutId = await AddAsync(client, campaignId, itemId, "ihand-keeper-4", "Before");

        async Task<IReadOnlyDictionary<string, string[]>> PostAsync(object body) =>
            await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(campaignId, itemId), "ihand-keeper-4", body)));

        var emptyTitle = await PostAsync(HandoutBody(" "));
        var noKind = await PostAsync(new { visibility = "PlayerFacing", title = "T", content = Json(Text) });
        var noVisibility = await PostAsync(new { kind = "Text", title = "T", content = Json(Text) });
        var noContent = await PostAsync(new { kind = "Text", visibility = "PlayerFacing", title = "T" });
        var badContent = await PostAsync(HandoutBody(content: ImageNode));
        var imageKind = await PostAsync(HandoutBody(kind: "Image"));
        var onEdit = await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(campaignId, itemId, $"/{handoutId}"), "ihand-keeper-4", HandoutBody(" "))));

        Assert.Equal(["Enter a title."], emptyTitle["title"]);
        Assert.Equal(["kind"], noKind.Keys);
        Assert.Equal(["visibility"], noVisibility.Keys);
        Assert.Equal(["Enter the Handout text."], noContent["content"]);
        Assert.Equal(["content"], badContent.Keys);
        Assert.Equal(["kind"], imageKind.Keys);
        Assert.Equal(["title"], onEdit.Keys);
        Assert.Equal(1, await CountAsync(_factory, "Handouts"));
    }

    [Theory]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public async Task Given_an_Item_linked_to_an_Active_or_Finished_Scene_When_adding_editing_and_reordering_Handouts_Then_each_succeeds(SceneStatus status)
    {
        var client = _factory.CreateClient();
        var oid = $"ihand-keeper-5-{status}";
        var scene = await SceneAsync(client, oid);
        var itemId = (await CreateItemAsync(client, scene.CampaignId, oid)).GetProperty("id").GetGuid();
        var existing = await AddAsync(client, scene.CampaignId, itemId, oid, "Existing");
        await LinkItemAsync(client, scene, oid, itemId);
        await PlayAsync(_factory, scene.SceneId, status);

        var added = await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(scene.CampaignId, itemId), oid, HandoutBody("Added")));
        var edited = await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(scene.CampaignId, itemId, $"/{existing}"), oid, HandoutBody("Edited")));
        var reordered = await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(scene.CampaignId, itemId, "/order"), oid, new { handoutIds = new[] { (await BodyAsync(added)).GetProperty("id").GetGuid(), existing } }));

        Assert.Equal(HttpStatusCode.Created, added.StatusCode);
        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        Assert.Equal(HttpStatusCode.OK, reordered.StatusCode);
    }

    [Fact]
    public async Task Given_an_Item_linked_only_to_a_Prepared_Scene_When_deleting_a_Handout_Then_it_is_204()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "ihand-keeper-6");
        var itemId = (await CreateItemAsync(client, scene.CampaignId, "ihand-keeper-6")).GetProperty("id").GetGuid();
        await LinkItemAsync(client, scene, "ihand-keeper-6", itemId);
        var handoutId = await AddAsync(client, scene.CampaignId, itemId, "ihand-keeper-6");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Delete, HandoutsUri(scene.CampaignId, itemId, $"/{handoutId}"), "ihand-keeper-6"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(0, await CountAsync(_factory, "Handouts"));
    }

    [Theory]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public async Task Given_an_Item_linked_to_an_Active_or_Finished_Scene_When_deleting_a_Handout_Then_it_is_a_409_and_the_Handout_stays(SceneStatus status)
    {
        var client = _factory.CreateClient();
        var oid = $"ihand-keeper-7-{status}";
        var scene = await SceneAsync(client, oid);
        var itemId = (await CreateItemAsync(client, scene.CampaignId, oid)).GetProperty("id").GetGuid();
        var handoutId = await AddAsync(client, scene.CampaignId, itemId, oid);
        await LinkItemAsync(client, scene, oid, itemId);
        await PlayAsync(_factory, scene.SceneId, status);

        var response = await client.SendAsync(BuildRequest(HttpMethod.Delete, HandoutsUri(scene.CampaignId, itemId, $"/{handoutId}"), oid));
        var unknown = await client.SendAsync(BuildRequest(HttpMethod.Delete, HandoutsUri(scene.CampaignId, itemId, $"/{Guid.NewGuid()}"), oid));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(HandoutsKeptTitle, await ProblemTitleAsync(response));
        Assert.Equal(HttpStatusCode.Conflict, unknown.StatusCode);
        Assert.Equal(1, await CountAsync(_factory, "Handouts"));
    }

    [Fact]
    public async Task Given_a_player_or_another_keeper_or_other_ids_When_using_every_Item_Handout_endpoint_Then_each_is_the_same_404()
    {
        var (client, campaignId, itemId) = await ItemAsync("ihand-keeper-8");
        await JoinAsPlayerAsync(client, campaignId, "ihand-keeper-8", "ihand-player-8");
        var otherCampaignId = (await CreateCampaignAsync(client, "ihand-other-keeper-8")).Id;
        var foreignItemId = (await CreateItemAsync(client, otherCampaignId, "ihand-other-keeper-8")).GetProperty("id").GetGuid();
        var handoutId = await AddAsync(client, campaignId, itemId, "ihand-keeper-8");

        async Task<IReadOnlyList<string>> AnswersAsync(string oid, Guid campaign, Guid item, Guid handout)
        {
            var responses = new[]
            {
                await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(campaign, item, $"/{handout}"), oid)),
                await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(campaign, item), oid, HandoutBody())),
                await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(campaign, item, $"/{handout}"), oid, HandoutBody("Hijacked"))),
                await client.SendAsync(BuildRequest(HttpMethod.Delete, HandoutsUri(campaign, item, $"/{handout}"), oid)),
                await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(campaign, item, "/order"), oid, new { handoutIds = new[] { handout } })),
            };
            Assert.All(responses, response => Assert.Equal(HttpStatusCode.NotFound, response.StatusCode));
            var answers = new List<string>();
            foreach (var response in responses)
            {
                answers.Add(await WithoutTraceIdAsync(response));
            }

            return answers;
        }

        var player = await AnswersAsync("ihand-player-8", campaignId, itemId, handoutId);
        var otherKeeper = await AnswersAsync("ihand-other-keeper-8", campaignId, itemId, handoutId);
        var missingCampaign = await AnswersAsync("ihand-keeper-8", Guid.NewGuid(), itemId, handoutId);
        var foreignItem = await AnswersAsync("ihand-keeper-8", campaignId, foreignItemId, handoutId);
        var unknownItem = await AnswersAsync("ihand-keeper-8", campaignId, Guid.NewGuid(), handoutId);

        var unknownGet = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(campaignId, itemId, $"/{Guid.NewGuid()}"), "ihand-keeper-8"));
        var unknownPut = await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(campaignId, itemId, $"/{Guid.NewGuid()}"), "ihand-keeper-8", HandoutBody("Hijacked")));
        var unknownDelete = await client.SendAsync(BuildRequest(HttpMethod.Delete, HandoutsUri(campaignId, itemId, $"/{Guid.NewGuid()}"), "ihand-keeper-8"));

        Assert.All(new[] { otherKeeper, missingCampaign, foreignItem, unknownItem }, answers => Assert.Equal(player, answers));
        Assert.Equal(player[0], await WithoutTraceIdAsync(unknownGet));
        Assert.Equal(player[2], await WithoutTraceIdAsync(unknownPut));
        Assert.Equal(player[3], await WithoutTraceIdAsync(unknownDelete));
        Assert.Equal(1, await CountAsync(_factory, "Handouts"));
    }

    [Fact]
    public async Task Given_a_Scene_Handout_and_an_Item_Handout_with_the_same_ids_space_When_asking_the_other_owner_Then_the_Handout_is_not_found()
    {
        var (client, campaignId, itemId) = await ItemAsync("ihand-keeper-9");
        var scene = await SceneInCampaignAsync(client, campaignId, "ihand-keeper-9");
        var sceneHandout = await client.SendAsync(BuildRequest(HttpMethod.Post, $"{SceneUri(scene.CampaignId, scene.ScenarioId, scene.SceneId)}/handouts", "ihand-keeper-9", HandoutBody("On the Scene")));
        var sceneHandoutId = (await BodyAsync(sceneHandout)).GetProperty("id").GetGuid();
        var itemHandoutId = await AddAsync(client, campaignId, itemId, "ihand-keeper-9");

        var itemAsksForSceneHandout = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(campaignId, itemId, $"/{sceneHandoutId}"), "ihand-keeper-9"));
        var sceneAsksForItemHandout = await client.SendAsync(BuildRequest(HttpMethod.Get, $"{SceneUri(scene.CampaignId, scene.ScenarioId, scene.SceneId)}/handouts/{itemHandoutId}", "ihand-keeper-9"));

        Assert.Equal(HttpStatusCode.NotFound, itemAsksForSceneHandout.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, sceneAsksForItemHandout.StatusCode);
    }
}
