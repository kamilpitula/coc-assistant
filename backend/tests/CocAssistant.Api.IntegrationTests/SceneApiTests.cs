namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Scene API (specs/scenario-preparation/spec.md: create, append, edit, remove, reorder, Keeper-only, status rules).
/// A Player, another Campaign's Keeper, and ids from another Scenario or Campaign all get an identical 404 (ADR 0013,
/// ADR 0016). Active and Finished Scenes are seeded through the domain transitions because no endpoint starts a Scene yet.
/// </summary>
public class SceneApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private const string ValidNotes =
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Cellar key\",\"format\":1,\"style\":\"\"}]}]}}";

    private const string ImageNotes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\",\"src\":\"https://example.com/a.png\"}]}}";

    private const string ScriptLinkNotes =
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"link\",\"url\":\"javascript:alert(1)\",\"target\":\"_blank\",\"rel\":\"noopener noreferrer\",\"children\":[{\"type\":\"text\",\"text\":\"x\"}]}]}]}}";

    private readonly IdentityApiFactory _factory;

    public SceneApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private static string ScenariosUri(Guid campaignId, string suffix = "") => $"/api/campaigns/{campaignId}/scenarios{suffix}";

    private static string ScenesUri(Guid campaignId, Guid scenarioId, string suffix = "") => $"{ScenariosUri(campaignId, $"/{scenarioId}")}/scenes{suffix}";

    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();

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

    private static async Task<IReadOnlyList<SceneSummaryResponse>> ListAsync(HttpClient client, Guid campaignId, Guid scenarioId, string oid)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, ScenesUri(campaignId, scenarioId), oid));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<SceneListResponse>())!.Scenes;
    }

    private static async Task<IReadOnlyList<string>> TitlesAsync(HttpClient client, Guid campaignId, Guid scenarioId, string oid) =>
        (await ListAsync(client, campaignId, scenarioId, oid)).Select(scene => scene.Title).ToList();

    private static Task<HttpResponseMessage> ReorderAsync(HttpClient client, Guid campaignId, Guid scenarioId, string oid, params Guid[] ids) =>
        client.SendAsync(BuildRequest(HttpMethod.Put, ScenesUri(campaignId, scenarioId, "/order"), oid, new { sceneIds = ids }));

    private static async Task<IReadOnlyList<string>> ErrorKeysAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("errors").EnumerateObject().Select(property => property.Name).ToList();
    }

    private static async Task<string> ProblemTitleAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("title").GetString()!;
    }

    // Problem details carry a per-request traceId; everything else must match.
    private static string WithoutTraceId(string body) =>
        System.Text.RegularExpressions.Regex.Replace(body, "\"traceId\":\"[^\"]*\"", string.Empty);

    private async Task PlayAsync(Guid sceneId, SceneStatus status)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>();
        var scene = await dbContext.Scenes.SingleAsync(candidate => candidate.Id == sceneId);
        scene.Start(DateTimeOffset.UtcNow);
        if (status == SceneStatus.Finished)
        {
            scene.Finish(DateTimeOffset.UtcNow.AddMinutes(30));
        }

        await dbContext.SaveChangesAsync();
    }

    private async Task<string?> StoredNotesAsync(Guid sceneId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>();
        return (await dbContext.Scenes.AsNoTracking().SingleAsync(candidate => candidate.Id == sceneId)).KeeperNotes;
    }

    [Fact]
    public async Task Given_a_keeper_When_creating_two_scenes_Then_each_is_201_prepared_and_get_edit_and_list_work_in_order()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-1")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-1");

        var first = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-1", "  The Corbitt House ", " Arkham, Boston Road ", ValidNotes);
        var second = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-1", "Meeting Knott");

        var get = await client.SendAsync(BuildRequest(HttpMethod.Get, ScenesUri(campaignId, scenarioId, $"/{first.Id}"), "scene-keeper-1"));
        var edit = await client.SendAsync(BuildRequest(
            HttpMethod.Put, ScenesUri(campaignId, scenarioId, $"/{second.Id}"), "scene-keeper-1", new { title = "Knott", location = "Boston", keeperNotes = Json(ValidNotes) }));

        Assert.Equal(("The Corbitt House", "Arkham, Boston Road", "Prepared"), (first.Title, first.Location, first.Status));
        Assert.Null(first.StartedAt);
        Assert.Null(first.FinishedAt);
        Assert.Equal((string.Empty, null), (second.Location, second.KeeperNotes));
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        Assert.Equal(HttpStatusCode.OK, edit.StatusCode);
        var edited = await edit.Content.ReadFromJsonAsync<SceneResponse>();
        Assert.Equal(("Knott", "Boston"), (edited!.Title, edited.Location));
        Assert.Equal(["The Corbitt House", "Knott"], await TitlesAsync(client, campaignId, scenarioId, "scene-keeper-1"));
    }

    [Fact]
    public async Task Given_scene_responses_When_read_Then_they_carry_the_specified_fields_and_never_a_position()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-2")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-2");
        var scene = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-2", "A");

        var list = await client.SendAsync(BuildRequest(HttpMethod.Get, ScenesUri(campaignId, scenarioId), "scene-keeper-2"));
        var detail = await client.SendAsync(BuildRequest(HttpMethod.Get, ScenesUri(campaignId, scenarioId, $"/{scene.Id}"), "scene-keeper-2"));

        using var listDocument = JsonDocument.Parse(await list.Content.ReadAsStringAsync());
        using var detailDocument = JsonDocument.Parse(await detail.Content.ReadAsStringAsync());
        Assert.Equal(
            ["finishedAt", "id", "startedAt", "status", "title"],
            listDocument.RootElement.GetProperty("scenes")[0].EnumerateObject().Select(property => property.Name).Order());
        Assert.Equal(
            ["finishedAt", "handouts", "id", "itemLinks", "keeperNotes", "location", "nonPlayerEntityLinks", "startedAt", "status", "title"],
            detailDocument.RootElement.EnumerateObject().Select(property => property.Name).Order());
    }

    [Fact]
    public async Task Given_keeper_notes_When_saved_and_read_Then_the_stored_text_and_the_response_are_the_document_as_sent()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-3")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-3");
        var spaced = "{ \"root\" : { \"type\": \"root\", \"children\": [ { \"type\": \"paragraph\", \"children\": [ { \"type\": \"text\", \"text\": \"caf" + (char)0xE9 + "\" } ] } ] } }";

        var rawRequest = BuildRequest(HttpMethod.Post, ScenesUri(campaignId, scenarioId), "scene-keeper-3");
        rawRequest.Content = new StringContent("{\"title\":\"Exact\",\"keeperNotes\":" + spaced + "}", System.Text.Encoding.UTF8, "application/json");
        var createdResponse = await client.SendAsync(rawRequest);
        Assert.Equal(HttpStatusCode.Created, createdResponse.StatusCode);
        var created = (await createdResponse.Content.ReadFromJsonAsync<SceneResponse>())!;
        var ascii = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-3", "Ascii", null, ValidNotes);
        var get = await client.SendAsync(BuildRequest(HttpMethod.Get, ScenesUri(campaignId, scenarioId, $"/{ascii.Id}"), "scene-keeper-3"));

        Assert.Equal(spaced, await StoredNotesAsync(created.Id));
        Assert.Equal(ValidNotes, (await get.Content.ReadFromJsonAsync<SceneResponse>())!.KeeperNotes!.Value.GetRawText());
    }

    [Fact]
    public async Task Given_notes_that_are_null_or_absent_When_creating_and_editing_Then_both_mean_no_notes()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-4")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-4");
        var withNotes = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-4", "A", null, ValidNotes);

        var absent = await client.SendAsync(BuildRequest(HttpMethod.Post, ScenesUri(campaignId, scenarioId), "scene-keeper-4", new { title = "B" }));
        var cleared = await client.SendAsync(BuildRequest(
            HttpMethod.Put, ScenesUri(campaignId, scenarioId, $"/{withNotes.Id}"), "scene-keeper-4", new { title = "A", keeperNotes = (string?)null }));

        Assert.Equal(HttpStatusCode.Created, absent.StatusCode);
        Assert.Null((await absent.Content.ReadFromJsonAsync<SceneResponse>())!.KeeperNotes);
        Assert.Equal(HttpStatusCode.OK, cleared.StatusCode);
        Assert.Null((await cleared.Content.ReadFromJsonAsync<SceneResponse>())!.KeeperNotes);
        Assert.Null(await StoredNotesAsync(withNotes.Id));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task Given_an_empty_blank_or_missing_title_When_creating_Then_it_is_a_bad_request_keyed_by_title(string? title)
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-5")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-5");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, ScenesUri(campaignId, scenarioId), "scene-keeper-5", new { title }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(["title"], await ErrorKeysAsync(response));
    }

    [Fact]
    public async Task Given_a_long_title_long_location_or_disallowed_notes_When_creating_and_editing_Then_each_is_a_bad_request_keyed_by_its_field()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-6")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-6");
        var existing = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-6", "Keep");
        var oversize = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"" + new string('a', 204_800) + "\"}]}]}}";

        async Task<IReadOnlyList<string>> PostKeysAsync(object body) =>
            await ErrorKeysAsync(await client.SendAsync(BuildRequest(HttpMethod.Post, ScenesUri(campaignId, scenarioId), "scene-keeper-6", body)));

        Assert.Equal(["title"], await PostKeysAsync(new { title = new string('a', 201) }));
        Assert.Equal(["location"], await PostKeysAsync(new { title = "T", location = new string('l', 201) }));
        Assert.Equal(["keeperNotes"], await PostKeysAsync(new { title = "T", keeperNotes = Json(ImageNotes) }));
        Assert.Equal(["keeperNotes"], await PostKeysAsync(new { title = "T", keeperNotes = Json(ScriptLinkNotes) }));
        Assert.Equal(["keeperNotes"], await PostKeysAsync(new { title = "T", keeperNotes = Json(oversize) }));
        Assert.Equal(["keeperNotes"], await PostKeysAsync(new { title = "T", keeperNotes = "plain text" }));

        var edit = await client.SendAsync(BuildRequest(
            HttpMethod.Put, ScenesUri(campaignId, scenarioId, $"/{existing.Id}"), "scene-keeper-6", new { title = "T", keeperNotes = Json(ImageNotes) }));
        Assert.Equal(["keeperNotes"], await ErrorKeysAsync(edit));
        Assert.Equal(["Keep"], await TitlesAsync(client, campaignId, scenarioId, "scene-keeper-6"));
        Assert.Null(await StoredNotesAsync(existing.Id));
    }

    [Fact]
    public async Task Given_three_scenes_When_the_keeper_reorders_them_Then_the_response_and_later_reads_use_the_new_order_and_new_scenes_come_last()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-7")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-7");
        var a = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-7", "A");
        var b = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-7", "B");
        var c = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-7", "C");

        var response = await ReorderAsync(client, campaignId, scenarioId, "scene-keeper-7", c.Id, a.Id, b.Id);
        await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-7", "D");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["C", "A", "B"], (await response.Content.ReadFromJsonAsync<SceneListResponse>())!.Scenes.Select(scene => scene.Title));
        Assert.Equal(["C", "A", "B", "D"], await TitlesAsync(client, campaignId, scenarioId, "scene-keeper-7"));
    }

    [Fact]
    public async Task Given_scenes_with_equal_positions_When_listing_repeatedly_Then_the_order_is_stable()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-8")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-8");
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>();
            var scenario = await dbContext.Scenarios.SingleAsync(candidate => candidate.Id == scenarioId);
            var now = DateTimeOffset.UtcNow;
            dbContext.Scenes.AddRange(Enumerable.Range(1, 4).Select(number => Scene.Create(scenario, $"S{number}", null, null, 1, now).Scene!));
            await dbContext.SaveChangesAsync();
        }

        var reads = new List<IReadOnlyList<Guid>>();
        for (var read = 0; read < 3; read++)
        {
            reads.Add((await ListAsync(client, campaignId, scenarioId, "scene-keeper-8")).Select(scene => scene.Id).ToList());
        }

        Assert.All(reads, ids => Assert.Equal(reads[0], ids));
    }

    [Fact]
    public async Task Given_a_reorder_with_a_duplicate_id_or_without_the_id_list_When_applied_Then_it_is_a_bad_request_keyed_by_scene_ids()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-9")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-9");
        var a = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-9", "A");
        await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-9", "B");

        var duplicate = await ReorderAsync(client, campaignId, scenarioId, "scene-keeper-9", a.Id, a.Id);
        var noBodyRequest = BuildRequest(HttpMethod.Put, ScenesUri(campaignId, scenarioId, "/order"), "scene-keeper-9");
        noBodyRequest.Content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json");
        var noBody = await client.SendAsync(noBodyRequest);

        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
        Assert.Equal(["sceneIds"], await ErrorKeysAsync(duplicate));
        Assert.Equal(HttpStatusCode.BadRequest, noBody.StatusCode);
        Assert.Equal(["A", "B"], await TitlesAsync(client, campaignId, scenarioId, "scene-keeper-9"));
    }

    [Fact]
    public async Task Given_a_stale_order_When_a_scene_is_missing_extra_or_from_another_scenario_Then_it_is_a_409_that_names_no_id()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-10")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-10");
        var otherScenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-10", "Edge of Darkness");
        var a = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-10", "A");
        var b = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-10", "B");
        var foreign = await CreateSceneAsync(client, campaignId, otherScenarioId, "scene-keeper-10", "Foreign");

        var missing = await ReorderAsync(client, campaignId, scenarioId, "scene-keeper-10", b.Id);
        var extra = await ReorderAsync(client, campaignId, scenarioId, "scene-keeper-10", b.Id, a.Id, Guid.NewGuid());
        var otherScenarios = await ReorderAsync(client, campaignId, scenarioId, "scene-keeper-10", b.Id, foreign.Id);

        Assert.All([missing, extra, otherScenarios], response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        var body = await otherScenarios.Content.ReadAsStringAsync();
        Assert.DoesNotContain(foreign.Id.ToString(), body, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(["A", "B"], await TitlesAsync(client, campaignId, scenarioId, "scene-keeper-10"));
    }

    [Fact]
    public async Task Given_an_active_scene_When_the_keeper_edits_it_Then_the_edit_is_saved_and_the_status_and_start_time_stay()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-11")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-11");
        var scene = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-11", "A");
        await PlayAsync(scene.Id, SceneStatus.Active);

        var response = await client.SendAsync(BuildRequest(
            HttpMethod.Put, ScenesUri(campaignId, scenarioId, $"/{scene.Id}"), "scene-keeper-11", new { title = "A2", keeperNotes = Json(ValidNotes) }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var edited = (await response.Content.ReadFromJsonAsync<SceneResponse>())!;
        Assert.Equal(("A2", "Active"), (edited.Title, edited.Status));
        Assert.NotNull(edited.StartedAt);
        Assert.Null(edited.FinishedAt);
    }

    [Fact]
    public async Task Given_a_finished_scene_When_the_keeper_edits_it_even_with_an_invalid_body_Then_it_is_a_409_and_nothing_changes()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-12")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-12");
        var scene = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-12", "A");
        await PlayAsync(scene.Id, SceneStatus.Finished);
        var uri = ScenesUri(campaignId, scenarioId, $"/{scene.Id}");

        var valid = await client.SendAsync(BuildRequest(HttpMethod.Put, uri, "scene-keeper-12", new { title = "A2" }));
        var invalid = await client.SendAsync(BuildRequest(HttpMethod.Put, uri, "scene-keeper-12", new { title = string.Empty }));

        Assert.All([valid, invalid], response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        Assert.Equal("A Finished Scene can't be changed.", await ProblemTitleAsync(valid));
        var read = await client.SendAsync(BuildRequest(HttpMethod.Get, uri, "scene-keeper-12"));
        var stored = (await read.Content.ReadFromJsonAsync<SceneResponse>())!;
        Assert.Equal(("A", "Finished"), (stored.Title, stored.Status));
        Assert.NotNull(stored.FinishedAt);
    }

    [Fact]
    public async Task Given_a_finished_scene_When_the_keeper_reorders_Then_it_moves()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-13")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-13");
        var a = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-13", "A");
        var b = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-13", "B");
        await PlayAsync(a.Id, SceneStatus.Finished);

        var response = await ReorderAsync(client, campaignId, scenarioId, "scene-keeper-13", b.Id, a.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["B", "A"], await TitlesAsync(client, campaignId, scenarioId, "scene-keeper-13"));
    }

    [Fact]
    public async Task Given_prepared_active_and_finished_scenes_When_the_keeper_removes_each_Then_only_the_prepared_one_is_removed()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-14")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-14");
        var prepared = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-14", "Prepared");
        var active = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-14", "Active");
        var finished = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-14", "Finished");
        await PlayAsync(active.Id, SceneStatus.Active);
        await PlayAsync(finished.Id, SceneStatus.Finished);

        async Task<HttpResponseMessage> RemoveAsync(Guid id) =>
            await client.SendAsync(BuildRequest(HttpMethod.Delete, ScenesUri(campaignId, scenarioId, $"/{id}"), "scene-keeper-14"));

        var removedActive = await RemoveAsync(active.Id);
        var removedFinished = await RemoveAsync(finished.Id);
        var removedPrepared = await RemoveAsync(prepared.Id);

        Assert.All([removedActive, removedFinished], response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        Assert.Equal("Only a Prepared Scene can be removed.", await ProblemTitleAsync(removedActive));
        Assert.Equal(HttpStatusCode.NoContent, removedPrepared.StatusCode);
        Assert.Equal(["Active", "Finished"], await TitlesAsync(client, campaignId, scenarioId, "scene-keeper-14"));
    }

    [Fact]
    public async Task Given_a_player_or_another_keeper_or_a_missing_campaign_When_using_every_endpoint_Then_each_is_the_same_404()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-15")).Id;
        await JoinAsPlayerAsync(client, campaignId, "scene-keeper-15", "scene-player-15");
        await CreateCampaignAsync(client, "scene-keeper-15b");
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-15");
        var scene = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-15", "Secret scene", "Secret place", ValidNotes);
        var request = new { title = "Mine", keeperNotes = Json(ValidNotes) };

        var results = new List<(HttpStatusCode Status, string Body)>();
        foreach (var (oid, target) in new[]
                 {
                     ("scene-player-15", campaignId),
                     ("scene-keeper-15b", campaignId),
                     ("scene-keeper-15", Guid.NewGuid()),
                 })
        {
            var calls = new[]
            {
                BuildRequest(HttpMethod.Get, ScenesUri(target, scenarioId), oid),
                BuildRequest(HttpMethod.Post, ScenesUri(target, scenarioId), oid, request),
                BuildRequest(HttpMethod.Get, ScenesUri(target, scenarioId, $"/{scene.Id}"), oid),
                BuildRequest(HttpMethod.Put, ScenesUri(target, scenarioId, $"/{scene.Id}"), oid, request),
                BuildRequest(HttpMethod.Delete, ScenesUri(target, scenarioId, $"/{scene.Id}"), oid),
                BuildRequest(HttpMethod.Put, ScenesUri(target, scenarioId, "/order"), oid, new { sceneIds = new[] { scene.Id } }),
            };
            foreach (var call in calls)
            {
                var response = await client.SendAsync(call);
                results.Add((response.StatusCode, WithoutTraceId(await response.Content.ReadAsStringAsync())));
            }
        }

        Assert.All(results, result => Assert.Equal(HttpStatusCode.NotFound, result.Status));
        Assert.All(results, result => Assert.DoesNotContain("Secret", result.Body, StringComparison.Ordinal));
        Assert.Equal(["Secret scene"], await TitlesAsync(client, campaignId, scenarioId, "scene-keeper-15"));
    }

    [Fact]
    public async Task Given_a_scenario_of_another_campaign_or_a_scene_of_another_scenario_When_used_through_the_wrong_path_Then_every_endpoint_is_404()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "scene-keeper-16")).Id;
        var otherCampaignId = (await CreateCampaignAsync(client, "scene-keeper-16")).Id;
        var scenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-16");
        var siblingScenarioId = await CreateScenarioAsync(client, campaignId, "scene-keeper-16", "Edge of Darkness");
        var foreignScenarioId = await CreateScenarioAsync(client, otherCampaignId, "scene-keeper-16");
        var scene = await CreateSceneAsync(client, campaignId, scenarioId, "scene-keeper-16", "Mine");
        var request = new { title = "Changed" };

        HttpRequestMessage[] SceneCalls(Guid campaign, Guid scenario) =>
        [
            BuildRequest(HttpMethod.Get, ScenesUri(campaign, scenario, $"/{scene.Id}"), "scene-keeper-16"),
            BuildRequest(HttpMethod.Put, ScenesUri(campaign, scenario, $"/{scene.Id}"), "scene-keeper-16", request),
            BuildRequest(HttpMethod.Delete, ScenesUri(campaign, scenario, $"/{scene.Id}"), "scene-keeper-16"),
        ];

        var calls = new List<HttpRequestMessage>(SceneCalls(campaignId, siblingScenarioId));
        foreach (var (campaign, scenario) in new[] { (campaignId, foreignScenarioId), (otherCampaignId, scenarioId) })
        {
            calls.AddRange(SceneCalls(campaign, scenario));
            calls.Add(BuildRequest(HttpMethod.Get, ScenesUri(campaign, scenario), "scene-keeper-16"));
            calls.Add(BuildRequest(HttpMethod.Post, ScenesUri(campaign, scenario), "scene-keeper-16", request));
            calls.Add(BuildRequest(HttpMethod.Put, ScenesUri(campaign, scenario, "/order"), "scene-keeper-16", new { sceneIds = new[] { scene.Id } }));
        }

        foreach (var call in calls)
        {
            Assert.Equal(HttpStatusCode.NotFound, (await client.SendAsync(call)).StatusCode);
        }

        var siblingOrder = await ReorderAsync(client, campaignId, siblingScenarioId, "scene-keeper-16", scene.Id);
        Assert.Equal(HttpStatusCode.Conflict, siblingOrder.StatusCode);
        Assert.Equal(["Mine"], await TitlesAsync(client, campaignId, scenarioId, "scene-keeper-16"));
        Assert.Empty(await ListAsync(client, campaignId, siblingScenarioId, "scene-keeper-16"));
        Assert.Empty(await ListAsync(client, otherCampaignId, foreignScenarioId, "scene-keeper-16"));
    }

    [Fact]
    public async Task Given_an_unauthenticated_request_When_using_the_scene_endpoints_Then_it_is_unauthorized()
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, ScenesUri(Guid.NewGuid(), Guid.NewGuid()));
        request.Headers.Add("X-Test-Unauthenticated", "true");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
