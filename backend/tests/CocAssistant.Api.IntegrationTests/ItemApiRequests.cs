namespace CocAssistant.Api.IntegrationTests;

/// <summary>Shared requests, bodies and readers for the Item integration tests (PBI-SP-008).</summary>
public static class ItemApiRequests
{
    public const string Description =
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"A leather diary\",\"format\":1,\"style\":\"\"}]}]}}";

    public const string Notes =
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The last page is torn out\"}]}]}}";

    public const string Blank = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[]}]}}";

    public const string ImageNode = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\",\"src\":\"https://example.com/a.png\"}]}}";

    public const string FinishedTitle = "A Finished Scene can't be changed.";
    public const string InPlayTitle = "An Item linked to an Active or Finished Scene can't be deleted.";
    public const string HeldTitle = "An Item held by an Investigator can't be deleted.";
    public const string HandoutsKeptTitle = "An Item linked to an Active or Finished Scene, or held by an Investigator, keeps its Handouts.";

    public static string ItemsUri(Guid campaignId, string suffix = "") => $"/api/campaigns/{campaignId}/items{suffix}";

    public static string ItemLinksUri(Guid campaignId, Guid scenarioId, Guid sceneId, string suffix = "") =>
        $"/api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/{sceneId}/item-links{suffix}";

    public static string SceneUri(Guid campaignId, Guid scenarioId, Guid sceneId) =>
        $"/api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/{sceneId}";

    public static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();

    public static object ItemBody(string? name = "Walter Corbitt's diary", string? description = Description, string? keeperNotes = Notes) => new
    {
        name,
        playerFacingDescription = description is null ? (JsonElement?)null : Json(description),
        keeperNotes = keeperNotes is null ? (JsonElement?)null : Json(keeperNotes),
    };

    public static async Task<JsonElement> BodyAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();

    public static async Task<string> ProblemTitleAsync(HttpResponseMessage response) => (await BodyAsync(response)).GetProperty("title").GetString()!;

    public static async Task<IReadOnlyDictionary<string, string[]>> ProblemsAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = (await BodyAsync(response)).GetProperty("errors");
        return errors.EnumerateObject().ToDictionary(
            property => property.Name,
            property => property.Value.EnumerateArray().Select(message => message.GetString()!).ToArray());
    }

    // Problem details carry a per-request traceId; everything else must match.
    public static async Task<string> WithoutTraceIdAsync(HttpResponseMessage response) =>
        System.Text.RegularExpressions.Regex.Replace(await response.Content.ReadAsStringAsync(), "\"traceId\":\"[^\"]*\"", string.Empty);

    public static async Task<JsonElement> CreateItemAsync(HttpClient client, Guid campaignId, string oid, string name = "Walter Corbitt's diary")
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, ItemsUri(campaignId), oid, ItemBody(name)));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await BodyAsync(response);
    }

    public static async Task<JsonElement> GetItemAsync(HttpClient client, Guid campaignId, Guid itemId, string oid)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, ItemsUri(campaignId, $"/{itemId}"), oid));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await BodyAsync(response);
    }

    public static async Task<(Guid CampaignId, Guid ScenarioId, Guid SceneId)> SceneInCampaignAsync(HttpClient client, Guid campaignId, string oid, string title = "The Corbitt House")
    {
        var scenario = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/scenarios", oid, new { title = "The Haunting" }));
        var scenarioId = (await BodyAsync(scenario)).GetProperty("id").GetGuid();
        var scene = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes", oid, new { title }));
        Assert.Equal(HttpStatusCode.Created, scene.StatusCode);
        return (campaignId, scenarioId, (await BodyAsync(scene)).GetProperty("id").GetGuid());
    }

    public static async Task<(Guid CampaignId, Guid ScenarioId, Guid SceneId)> SceneAsync(HttpClient client, string oid)
    {
        var campaignId = (await CreateCampaignAsync(client, oid)).Id;
        return await SceneInCampaignAsync(client, campaignId, oid);
    }

    public static async Task<JsonElement> GetSceneAsync(HttpClient client, (Guid CampaignId, Guid ScenarioId, Guid SceneId) scene, string oid)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, SceneUri(scene.CampaignId, scene.ScenarioId, scene.SceneId), oid));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await BodyAsync(response);
    }

    public static async Task<JsonElement> LinkItemAsync(HttpClient client, (Guid CampaignId, Guid ScenarioId, Guid SceneId) scene, string oid, Guid itemId)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, ItemLinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId), oid, new { itemId }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await BodyAsync(response);
    }

    /// <summary>Starts (and for Finished, finishes) a stored Scene through the domain transitions, because no endpoint plays a Scene yet.</summary>
    public static async Task PlayAsync(IdentityApiFactory factory, Guid sceneId, SceneStatus status)
    {
        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>();
        var scene = await dbContext.Scenes.SingleAsync(candidate => candidate.Id == sceneId);
        scene.Start(DateTimeOffset.UtcNow);
        if (status == SceneStatus.Finished)
        {
            scene.Finish(DateTimeOffset.UtcNow.AddMinutes(30));
        }

        await dbContext.SaveChangesAsync();
    }

    public static async Task<int> CountAsync(IdentityApiFactory factory, string table)
    {
        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>();
        return await dbContext.Database.SqlQueryRaw<int>($"SELECT COUNT(*) AS Value FROM {table}").SingleAsync();
    }
}
