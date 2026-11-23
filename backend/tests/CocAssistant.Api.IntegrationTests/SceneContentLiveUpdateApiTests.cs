namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// Scene content writes publish the Keeper-only scenes topic through the assembled Api (specs/scene-play/spec.md, Live
/// updates; PBI-SPL-008): the Keeper's connection hears scenes, and no Player does. The Public Wall Entry posted after
/// each change is the ordering barrier: a Player whose next signal is wallEntries heard no scenes about the change.
/// </summary>
public class SceneContentLiveUpdateApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private const string Text =
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The door creaks open\"}]}]}}";

    private const string Notes =
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Cellar key\"}]}]}}";

    private readonly IdentityApiFactory _factory;

    public SceneContentLiveUpdateApiTests(IdentityApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await ResetDatabaseAsync(_factory);
        foreach (var blob in StoredBlobs())
        {
            File.Delete(Path.Combine(_factory.HandoutFilesDirectory, blob));
        }
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private sealed record Table(
        HttpClient Client,
        string KeeperOid,
        string HarveyOid,
        string LucyOid,
        Guid CampaignId,
        Guid ScenarioId,
        Guid SceneA,
        Guid SceneB,
        Guid ItemId,
        Guid NpcId,
        Guid HandoutA1,
        Guid HandoutA2,
        Guid ItemHandout1,
        Guid ItemHandout2,
        Guid FileHandoutId,
        Guid NpeLinkId,
        Guid ItemLinkId,
        CampaignHubTestClient KeeperHub,
        CampaignHubTestClient HarveyHub,
        CampaignHubTestClient LucyHub);

    private static string ScenesUri(Guid campaignId, Guid scenarioId, string suffix = "") =>
        $"/api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes{suffix}";

    private static string HandoutsUri(Guid campaignId, Guid scenarioId, Guid sceneId, string suffix = "") =>
        ScenesUri(campaignId, scenarioId, $"/{sceneId}/handouts{suffix}");

    private static string LinksUri(Guid campaignId, Guid scenarioId, Guid sceneId, string suffix = "") =>
        ScenesUri(campaignId, scenarioId, $"/{sceneId}/non-player-entity-links{suffix}");

    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static async Task<JsonElement> BodyAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();

    private static object HandoutBody(string? title = "Arrival") => new
    {
        kind = "ReadAloud",
        visibility = "PlayerFacing",
        title,
        content = Json(Text),
    };

    private static HttpRequestMessage FileUpload(HttpMethod method, string uri, string oid, string? title = "Floor plan")
    {
        var png = ScenarioPreparation.Tests.HandoutFileSamples.Png();
        var content = new MultipartFormDataContent
        {
            { new StringContent("Image"), "kind" },
            { new StringContent("PlayerFacing"), "visibility" },
            { new StringContent(title), "title" },
        };
        var part = new ByteArrayContent(png);
        part.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
        content.Add(part, "file", "plan.png");
        var request = BuildRequest(method, uri, oid);
        request.Content = content;
        return request;
    }

    private async Task<Table> TableAsync(string suffix)
    {
        var client = _factory.CreateClient();
        var keeperOid = $"scenes-keeper-{suffix}";
        var harveyOid = $"scenes-harvey-{suffix}";
        var lucyOid = $"scenes-lucy-{suffix}";
        var campaignId = (await CreateCampaignAsync(client, keeperOid)).Id;
        await JoinAsPlayerAsync(client, campaignId, keeperOid, harveyOid);
        await JoinAsPlayerAsync(client, campaignId, keeperOid, lucyOid);
        var scenario = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/scenarios", keeperOid, new { title = "The Haunting" }));
        var scenarioId = (await BodyAsync(scenario)).GetProperty("id").GetGuid();
        var sceneA = await CreateSceneAsync(client, campaignId, scenarioId, keeperOid, "The Corbitt House");
        var sceneB = await CreateSceneAsync(client, campaignId, scenarioId, keeperOid, "Meeting Knott");
        var itemId = (await ItemApiRequests.CreateItemAsync(client, campaignId, keeperOid)).GetProperty("id").GetGuid();
        var npc = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/human-npcs", keeperOid, new { name = "Mr. Knott", age = 62 }));
        var npcId = (await BodyAsync(npc)).GetProperty("id").GetGuid();
        var itemLinkId = (await ItemApiRequests.LinkItemAsync(client, (campaignId, scenarioId, sceneA), keeperOid, itemId)).GetProperty("id").GetGuid();
        var npeLink = await client.SendAsync(BuildRequest(
            HttpMethod.Post, LinksUri(campaignId, scenarioId, sceneA), keeperOid,
            new { nonPlayerEntity = new { type = "HumanNpc", id = npcId }, playerFacingName = "A shape in the cellar", playerFacingDescription = (JsonElement?)null }));
        var npeLinkId = (await BodyAsync(npeLink)).GetProperty("id").GetGuid();
        var handoutA1 = await CreateHandoutAsync(client, campaignId, scenarioId, sceneA, keeperOid, "First");
        var handoutA2 = await CreateHandoutAsync(client, campaignId, scenarioId, sceneA, keeperOid, "Second");
        var itemHandout1 = await CreateItemHandoutAsync(client, campaignId, itemId, keeperOid, "First entry");
        var itemHandout2 = await CreateItemHandoutAsync(client, campaignId, itemId, keeperOid, "Second entry");
        var fileHandout = await client.SendAsync(FileUpload(HttpMethod.Post, HandoutsUri(campaignId, scenarioId, sceneA), keeperOid));
        var fileHandoutId = (await BodyAsync(fileHandout)).GetProperty("id").GetGuid();

        var (keeperHub, _) = await CampaignHubTestClient.SubscribeAsync(_factory, keeperOid, campaignId);
        var (harveyHub, _) = await CampaignHubTestClient.SubscribeAsync(_factory, harveyOid, campaignId);
        var (lucyHub, _) = await CampaignHubTestClient.SubscribeAsync(_factory, lucyOid, campaignId);
        return new Table(
            client, keeperOid, harveyOid, lucyOid, campaignId, scenarioId, sceneA, sceneB, itemId, npcId,
            handoutA1, handoutA2, itemHandout1, itemHandout2, fileHandoutId, npeLinkId, itemLinkId,
            keeperHub, harveyHub, lucyHub);
    }

    private static async Task<Guid> CreateSceneAsync(HttpClient client, Guid campaignId, Guid scenarioId, string oid, string title)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, ScenesUri(campaignId, scenarioId), oid, new { title }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await BodyAsync(response)).GetProperty("id").GetGuid();
    }

    private static async Task<Guid> CreateHandoutAsync(HttpClient client, Guid campaignId, Guid scenarioId, Guid sceneId, string oid, string title)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(campaignId, scenarioId, sceneId), oid, HandoutBody(title)));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await BodyAsync(response)).GetProperty("id").GetGuid();
    }

    private static async Task<Guid> CreateItemHandoutAsync(HttpClient client, Guid campaignId, Guid itemId, string oid, string title)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, ItemApiRequests.ItemsUri(campaignId, $"/{itemId}/handouts"), oid, HandoutBody(title)));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await BodyAsync(response)).GetProperty("id").GetGuid();
    }

    private string[] StoredBlobs() =>
        Directory.Exists(_factory.HandoutFilesDirectory) ? Directory.GetFiles(_factory.HandoutFilesDirectory).Select(Path.GetFileName).OfType<string>().ToArray() : [];

    private static async Task<string[]> NextTopicsAsync(CampaignHubTestClient client, Guid campaignId)
    {
        while (true)
        {
            if (await client.NextMessageAsync() is CampaignDataChangedMessage message && message.CampaignId == campaignId)
            {
                return message.Topics.ToArray();
            }
        }
    }

    private static async Task ActAsync(Table table, string kind)
    {
        var response = kind switch
        {
            "SceneCreate" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Post, ScenesUri(table.CampaignId, table.ScenarioId), table.KeeperOid, new { title = "Edge of Darkness" })),
            "SceneEdit" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Put, ScenesUri(table.CampaignId, table.ScenarioId, $"/{table.SceneA}"), table.KeeperOid,
                new { title = "Renamed", location = "Arkham", keeperNotes = Json(Notes) })),
            "SceneReorder" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Put, ScenesUri(table.CampaignId, table.ScenarioId, "/order"), table.KeeperOid, new { sceneIds = new[] { table.SceneB, table.SceneA } })),
            "SceneRemove" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Delete, ScenesUri(table.CampaignId, table.ScenarioId, $"/{table.SceneB}"), table.KeeperOid)),
            "HandoutCreate" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Post, HandoutsUri(table.CampaignId, table.ScenarioId, table.SceneA), table.KeeperOid, HandoutBody("Added"))),
            "HandoutEdit" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Put, HandoutsUri(table.CampaignId, table.ScenarioId, table.SceneA, $"/{table.HandoutA1}"), table.KeeperOid, HandoutBody("Edited"))),
            "HandoutRemove" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Delete, HandoutsUri(table.CampaignId, table.ScenarioId, table.SceneA, $"/{table.HandoutA2}"), table.KeeperOid)),
            "HandoutReorder" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Put, HandoutsUri(table.CampaignId, table.ScenarioId, table.SceneA, "/order"), table.KeeperOid,
                new { handoutIds = new[] { table.HandoutA2, table.FileHandoutId, table.HandoutA1 } })),
            "ItemHandoutCreate" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Post, ItemApiRequests.ItemsUri(table.CampaignId, $"/{table.ItemId}/handouts"), table.KeeperOid, HandoutBody("Added entry"))),
            "ItemHandoutEdit" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Put, ItemApiRequests.ItemsUri(table.CampaignId, $"/{table.ItemId}/handouts/{table.ItemHandout1}"), table.KeeperOid, HandoutBody("Edited entry"))),
            "ItemHandoutRemove" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Delete, ItemApiRequests.ItemsUri(table.CampaignId, $"/{table.ItemId}/handouts/{table.ItemHandout2}"), table.KeeperOid)),
            "ItemHandoutReorder" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Put, ItemApiRequests.ItemsUri(table.CampaignId, $"/{table.ItemId}/handouts/order"), table.KeeperOid,
                new { handoutIds = new[] { table.ItemHandout2, table.ItemHandout1 } })),
            "FileHandoutCreate" => await table.Client.SendAsync(FileUpload(
                HttpMethod.Post, HandoutsUri(table.CampaignId, table.ScenarioId, table.SceneA), table.KeeperOid, "Added plan")),
            "FileHandoutEdit" => await table.Client.SendAsync(FileUpload(
                HttpMethod.Put, HandoutsUri(table.CampaignId, table.ScenarioId, table.SceneA, $"/{table.FileHandoutId}"), table.KeeperOid, "Revised plan")),
            "NpeLinkCreate" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Post, LinksUri(table.CampaignId, table.ScenarioId, table.SceneA), table.KeeperOid,
                new { nonPlayerEntity = new { type = "HumanNpc", id = table.NpcId }, playerFacingName = "Another shape", playerFacingDescription = (JsonElement?)null })),
            "NpeEdit" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Put, LinksUri(table.CampaignId, table.ScenarioId, table.SceneA, $"/{table.NpeLinkId}"), table.KeeperOid,
                new { playerFacingName = "After", playerFacingDescription = (JsonElement?)null })),
            "NpeUnlink" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Delete, LinksUri(table.CampaignId, table.ScenarioId, table.SceneA, $"/{table.NpeLinkId}"), table.KeeperOid)),
            "ItemLinkCreate" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Post, ItemApiRequests.ItemLinksUri(table.CampaignId, table.ScenarioId, table.SceneB), table.KeeperOid, new { itemId = table.ItemId })),
            "ItemUnlink" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Delete, ItemApiRequests.ItemLinksUri(table.CampaignId, table.ScenarioId, table.SceneA, $"/{table.ItemLinkId}"), table.KeeperOid)),
            "ItemEdit" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Put, ItemApiRequests.ItemsUri(table.CampaignId, $"/{table.ItemId}"), table.KeeperOid, ItemApiRequests.ItemBody("Renamed diary"))),
            "ItemDelete" => await table.Client.SendAsync(BuildRequest(
                HttpMethod.Delete, ItemApiRequests.ItemsUri(table.CampaignId, $"/{table.ItemId}"), table.KeeperOid)),
            _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, "Unknown scene content write."),
        };

        var expected = kind switch
        {
            "SceneCreate" or "HandoutCreate" or "ItemHandoutCreate" or "FileHandoutCreate" or "NpeLinkCreate" or "ItemLinkCreate" => HttpStatusCode.Created,
            "SceneRemove" or "HandoutRemove" or "ItemHandoutRemove" or "NpeUnlink" or "ItemUnlink" or "ItemDelete" => HttpStatusCode.NoContent,
            _ => HttpStatusCode.OK,
        };
        Assert.Equal(expected, response.StatusCode);
    }

    [Theory]
    [InlineData("SceneCreate")]
    [InlineData("SceneEdit")]
    [InlineData("SceneReorder")]
    [InlineData("SceneRemove")]
    [InlineData("HandoutCreate")]
    [InlineData("HandoutEdit")]
    [InlineData("HandoutRemove")]
    [InlineData("HandoutReorder")]
    [InlineData("ItemHandoutCreate")]
    [InlineData("ItemHandoutEdit")]
    [InlineData("ItemHandoutRemove")]
    [InlineData("ItemHandoutReorder")]
    [InlineData("FileHandoutCreate")]
    [InlineData("FileHandoutEdit")]
    [InlineData("NpeLinkCreate")]
    [InlineData("NpeEdit")]
    [InlineData("NpeUnlink")]
    [InlineData("ItemLinkCreate")]
    [InlineData("ItemUnlink")]
    [InlineData("ItemEdit")]
    [InlineData("ItemDelete")]
    public async Task Given_connected_members_When_scene_content_changes_Then_the_keeper_hears_scenes_and_no_player_does(string kind)
    {
        var table = await TableAsync(kind);
        await using var _1 = table.KeeperHub;
        await using var _2 = table.HarveyHub;
        await using var _3 = table.LucyHub;

        await ActAsync(table, kind);

        var sentinel = await table.Client.SendAsync(BuildRequest(
            HttpMethod.Post, $"/api/campaigns/{table.CampaignId}/wall-entries", table.KeeperOid, new { text = "The lamp goes out.", visibility = "Public" }));
        Assert.Equal(HttpStatusCode.Created, sentinel.StatusCode);

        Assert.Equal(["scenes"], await NextTopicsAsync(table.KeeperHub, table.CampaignId));
        Assert.Equal(["wallEntries"], await NextTopicsAsync(table.KeeperHub, table.CampaignId));
        Assert.Equal(["wallEntries"], await NextTopicsAsync(table.HarveyHub, table.CampaignId));
        Assert.Equal(["wallEntries"], await NextTopicsAsync(table.LucyHub, table.CampaignId));
    }

    [Fact]
    public async Task Given_a_finished_scene_When_editing_Then_it_is_409_and_the_keeper_hears_only_the_sentinel()
    {
        var table = await TableAsync("refused");
        await using var _1 = table.KeeperHub;
        await using var _2 = table.HarveyHub;
        await using var _3 = table.LucyHub;
        await ItemApiRequests.PlayAsync(_factory, table.SceneA, SceneStatus.Finished);

        var edit = await table.Client.SendAsync(BuildRequest(
            HttpMethod.Put, ScenesUri(table.CampaignId, table.ScenarioId, $"/{table.SceneA}"), table.KeeperOid,
            new { title = "Renamed", location = "Arkham", keeperNotes = Json(Notes) }));
        Assert.Equal(HttpStatusCode.Conflict, edit.StatusCode);

        var sentinel = await table.Client.SendAsync(BuildRequest(
            HttpMethod.Post, $"/api/campaigns/{table.CampaignId}/wall-entries", table.KeeperOid, new { text = "The lamp goes out.", visibility = "Public" }));
        Assert.Equal(HttpStatusCode.Created, sentinel.StatusCode);

        Assert.Equal(["wallEntries"], await NextTopicsAsync(table.KeeperHub, table.CampaignId));
        Assert.Equal(["wallEntries"], await NextTopicsAsync(table.HarveyHub, table.CampaignId));
        Assert.Equal(["wallEntries"], await NextTopicsAsync(table.LucyHub, table.CampaignId));
    }
}
