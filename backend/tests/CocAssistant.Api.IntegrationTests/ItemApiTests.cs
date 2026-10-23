namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Item API (specs/scenario-preparation/spec.md, Item API; PBI-SP-008): create, list, get, edit and delete, Keeper-only, with
/// the 400 keys of ADR 0018, an identical 404 for a Player, another Campaign's Keeper and foreign ids (ADR 0013), and the 409 that
/// protects an Item in play (ADR 0022). Active and Finished Scenes are seeded through the domain transitions because no endpoint
/// plays a Scene yet; a held Item cannot exist before PBI-SPL-003 and is covered by the ItemService unit tests.
/// </summary>
public class ItemApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public ItemApiTests(IdentityApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await ResetDatabaseAsync(_factory);
        foreach (var blob in StoredBlobs())
        {
            File.Delete(Path.Combine(_factory.HandoutFilesDirectory, blob));
        }
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private static readonly byte[] Png = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");

    private string[] StoredBlobs() =>
        Directory.Exists(_factory.HandoutFilesDirectory) ? Directory.GetFiles(_factory.HandoutFilesDirectory).Select(Path.GetFileName).OfType<string>().ToArray() : [];

    private static HttpRequestMessage ImageUpload(string uri, string oid)
    {
        var content = new MultipartFormDataContent
        {
            { new StringContent("Image"), "kind" },
            { new StringContent("PlayerFacing"), "visibility" },
            { new StringContent("A photograph"), "title" },
        };
        var part = new ByteArrayContent(Png);
        part.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
        content.Add(part, "file", "photo.png");
        var request = BuildRequest(HttpMethod.Post, uri, oid);
        request.Content = content;
        return request;
    }

    [Fact]
    public async Task Given_a_keeper_When_creating_an_Item_Then_it_is_201_with_the_trimmed_name_both_texts_no_holder_Handouts_or_Scenes()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "item-keeper-1")).Id;

        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, ItemsUri(campaignId), "item-keeper-1", ItemBody("  Walter Corbitt's diary ")));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await BodyAsync(response);
        Assert.Equal(["id", "name", "playerFacingDescription", "keeperNotes", "holder", "handouts", "scenes"], body.EnumerateObject().Select(property => property.Name));
        Assert.Equal("Walter Corbitt's diary", body.GetProperty("name").GetString());
        Assert.Equal(Description, body.GetProperty("playerFacingDescription").GetRawText());
        Assert.Equal(Notes, body.GetProperty("keeperNotes").GetRawText());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("holder").ValueKind);
        Assert.Equal(0, body.GetProperty("handouts").GetArrayLength());
        Assert.Equal(0, body.GetProperty("scenes").GetArrayLength());
    }

    [Fact]
    public async Task Given_no_Keeper_notes_When_creating_an_Item_Then_the_notes_are_null()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "item-keeper-2")).Id;

        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, ItemsUri(campaignId), "item-keeper-2", ItemBody(keeperNotes: null)));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(JsonValueKind.Null, (await BodyAsync(response)).GetProperty("keeperNotes").ValueKind);
    }

    [Fact]
    public async Task Given_a_campaign_with_Items_When_listing_Then_they_are_ordered_by_name_with_their_Scene_counts_and_other_Campaigns_are_left_out()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "item-keeper-3");
        var diary = await CreateItemAsync(client, scene.CampaignId, "item-keeper-3", "Walter Corbitt's diary");
        await CreateItemAsync(client, scene.CampaignId, "item-keeper-3", "The cellar key");
        var otherCampaignId = (await CreateCampaignAsync(client, "item-keeper-3")).Id;
        await CreateItemAsync(client, otherCampaignId, "item-keeper-3", "Elsewhere");
        await LinkItemAsync(client, scene, "item-keeper-3", diary.GetProperty("id").GetGuid());

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, ItemsUri(scene.CampaignId), "item-keeper-3"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = (await BodyAsync(response)).GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(
            [("The cellar key", 0), ("Walter Corbitt's diary", 1)],
            items.Select(item => (item.GetProperty("name").GetString(), item.GetProperty("sceneCount").GetInt32())));
        Assert.Equal(["id", "name", "sceneCount"], items[0].EnumerateObject().Select(property => property.Name));
    }

    [Fact]
    public async Task Given_an_empty_campaign_When_listing_Items_Then_the_list_is_an_empty_array()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "item-keeper-4")).Id;

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, ItemsUri(campaignId), "item-keeper-4"));

        Assert.Equal(0, (await BodyAsync(response)).GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task Given_an_Item_with_a_Handout_and_two_links_When_getting_it_Then_Handouts_and_Scenes_are_listed_in_order_with_status()
    {
        var client = _factory.CreateClient();
        var first = await SceneAsync(client, "item-keeper-5");
        var second = await SceneInCampaignAsync(client, first.CampaignId, "item-keeper-5", "The cellar");
        var item = await CreateItemAsync(client, first.CampaignId, "item-keeper-5");
        var itemId = item.GetProperty("id").GetGuid();
        await LinkItemAsync(client, first, "item-keeper-5", itemId);
        await LinkItemAsync(client, second, "item-keeper-5", itemId);
        await client.SendAsync(BuildRequest(HttpMethod.Post, ItemsUri(first.CampaignId, $"/{itemId}/handouts"), "item-keeper-5", new { kind = "Text", visibility = "PlayerFacing", title = "The last entry", content = Json(Notes) }));
        await PlayAsync(_factory, second.SceneId, SceneStatus.Active);

        var body = await GetItemAsync(client, first.CampaignId, itemId, "item-keeper-5");

        var handout = Assert.Single(body.GetProperty("handouts").EnumerateArray());
        Assert.Equal(["id", "kind", "visibility", "title"], handout.EnumerateObject().Select(property => property.Name));
        var scenes = body.GetProperty("scenes").EnumerateArray().ToList();
        Assert.Equal(["scenarioId", "scenarioTitle", "id", "title", "status"], scenes[0].EnumerateObject().Select(property => property.Name));
        Assert.Equal(
            [("The Haunting", "The Corbitt House", "Prepared"), ("The Haunting", "The cellar", "Active")],
            scenes.Select(scene => (scene.GetProperty("scenarioTitle").GetString(), scene.GetProperty("title").GetString(), scene.GetProperty("status").GetString())));
    }

    [Fact]
    public async Task Given_an_Item_When_editing_Then_the_fields_are_replaced_even_while_a_linked_Scene_is_Finished()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "item-keeper-6");
        var itemId = (await CreateItemAsync(client, scene.CampaignId, "item-keeper-6")).GetProperty("id").GetGuid();
        await LinkItemAsync(client, scene, "item-keeper-6", itemId);
        await PlayAsync(_factory, scene.SceneId, SceneStatus.Finished);

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, ItemsUri(scene.CampaignId, $"/{itemId}"), "item-keeper-6", ItemBody(" The diary ", Notes, null)));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var stored = await GetItemAsync(client, scene.CampaignId, itemId, "item-keeper-6");
        Assert.Equal("The diary", stored.GetProperty("name").GetString());
        Assert.Equal(Notes, stored.GetProperty("playerFacingDescription").GetRawText());
        Assert.Equal(JsonValueKind.Null, stored.GetProperty("keeperNotes").ValueKind);
        Assert.Equal("Finished", Assert.Single(stored.GetProperty("scenes").EnumerateArray()).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Given_invalid_fields_When_creating_or_editing_an_Item_Then_each_is_a_400_keyed_by_the_request_path_with_a_server_owned_message()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "item-keeper-7")).Id;
        var itemId = (await CreateItemAsync(client, campaignId, "item-keeper-7", "Before")).GetProperty("id").GetGuid();

        async Task<IReadOnlyDictionary<string, string[]>> PostAsync(object body) =>
            await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Post, ItemsUri(campaignId), "item-keeper-7", body)));

        var emptyName = await PostAsync(ItemBody(""));
        var noName = await PostAsync(new { playerFacingDescription = Json(Description) });
        var longName = await PostAsync(ItemBody(new string('n', 201)));
        var noDescription = await PostAsync(ItemBody(description: null));
        var blankDescription = await PostAsync(ItemBody(description: Blank));
        var badDescription = await PostAsync(ItemBody(description: ImageNode));
        var badNotes = await PostAsync(ItemBody(keeperNotes: ImageNode));
        var onEdit = await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Put, ItemsUri(campaignId, $"/{itemId}"), "item-keeper-7", ItemBody("After", ImageNode))));

        Assert.Equal(["Enter a name."], emptyName["name"]);
        Assert.Equal(["Enter a name."], noName["name"]);
        Assert.Equal(["Name must be 200 characters or fewer."], longName["name"]);
        Assert.All(new[] { noDescription, blankDescription }, problems => Assert.Equal(["Enter a Player-facing description."], problems["playerFacingDescription"]));
        Assert.Equal([$"The Player-facing description must use only the allowed rich-text nodes and be at most {RichTextDocument.MaxBytes} bytes."], badDescription["playerFacingDescription"]);
        Assert.Equal(["keeperNotes"], badNotes.Keys);
        Assert.Equal(["playerFacingDescription"], onEdit.Keys);
        Assert.Equal("Before", (await GetItemAsync(client, campaignId, itemId, "item-keeper-7")).GetProperty("name").GetString());
        Assert.Equal(1, await CountAsync(_factory, "Items"));
    }

    [Fact]
    public async Task Given_a_player_or_another_keeper_or_other_ids_When_using_every_Item_endpoint_Then_each_is_the_same_404()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "item-keeper-8")).Id;
        await JoinAsPlayerAsync(client, campaignId, "item-keeper-8", "item-player-8");
        var otherCampaignId = (await CreateCampaignAsync(client, "item-other-keeper-8")).Id;
        var itemId = (await CreateItemAsync(client, campaignId, "item-keeper-8")).GetProperty("id").GetGuid();
        var foreignItemId = (await CreateItemAsync(client, otherCampaignId, "item-other-keeper-8")).GetProperty("id").GetGuid();

        async Task<IReadOnlyList<string>> ItemAnswersAsync(string oid, Guid campaign, Guid item)
        {
            var uri = ItemsUri(campaign, $"/{item}");
            var responses = new[]
            {
                await client.SendAsync(BuildRequest(HttpMethod.Get, uri, oid)),
                await client.SendAsync(BuildRequest(HttpMethod.Put, uri, oid, ItemBody("Hijacked"))),
                await client.SendAsync(BuildRequest(HttpMethod.Delete, uri, oid)),
            };
            Assert.All(responses, response => Assert.Equal(HttpStatusCode.NotFound, response.StatusCode));
            return [await WithoutTraceIdAsync(responses[0]), await WithoutTraceIdAsync(responses[1]), await WithoutTraceIdAsync(responses[2])];
        }

        async Task<IReadOnlyList<string>> CampaignAnswersAsync(string oid, Guid campaign)
        {
            var responses = new[]
            {
                await client.SendAsync(BuildRequest(HttpMethod.Get, ItemsUri(campaign), oid)),
                await client.SendAsync(BuildRequest(HttpMethod.Post, ItemsUri(campaign), oid, ItemBody())),
            };
            Assert.All(responses, response => Assert.Equal(HttpStatusCode.NotFound, response.StatusCode));
            return [await WithoutTraceIdAsync(responses[0]), await WithoutTraceIdAsync(responses[1])];
        }

        var player = await ItemAnswersAsync("item-player-8", campaignId, itemId);
        var otherKeeper = await ItemAnswersAsync("item-other-keeper-8", campaignId, itemId);
        var missingCampaign = await ItemAnswersAsync("item-keeper-8", Guid.NewGuid(), itemId);
        var foreignItem = await ItemAnswersAsync("item-keeper-8", campaignId, foreignItemId);
        var unknownItem = await ItemAnswersAsync("item-keeper-8", campaignId, Guid.NewGuid());
        var playerCampaign = await CampaignAnswersAsync("item-player-8", campaignId);
        var otherKeeperCampaign = await CampaignAnswersAsync("item-other-keeper-8", campaignId);
        var missingCampaignCampaign = await CampaignAnswersAsync("item-keeper-8", Guid.NewGuid());

        Assert.All(new[] { otherKeeper, missingCampaign, foreignItem, unknownItem }, answers => Assert.Equal(player, answers));
        Assert.All(new[] { otherKeeperCampaign, missingCampaignCampaign }, answers => Assert.Equal(playerCampaign, answers));
        Assert.Equal("Walter Corbitt's diary", (await GetItemAsync(client, campaignId, itemId, "item-keeper-8")).GetProperty("name").GetString());
        Assert.Equal(2, await CountAsync(_factory, "Items"));
    }

    [Fact]
    public async Task Given_an_Item_linked_only_to_a_Prepared_Scene_with_a_file_Handout_When_deleting_Then_it_is_204_and_the_link_Handout_and_file_are_gone()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "item-keeper-9");
        var itemId = (await CreateItemAsync(client, scene.CampaignId, "item-keeper-9")).GetProperty("id").GetGuid();
        await LinkItemAsync(client, scene, "item-keeper-9", itemId);
        var upload = await client.SendAsync(ImageUpload(ItemsUri(scene.CampaignId, $"/{itemId}/handouts"), "item-keeper-9"));
        Assert.Equal(HttpStatusCode.Created, upload.StatusCode);
        Assert.Single(StoredBlobs());

        var response = await client.SendAsync(BuildRequest(HttpMethod.Delete, ItemsUri(scene.CampaignId, $"/{itemId}"), "item-keeper-9"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal((0, 0, 0), (await CountAsync(_factory, "Items"), await CountAsync(_factory, "ItemLinks"), await CountAsync(_factory, "Handouts")));
        Assert.Empty(StoredBlobs());
        Assert.Empty((await GetSceneAsync(client, scene, "item-keeper-9")).GetProperty("itemLinks").EnumerateArray());
        Assert.Equal(HttpStatusCode.NotFound, (await client.SendAsync(BuildRequest(HttpMethod.Get, ItemsUri(scene.CampaignId, $"/{itemId}"), "item-keeper-9"))).StatusCode);
    }

    [Theory]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public async Task Given_an_Item_linked_to_an_Active_or_Finished_Scene_When_deleting_Then_it_is_a_409_and_the_Item_its_Handouts_and_files_stay(SceneStatus status)
    {
        var client = _factory.CreateClient();
        var oid = $"item-keeper-10-{status}";
        var scene = await SceneAsync(client, oid);
        var itemId = (await CreateItemAsync(client, scene.CampaignId, oid)).GetProperty("id").GetGuid();
        await LinkItemAsync(client, scene, oid, itemId);
        await client.SendAsync(ImageUpload(ItemsUri(scene.CampaignId, $"/{itemId}/handouts"), oid));
        await PlayAsync(_factory, scene.SceneId, status);

        var response = await client.SendAsync(BuildRequest(HttpMethod.Delete, ItemsUri(scene.CampaignId, $"/{itemId}"), oid));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(InPlayTitle, await ProblemTitleAsync(response));
        Assert.Equal((1, 1, 1), (await CountAsync(_factory, "Items"), await CountAsync(_factory, "ItemLinks"), await CountAsync(_factory, "Handouts")));
        Assert.Single(StoredBlobs());
    }

    [Fact]
    public async Task Given_an_Item_linked_to_a_Prepared_and_a_Finished_Scene_When_deleting_Then_it_is_a_409()
    {
        var client = _factory.CreateClient();
        var prepared = await SceneAsync(client, "item-keeper-11");
        var finished = await SceneInCampaignAsync(client, prepared.CampaignId, "item-keeper-11", "The cellar");
        var itemId = (await CreateItemAsync(client, prepared.CampaignId, "item-keeper-11")).GetProperty("id").GetGuid();
        await LinkItemAsync(client, prepared, "item-keeper-11", itemId);
        await LinkItemAsync(client, finished, "item-keeper-11", itemId);
        await PlayAsync(_factory, finished.SceneId, SceneStatus.Finished);

        var response = await client.SendAsync(BuildRequest(HttpMethod.Delete, ItemsUri(prepared.CampaignId, $"/{itemId}"), "item-keeper-11"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(2, await CountAsync(_factory, "ItemLinks"));
    }
}
