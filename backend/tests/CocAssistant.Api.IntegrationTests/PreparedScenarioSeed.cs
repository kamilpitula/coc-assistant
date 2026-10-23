namespace CocAssistant.Api.IntegrationTests;

/// <summary>The ids of one Campaign's fully prepared Scenario material (PBI-SP-006).</summary>
public sealed record PreparedScenarioIds(
    Guid ScenarioId,
    Guid SceneId,
    Guid HumanNpcId,
    Guid MythosCreatureId,
    Guid NonPlayerEntityLinkId,
    Guid SceneHandoutId,
    Guid SceneFileHandoutId,
    Guid ItemId,
    Guid ItemLinkId,
    Guid ItemHandoutId,
    Guid ItemFileHandoutId);

/// <summary>
/// Prepares every kind of Scenario material for a Campaign over HTTP as its Keeper. Every text field carries a text starting with
/// <see cref="SecretPrefix"/>, so a test can prove that no response to anyone else contains prepared material.
/// </summary>
public static class PreparedScenarioSeed
{
    public const string SecretPrefix = "prepared-secret";

    public static string Secret(string label) => $"{SecretPrefix}-{label}";

    public static string RichText(string text) =>
        JsonSerializer.Serialize(new
        {
            root = new { type = "root", children = new object[] { new { type = "paragraph", children = new object[] { new { type = "text", text } } } } },
        });

    public static async Task<PreparedScenarioIds> PrepareAsync(HttpClient client, Guid campaignId, string keeperOid)
    {
        var scenarioId = await CreateAsync(client, $"/api/campaigns/{campaignId}/scenarios", keeperOid, new { title = Secret("scenario-title"), keeperNotes = Secret("scenario-notes") });
        var scenes = $"/api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes";
        var sceneId = await CreateAsync(client, scenes, keeperOid, new { title = Secret("scene-title"), location = Secret("scene-location"), keeperNotes = Json(RichText(Secret("scene-notes"))) });
        var humanId = await CreateHumanNpcAsync(client, campaignId, keeperOid);
        var mythosId = await CreateMythosCreatureAsync(client, campaignId, keeperOid);
        var link = await CreateAsync(client, $"{scenes}/{sceneId}/non-player-entity-links", keeperOid, new
        {
            nonPlayerEntity = new { type = "HumanNpc", id = humanId },
            playerFacingName = Secret("link-name"),
            playerFacingDescription = Json(RichText(Secret("link-description"))),
        });
        var sceneHandouts = $"{scenes}/{sceneId}/handouts";
        var sceneHandout = await CreateAsync(client, sceneHandouts, keeperOid, HandoutBody("scene-handout"));
        var sceneFile = await CreateFileHandoutAsync(client, sceneHandouts, keeperOid, "scene-file");
        var itemId = await CreateAsync(client, $"/api/campaigns/{campaignId}/items", keeperOid, ItemBody("item"));
        var itemLink = await CreateAsync(client, $"{scenes}/{sceneId}/item-links", keeperOid, new { itemId });
        var itemHandouts = $"/api/campaigns/{campaignId}/items/{itemId}/handouts";
        var itemHandout = await CreateAsync(client, itemHandouts, keeperOid, HandoutBody("item-handout"));
        var itemFile = await CreateFileHandoutAsync(client, itemHandouts, keeperOid, "item-file");
        return new PreparedScenarioIds(scenarioId, sceneId, humanId, mythosId, link, sceneHandout, sceneFile, itemId, itemLink, itemHandout, itemFile);
    }

    public static object HandoutBody(string label, string kind = "Text", string visibility = "KeeperFacing") => new
    {
        kind,
        visibility,
        title = Secret($"{label}-title"),
        content = Json(RichText(Secret($"{label}-text"))),
    };

    public static object ItemBody(string label) => new
    {
        name = Secret($"{label}-name"),
        playerFacingDescription = Json(RichText(Secret($"{label}-description"))),
        keeperNotes = Json(RichText(Secret($"{label}-notes"))),
    };

    public static object HumanNpcBody(string label) => new
    {
        name = Secret($"{label}-name"),
        age = 62,
        details = new { professionOrRole = Secret($"{label}-role"), secrets = Secret($"{label}-secrets") },
        keeperNotes = Json(RichText(Secret($"{label}-notes"))),
        characteristics = new Dictionary<string, int?> { ["STR"] = 70, ["CON"] = 60, ["SIZ"] = 65, ["DEX"] = 55, ["POW"] = 50 },
    };

    public static object MythosCreatureBody(string label) => new
    {
        name = Secret($"{label}-name"),
        details = new { creatureKind = "mythos", defeatOutcome = Secret($"{label}-defeat") },
        keeperNotes = Json(RichText(Secret($"{label}-notes"))),
        characteristics = new
        {
            values = new Dictionary<string, int?> { ["STR"] = 80, ["CON"] = 60, ["SIZ"] = 60, ["DEX"] = 60, ["INT"] = 60, ["POW"] = 60 },
            hitPointsNotApplicable = false,
            overrides = (object?)null,
        },
    };

    /// <summary>A multipart Image/Document/Map body; the file is a valid PNG (or PDF for a Document).</summary>
    public static MultipartFormDataContent FileHandoutContent(string label, string kind = "Image", string visibility = "KeeperFacing")
    {
        var content = new MultipartFormDataContent
        {
            { new StringContent(kind), "kind" },
            { new StringContent(visibility), "visibility" },
            { new StringContent(Secret($"{label}-title")), "title" },
        };
        var isDocument = kind == "Document";
        var part = new ByteArrayContent(isDocument ? ScenarioPreparation.Tests.HandoutFileSamples.Pdf() : ScenarioPreparation.Tests.HandoutFileSamples.Png());
        part.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(isDocument ? "application/pdf" : "image/png");
        content.Add(part, "file", isDocument ? $"{Secret(label)}.pdf" : $"{Secret(label)}.png");
        return content;
    }

    public static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static async Task<Guid> CreateHumanNpcAsync(HttpClient client, Guid campaignId, string keeperOid)
    {
        var id = await CreateAsync(client, $"/api/campaigns/{campaignId}/human-npcs", keeperOid, new { name = Secret("human-create"), age = 62 });
        (await client.SendAsync(BuildRequest(HttpMethod.Put, $"/api/campaigns/{campaignId}/human-npcs/{id}", keeperOid, HumanNpcBody("human")))).EnsureSuccessStatusCode();
        return id;
    }

    private static async Task<Guid> CreateMythosCreatureAsync(HttpClient client, Guid campaignId, string keeperOid)
    {
        var id = await CreateAsync(client, $"/api/campaigns/{campaignId}/mythos-creatures", keeperOid, new { name = Secret("mythos-create") });
        (await client.SendAsync(BuildRequest(HttpMethod.Put, $"/api/campaigns/{campaignId}/mythos-creatures/{id}", keeperOid, MythosCreatureBody("mythos")))).EnsureSuccessStatusCode();
        return id;
    }

    private static async Task<Guid> CreateFileHandoutAsync(HttpClient client, string uri, string keeperOid, string label)
    {
        var request = BuildRequest(HttpMethod.Post, uri, keeperOid);
        request.Content = FileHandoutContent(label);
        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static async Task<Guid> CreateAsync(HttpClient client, string uri, string keeperOid, object body)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, uri, keeperOid, body));
        Assert.True(
            response.StatusCode is HttpStatusCode.Created or HttpStatusCode.OK,
            $"POST {uri} answered {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }
}
