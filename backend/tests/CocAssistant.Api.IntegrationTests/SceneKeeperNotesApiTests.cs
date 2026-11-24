namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Keeper notes endpoint (specs/scenario-preparation/spec.md, ADR 0037): a save with the current notes version succeeds
/// in every status, a stale one is refused with 409 carrying the current notes, and neither ever changes the Scene version.
/// </summary>
public class SceneKeeperNotesApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private const string ValidNotes =
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Cellar key\",\"format\":1,\"style\":\"\"}]}]}}";

    private const string ImageNotes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\"}]}}";

    private readonly IdentityApiFactory _factory;

    public SceneKeeperNotesApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private static string ScenariosUri(Guid campaignId, string suffix = "") => $"/api/campaigns/{campaignId}/scenarios{suffix}";

    private static string ScenesUri(Guid campaignId, Guid scenarioId, string suffix = "") => $"{ScenariosUri(campaignId, $"/{scenarioId}")}/scenes{suffix}";

    private static string NotesUri(Guid campaignId, Guid scenarioId, Guid sceneId) => ScenesUri(campaignId, scenarioId, $"/{sceneId}/keeper-notes");

    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static string NoteJson(string text) =>
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"" + text + "\"}]}]}}";

    private static async Task<Guid> CreateScenarioAsync(HttpClient client, Guid campaignId, string oid, string title = "The Haunting")
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, ScenariosUri(campaignId), oid, new { title }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ScenarioResponse>())!.Id;
    }

    private static async Task<SceneResponse> CreateSceneAsync(
        HttpClient client, Guid campaignId, Guid scenarioId, string oid, string title, string? location = null, string? notes = null)
    {
        var body = new { title, location, keeperNotes = notes is null ? (JsonElement?)null : Json(notes) };
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, ScenesUri(campaignId, scenarioId), oid, body));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<SceneResponse>())!;
    }

    private async Task PlayAsync(Guid sceneId, SceneStatus status)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>();
        await ScenePlaySeed.PlayAsync(dbContext, sceneId, status);
    }

    private async Task<SceneResponse> GetSceneAsync(HttpClient client, Guid campaignId, Guid scenarioId, Guid sceneId, string oid)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, ScenesUri(campaignId, scenarioId, $"/{sceneId}"), oid));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<SceneResponse>())!;
    }

    private static async Task<IReadOnlyList<string>> ErrorKeysAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("errors").EnumerateObject().Select(property => property.Name).ToList();
    }

    [Theory]
    [InlineData(SceneStatus.Prepared)]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public async Task Given_any_status_When_the_Keeper_saves_with_the_current_version_Then_it_is_200_with_the_new_notes_and_incremented_version(SceneStatus status)
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "notes-keeper-1")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "notes-keeper-1");
        var scene = await CreateSceneAsync(client, campaignId, scenarioId, "notes-keeper-1", "The Corbitt House", "Arkham", ValidNotes);
        if (status != SceneStatus.Prepared)
        {
            await PlayAsync(scene.Id, status);
        }

        var response = await client.SendAsync(BuildRequest(
            HttpMethod.Put, NotesUri(campaignId, scenarioId, scene.Id), "notes-keeper-1",
            new { keeperNotes = Json(NoteJson("The attic")), notesVersion = 0 }));
        var read = await GetSceneAsync(client, campaignId, scenarioId, scene.Id, "notes-keeper-1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = (await response.Content.ReadFromJsonAsync<SceneKeeperNotesResponse>())!;
        Assert.Equal(NoteJson("The attic"), saved.KeeperNotes!.Value.GetRawText());
        Assert.Equal(1, saved.NotesVersion);
        Assert.Equal((NoteJson("The attic"), 1, status.ToString()), (read.KeeperNotes!.Value.GetRawText(), read.NotesVersion, read.Status));
    }

    [Fact]
    public async Task Given_a_stale_save_When_saving_Then_it_is_409_with_the_current_notes_and_nothing_changes()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "notes-keeper-2")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "notes-keeper-2");
        var scene = await CreateSceneAsync(client, campaignId, scenarioId, "notes-keeper-2", "The Corbitt House", null, NoteJson("v0"));

        for (var version = 1; version <= 4; version++)
        {
            var save = await client.SendAsync(BuildRequest(
                HttpMethod.Put, NotesUri(campaignId, scenarioId, scene.Id), "notes-keeper-2",
                new { keeperNotes = Json(NoteJson($"v{version}")), notesVersion = version - 1 }));
            Assert.Equal(HttpStatusCode.OK, save.StatusCode);
            Assert.Equal(version, (await save.Content.ReadFromJsonAsync<SceneKeeperNotesResponse>())!.NotesVersion);
        }

        var newer = await client.SendAsync(BuildRequest(
            HttpMethod.Put, NotesUri(campaignId, scenarioId, scene.Id), "notes-keeper-2",
            new { keeperNotes = Json(NoteJson("v5")), notesVersion = 4 }));
        Assert.Equal(HttpStatusCode.OK, newer.StatusCode);

        var stale = await client.SendAsync(BuildRequest(
            HttpMethod.Put, NotesUri(campaignId, scenarioId, scene.Id), "notes-keeper-2",
            new { keeperNotes = Json(NoteJson("stale")), notesVersion = 4 }));

        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        Assert.Equal("application/problem+json", stale.Content.Headers.ContentType!.MediaType);
        using var conflict = JsonDocument.Parse(await stale.Content.ReadAsStringAsync());
        Assert.Equal("The Keeper notes have changed since they were read.", conflict.RootElement.GetProperty("title").GetString());
        Assert.Equal(NoteJson("v5"), conflict.RootElement.GetProperty("keeperNotes").GetRawText());
        Assert.Equal(5, conflict.RootElement.GetProperty("notesVersion").GetInt32());
        Assert.Equal(NoteJson("v5"), (await GetSceneAsync(client, campaignId, scenarioId, scene.Id, "notes-keeper-2")).KeeperNotes!.Value.GetRawText());
    }

    [Fact]
    public async Task Given_disallowed_notes_When_saving_Then_it_is_400_keyed_by_keeper_notes()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "notes-keeper-3")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "notes-keeper-3");
        var scene = await CreateSceneAsync(client, campaignId, scenarioId, "notes-keeper-3", "The Corbitt House", null, ValidNotes);

        var response = await client.SendAsync(BuildRequest(
            HttpMethod.Put, NotesUri(campaignId, scenarioId, scene.Id), "notes-keeper-3",
            new { keeperNotes = Json(ImageNotes), notesVersion = 0 }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(["keeperNotes"], await ErrorKeysAsync(response));
        Assert.Equal(ValidNotes, (await GetSceneAsync(client, campaignId, scenarioId, scene.Id, "notes-keeper-3")).KeeperNotes!.Value.GetRawText());
    }

    [Fact]
    public async Task Given_a_missing_notes_version_When_saving_Then_it_is_400_keyed_by_notes_version()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "notes-keeper-4")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "notes-keeper-4");
        var scene = await CreateSceneAsync(client, campaignId, scenarioId, "notes-keeper-4", "The Corbitt House", null, ValidNotes);

        var response = await client.SendAsync(BuildRequest(
            HttpMethod.Put, NotesUri(campaignId, scenarioId, scene.Id), "notes-keeper-4",
            new { keeperNotes = Json(ValidNotes) }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(["notesVersion"], await ErrorKeysAsync(response));
        Assert.Equal(ValidNotes, (await GetSceneAsync(client, campaignId, scenarioId, scene.Id, "notes-keeper-4")).KeeperNotes!.Value.GetRawText());
    }

    [Fact]
    public async Task Given_a_player_or_a_foreign_scenario_When_saving_Then_it_is_404_and_nothing_changes()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "notes-keeper-5")).Id;
        await JoinAsPlayerAsync(client, campaignId, "notes-keeper-5", "notes-player-5");
        var scenarioId = await CreateScenarioAsync(client, campaignId, "notes-keeper-5");
        var siblingScenarioId = await CreateScenarioAsync(client, campaignId, "notes-keeper-5", "Edge of Darkness");
        var scene = await CreateSceneAsync(client, campaignId, scenarioId, "notes-keeper-5", "The Corbitt House", null, ValidNotes);

        var player = await client.SendAsync(BuildRequest(
            HttpMethod.Put, NotesUri(campaignId, scenarioId, scene.Id), "notes-player-5",
            new { keeperNotes = Json(NoteJson("Sneaky")), notesVersion = 0 }));
        var foreign = await client.SendAsync(BuildRequest(
            HttpMethod.Put, NotesUri(campaignId, siblingScenarioId, scene.Id), "notes-keeper-5",
            new { keeperNotes = Json(NoteJson("Sneaky")), notesVersion = 0 }));

        Assert.All([player, foreign], response => Assert.Equal(HttpStatusCode.NotFound, response.StatusCode));
        Assert.Equal(ValidNotes, (await GetSceneAsync(client, campaignId, scenarioId, scene.Id, "notes-keeper-5")).KeeperNotes!.Value.GetRawText());
    }

    [Fact]
    public async Task Given_a_concurrent_finish_and_notes_save_When_both_run_Then_the_scene_is_finished_with_the_new_notes()
    {
        var client = _factory.CreateClient();

        for (var round = 0; round < 5; round++)
        {
            var keeperOid = $"notes-keeper-race-{round}";
            var campaignId = (await CreateCampaignAsync(client, keeperOid)).Id;
            var scenarioId = await CreateScenarioAsync(client, campaignId, keeperOid);
            var scene = await CreateSceneAsync(client, campaignId, scenarioId, keeperOid, "The Corbitt House", null, ValidNotes);
            await PlayAsync(scene.Id, SceneStatus.Active);

            var notes = client.SendAsync(BuildRequest(
                HttpMethod.Put, NotesUri(campaignId, scenarioId, scene.Id), keeperOid,
                new { keeperNotes = Json(NoteJson($"Played {round}")), notesVersion = 0 }));
            var finish = client.SendAsync(BuildRequest(
                HttpMethod.Post, $"/api/campaigns/{campaignId}/active-scene/finish", keeperOid));
            var responses = await Task.WhenAll(notes, finish);

            Assert.Equal(HttpStatusCode.OK, responses[0].StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, responses[1].StatusCode);
            var stored = await GetSceneAsync(client, campaignId, scenarioId, scene.Id, keeperOid);
            Assert.Equal(("Finished", NoteJson($"Played {round}"), 1), (stored.Status, stored.KeeperNotes!.Value.GetRawText(), stored.NotesVersion));
        }
    }

    [Fact]
    public async Task Given_an_unauthenticated_request_When_saving_notes_Then_it_is_unauthorized()
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Put, NotesUri(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid()));
        request.Headers.Add("X-Test-Unauthenticated", "true");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
