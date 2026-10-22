namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Scene Handout API (specs/scenario-preparation/spec.md: add, edit, delete, reorder, Keeper-only, Finished is read-only, a
/// Handout on an Active Scene cannot be deleted). A Player, another Campaign's Keeper, and ids from another Scenario or Campaign
/// all get an identical 404 that never carries Handout text (ADR 0013, ADR 0016). A refused write is a 400 whose keys are request
/// paths and whose values are server-owned messages (ADR 0018). Active and Finished Scenes are seeded through the domain
/// transitions because no endpoint starts a Scene yet.
/// </summary>
public class HandoutApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private const string SecretText = "The cultist hides the key under the stairs";

    private const string Text =
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The door creaks open\",\"format\":1,\"style\":\"\"}]}]}}";

    private const string SecretDocument =
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The cultist hides the key under the stairs\"}]}]}}";

    private const string OtherText = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"A cold draught\"}]}]}}";
    private const string EmptyParagraph = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[]}]}}";
    private const string ImageText = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\",\"src\":\"https://example.com/a.png\"}]}}";

    private const string ScriptLinkText =
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"link\",\"url\":\"javascript:alert(1)\",\"target\":\"_blank\",\"rel\":\"noopener noreferrer\",\"children\":[{\"type\":\"text\",\"text\":\"x\"}]}]}]}}";

    private const string FinishedTitle = "A Finished Scene can't be changed.";
    private const string NotPreparedTitle = "Only a Handout on a Prepared Scene can be deleted.";
    private const string StaleOrderTitle = "The order does not match the Scene's current Handouts.";

    private readonly IdentityApiFactory _factory;

    public HandoutApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private static string ScenesUri(Guid campaignId, Guid scenarioId, string suffix = "") => $"/api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes{suffix}";

    private static string HandoutsUri((Guid CampaignId, Guid ScenarioId, Guid SceneId) scene, string suffix = "") =>
        ScenesUri(scene.CampaignId, scene.ScenarioId, $"/{scene.SceneId}/handouts{suffix}");

    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static async Task<JsonElement> BodyAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();

    private static async Task<(Guid CampaignId, Guid ScenarioId, Guid SceneId)> SceneAsync(HttpClient client, string oid)
    {
        var campaignId = (await CreateCampaignAsync(client, oid)).Id;
        return await SceneInCampaignAsync(client, campaignId, oid);
    }

    private static async Task<(Guid CampaignId, Guid ScenarioId, Guid SceneId)> SceneInCampaignAsync(HttpClient client, Guid campaignId, string oid)
    {
        var scenario = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/scenarios", oid, new { title = "The Haunting" }));
        var scenarioId = (await BodyAsync(scenario)).GetProperty("id").GetGuid();
        var scene = await client.SendAsync(BuildRequest(HttpMethod.Post, ScenesUri(campaignId, scenarioId), oid, new { title = "The Corbitt House" }));
        Assert.Equal(HttpStatusCode.Created, scene.StatusCode);
        return (campaignId, scenarioId, (await BodyAsync(scene)).GetProperty("id").GetGuid());
    }

    private static object HandoutBody(string? kind = "ReadAloud", string? visibility = "PlayerFacing", string? title = "Arrival", string? content = Text) => new
    {
        kind,
        visibility,
        title,
        content = content is null ? (JsonElement?)null : Json(content),
    };

    private static async Task<JsonElement> AddAsync(HttpClient client, (Guid CampaignId, Guid ScenarioId, Guid SceneId) scene, string oid, string title = "Arrival", string kind = "ReadAloud", string visibility = "PlayerFacing", string content = Text)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(scene), oid, HandoutBody(kind, visibility, title, content)));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await BodyAsync(response);
    }

    private static async Task<JsonElement> GetSceneAsync(HttpClient client, (Guid CampaignId, Guid ScenarioId, Guid SceneId) scene, string oid)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, ScenesUri(scene.CampaignId, scene.ScenarioId, $"/{scene.SceneId}"), oid));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await BodyAsync(response);
    }

    private static async Task<IReadOnlyList<string>> TitlesAsync(HttpClient client, (Guid CampaignId, Guid ScenarioId, Guid SceneId) scene, string oid) =>
        (await GetSceneAsync(client, scene, oid)).GetProperty("handouts").EnumerateArray().Select(handout => handout.GetProperty("title").GetString()!).ToList();

    private static async Task<IReadOnlyDictionary<string, string[]>> ProblemsAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = (await BodyAsync(response)).GetProperty("errors");
        return errors.EnumerateObject().ToDictionary(
            property => property.Name,
            property => property.Value.EnumerateArray().Select(message => message.GetString()!).ToArray());
    }

    private static async Task<string> ProblemTitleAsync(HttpResponseMessage response) => (await BodyAsync(response)).GetProperty("title").GetString()!;

    // Problem details carry a per-request traceId; everything else must match.
    private static async Task<string> WithoutTraceIdAsync(HttpResponseMessage response) =>
        System.Text.RegularExpressions.Regex.Replace(await response.Content.ReadAsStringAsync(), "\"traceId\":\"[^\"]*\"", string.Empty);

    private async Task PlayAsync(Guid sceneId, SceneStatus status)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>();
        var scene = await dbContext.Scenes.Include(candidate => candidate.Handouts).SingleAsync(candidate => candidate.Id == sceneId);
        scene.Start(DateTimeOffset.UtcNow);
        if (status == SceneStatus.Finished)
        {
            scene.Finish(DateTimeOffset.UtcNow.AddMinutes(30));
        }

        await dbContext.SaveChangesAsync();
    }

    private static string[] PropertyNames(JsonElement element) => element.EnumerateObject().Select(property => property.Name).ToArray();

    [Fact]
    public async Task Given_a_keeper_When_adding_handouts_Then_each_is_201_and_get_scene_lists_summaries_in_the_order_added_without_content()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "handout-keeper-1");

        var first = await AddAsync(client, scene, "handout-keeper-1", "  Arrival ", "ReadAloud", "PlayerFacing");
        var second = await AddAsync(client, scene, "handout-keeper-1", "Secret door", "ReadAloud", "KeeperFacing");
        var loaded = await GetSceneAsync(client, scene, "handout-keeper-1");

        Assert.Equal(["id", "kind", "visibility", "title", "content"], PropertyNames(first));
        Assert.Equal(("ReadAloud", "PlayerFacing", "Arrival"), (first.GetProperty("kind").GetString(), first.GetProperty("visibility").GetString(), first.GetProperty("title").GetString()));
        Assert.Equal(Json(Text).GetRawText(), first.GetProperty("content").GetRawText());
        var handouts = loaded.GetProperty("handouts").EnumerateArray().ToList();
        Assert.Equal([first.GetProperty("id").GetGuid(), second.GetProperty("id").GetGuid()], handouts.Select(handout => handout.GetProperty("id").GetGuid()));
        Assert.Equal(["id", "kind", "visibility", "title"], PropertyNames(handouts[0]));
        Assert.Equal("KeeperFacing", handouts[1].GetProperty("visibility").GetString());
        Assert.DoesNotContain("The door creaks open", loaded.GetRawText());
    }

    [Fact]
    public async Task Given_a_new_scene_When_reading_it_Then_handouts_is_an_empty_array_and_the_property_set_is_exact()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "handout-keeper-2");

        var loaded = await GetSceneAsync(client, scene, "handout-keeper-2");

        Assert.Equal(0, loaded.GetProperty("handouts").GetArrayLength());
        Assert.Equal(
            ["finishedAt", "handouts", "id", "keeperNotes", "location", "nonPlayerEntityLinks", "startedAt", "status", "title"],
            PropertyNames(loaded).Order());
    }

    [Fact]
    public async Task Given_a_handout_When_getting_it_Then_it_is_200_with_content_and_no_position()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "handout-keeper-3");
        var created = await AddAsync(client, scene, "handout-keeper-3");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(scene, $"/{created.GetProperty("id").GetGuid()}"), "handout-keeper-3"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await BodyAsync(response);
        Assert.Equal(created.GetRawText(), body.GetRawText());
        Assert.DoesNotContain("position", body.GetRawText(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Given_every_invalid_field_When_adding_Then_each_is_a_400_with_its_key_and_message_and_nothing_is_stored()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "handout-keeper-4");
        var cases = new (object Body, string Key, string Message)[]
        {
            (HandoutBody(title: "   "), "title", "Enter a title."),
            (HandoutBody(title: null), "title", "Enter a title."),
            (HandoutBody(title: new string('a', 201)), "title", "Title must be 200 characters or fewer."),
            (HandoutBody(kind: null), "kind", "Choose Read-aloud or Text."),
            (HandoutBody(kind: "readaloud"), "kind", "Choose Read-aloud or Text."),
            (HandoutBody(kind: "Image"), "kind", "Choose Read-aloud or Text."),
            (HandoutBody(visibility: null), "visibility", "Choose who can see this Handout."),
            (HandoutBody(visibility: "playerfacing"), "visibility", "Choose who can see this Handout."),
            (HandoutBody(content: null), "content", "Enter the Handout text."),
            (HandoutBody(content: EmptyParagraph), "content", "Enter the Handout text."),
            (HandoutBody(content: ImageText), "content", "This text can't be saved. Shorten it or remove unsupported content."),
            (HandoutBody(content: ScriptLinkText), "content", "This text can't be saved. Shorten it or remove unsupported content."),
        };

        foreach (var (body, key, message) in cases)
        {
            var problems = await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(scene), "handout-keeper-4", body)));

            Assert.Equal([key], problems.Keys);
            Assert.Equal([message], problems[key]);
        }

        Assert.Empty(await TitlesAsync(client, scene, "handout-keeper-4"));
    }

    [Fact]
    public async Task Given_several_invalid_fields_When_adding_Then_only_the_first_in_field_order_is_reported()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "handout-keeper-5");

        var problems = await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(scene), "handout-keeper-5", HandoutBody(null, null, "", null))));

        Assert.Equal(["title"], problems.Keys);
    }

    [Fact]
    public async Task Given_a_handout_When_editing_it_Then_it_is_200_with_the_new_fields_including_the_kind_and_keeps_its_place()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "handout-keeper-6");
        await AddAsync(client, scene, "handout-keeper-6", "First");
        var second = await AddAsync(client, scene, "handout-keeper-6", "Second", "Text", "KeeperFacing");
        var uri = HandoutsUri(scene, $"/{second.GetProperty("id").GetGuid()}");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, uri, "handout-keeper-6", HandoutBody("ReadAloud", "PlayerFacing", " Renamed ", OtherText)));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await BodyAsync(response);
        Assert.Equal(("ReadAloud", "PlayerFacing", "Renamed"), (body.GetProperty("kind").GetString(), body.GetProperty("visibility").GetString(), body.GetProperty("title").GetString()));
        Assert.Equal(Json(OtherText).GetRawText(), body.GetProperty("content").GetRawText());
        Assert.Equal(["First", "Renamed"], await TitlesAsync(client, scene, "handout-keeper-6"));
    }

    [Fact]
    public async Task Given_invalid_fields_When_editing_Then_it_is_a_400_and_the_handout_is_unchanged()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "handout-keeper-7");
        var created = await AddAsync(client, scene, "handout-keeper-7", "Before");
        var uri = HandoutsUri(scene, $"/{created.GetProperty("id").GetGuid()}");

        var image = await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Put, uri, "handout-keeper-7", HandoutBody(title: "After", content: ImageText))));
        var script = await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Put, uri, "handout-keeper-7", HandoutBody(title: "After", content: ScriptLinkText))));
        var empty = await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Put, uri, "handout-keeper-7", HandoutBody(title: "After", content: EmptyParagraph))));

        Assert.Equal("This text can't be saved. Shorten it or remove unsupported content.", image["content"].Single());
        Assert.Equal(image, script);
        Assert.Equal("Enter the Handout text.", empty["content"].Single());
        var stored = await client.SendAsync(BuildRequest(HttpMethod.Get, uri, "handout-keeper-7"));
        Assert.Equal(created.GetRawText(), (await BodyAsync(stored)).GetRawText());
    }

    [Fact]
    public async Task Given_a_prepared_scene_When_deleting_a_handout_Then_it_is_204_and_gone_and_an_unknown_id_is_404()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "handout-keeper-8");
        var removed = await AddAsync(client, scene, "handout-keeper-8", "Removed");
        await AddAsync(client, scene, "handout-keeper-8", "Kept");

        var delete = await client.SendAsync(BuildRequest(HttpMethod.Delete, HandoutsUri(scene, $"/{removed.GetProperty("id").GetGuid()}"), "handout-keeper-8"));
        var again = await client.SendAsync(BuildRequest(HttpMethod.Delete, HandoutsUri(scene, $"/{removed.GetProperty("id").GetGuid()}"), "handout-keeper-8"));

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, again.StatusCode);
        Assert.Equal(["Kept"], await TitlesAsync(client, scene, "handout-keeper-8"));
    }

    [Fact]
    public async Task Given_three_handouts_When_reordering_Then_it_is_200_with_summaries_in_the_new_order_and_get_scene_agrees()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "handout-keeper-9");
        var first = (await AddAsync(client, scene, "handout-keeper-9", "First")).GetProperty("id").GetGuid();
        var second = (await AddAsync(client, scene, "handout-keeper-9", "Second")).GetProperty("id").GetGuid();
        var third = (await AddAsync(client, scene, "handout-keeper-9", "Third")).GetProperty("id").GetGuid();

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(scene, "/order"), "handout-keeper-9", new { handoutIds = new[] { third, first, second } }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await BodyAsync(response);
        Assert.Equal(["handouts"], PropertyNames(body));
        Assert.Equal(["id", "kind", "visibility", "title"], PropertyNames(body.GetProperty("handouts")[0]));
        Assert.Equal(["Third", "First", "Second"], body.GetProperty("handouts").EnumerateArray().Select(handout => handout.GetProperty("title").GetString()));
        Assert.Equal(["Third", "First", "Second"], await TitlesAsync(client, scene, "handout-keeper-9"));
    }

    [Fact]
    public async Task Given_a_duplicate_or_stale_list_When_reordering_Then_duplicates_are_a_400_and_mismatches_a_409_and_the_order_is_unchanged()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "handout-keeper-10");
        var first = (await AddAsync(client, scene, "handout-keeper-10", "First")).GetProperty("id").GetGuid();
        var second = (await AddAsync(client, scene, "handout-keeper-10", "Second")).GetProperty("id").GetGuid();

        var duplicate = await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(scene, "/order"), "handout-keeper-10", new { handoutIds = new[] { first, first } }));
        var missing = await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(scene, "/order"), "handout-keeper-10", new { handoutIds = new[] { second } }));
        var foreign = await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(scene, "/order"), "handout-keeper-10", new { handoutIds = new[] { first, Guid.NewGuid() } }));

        var problems = await ProblemsAsync(duplicate);
        Assert.Equal(("The Handout ids must not repeat."), problems["handoutIds"].Single());
        Assert.All([missing, foreign], response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        Assert.Equal(StaleOrderTitle, await ProblemTitleAsync(missing));
        Assert.Equal(StaleOrderTitle, await ProblemTitleAsync(foreign));
        Assert.Equal(["First", "Second"], await TitlesAsync(client, scene, "handout-keeper-10"));
    }

    [Fact]
    public async Task Given_an_active_scene_When_adding_editing_and_reordering_Then_all_succeed_and_deleting_is_409()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "handout-keeper-11");
        var first = (await AddAsync(client, scene, "handout-keeper-11", "First")).GetProperty("id").GetGuid();
        await PlayAsync(scene.SceneId, SceneStatus.Active);

        var added = await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(scene), "handout-keeper-11", HandoutBody("Text", "KeeperFacing", "Added live", OtherText)));
        var edited = await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(scene, $"/{first}"), "handout-keeper-11", HandoutBody(title: "Edited live")));
        var addedId = (await BodyAsync(added)).GetProperty("id").GetGuid();
        var reordered = await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(scene, "/order"), "handout-keeper-11", new { handoutIds = new[] { addedId, first } }));
        var delete = await client.SendAsync(BuildRequest(HttpMethod.Delete, HandoutsUri(scene, $"/{first}"), "handout-keeper-11"));
        var deleteUnknown = await client.SendAsync(BuildRequest(HttpMethod.Delete, HandoutsUri(scene, $"/{Guid.NewGuid()}"), "handout-keeper-11"));

        Assert.Equal(
            [HttpStatusCode.Created, HttpStatusCode.OK, HttpStatusCode.OK, HttpStatusCode.Conflict, HttpStatusCode.Conflict],
            [added.StatusCode, edited.StatusCode, reordered.StatusCode, delete.StatusCode, deleteUnknown.StatusCode]);
        Assert.Equal(NotPreparedTitle, await ProblemTitleAsync(delete));
        Assert.Equal(NotPreparedTitle, await ProblemTitleAsync(deleteUnknown));
        Assert.Equal(["Added live", "Edited live"], await TitlesAsync(client, scene, "handout-keeper-11"));
    }

    [Fact]
    public async Task Given_a_finished_scene_When_changing_handouts_Then_each_is_a_409_with_its_title_and_nothing_changes()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "handout-keeper-12");
        var created = await AddAsync(client, scene, "handout-keeper-12", "Before");
        var id = created.GetProperty("id").GetGuid();
        await PlayAsync(scene.SceneId, SceneStatus.Finished);

        var post = await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(scene), "handout-keeper-12", HandoutBody()));
        var invalidPost = await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(scene), "handout-keeper-12", HandoutBody(title: "")));
        var put = await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(scene, $"/{id}"), "handout-keeper-12", HandoutBody(title: "After")));
        var order = await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(scene, "/order"), "handout-keeper-12", new { handoutIds = new[] { id } }));
        var delete = await client.SendAsync(BuildRequest(HttpMethod.Delete, HandoutsUri(scene, $"/{id}"), "handout-keeper-12"));
        var get = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(scene, $"/{id}"), "handout-keeper-12"));

        Assert.All([post, invalidPost, put, order, delete], response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        foreach (var response in new[] { post, invalidPost, put, order })
        {
            Assert.Equal(FinishedTitle, await ProblemTitleAsync(response));
        }

        Assert.Equal(NotPreparedTitle, await ProblemTitleAsync(delete));
        Assert.Equal(created.GetRawText(), (await BodyAsync(get)).GetRawText());
    }

    [Fact]
    public async Task Given_a_prepared_scene_with_handouts_When_the_scene_is_deleted_Then_the_handouts_are_removed()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "handout-keeper-13");
        await AddAsync(client, scene, "handout-keeper-13");

        var delete = await client.SendAsync(BuildRequest(HttpMethod.Delete, ScenesUri(scene.CampaignId, scene.ScenarioId, $"/{scene.SceneId}"), "handout-keeper-13"));

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        using var scope = _factory.Services.CreateScope();
        var remaining = await scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>().Database
            .SqlQueryRaw<int>("SELECT COUNT(*) AS [Value] FROM Handouts").SingleAsync();
        Assert.Equal(0, remaining);
    }

    [Fact]
    public async Task Given_a_player_or_another_keeper_or_other_ids_When_using_every_handout_endpoint_Then_each_is_the_same_404_without_the_text()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "handout-keeper-14");
        await JoinAsPlayerAsync(client, scene.CampaignId, "handout-keeper-14", "handout-player-14");
        var otherScene = await SceneAsync(client, "handout-other-keeper-14");
        var handoutId = (await AddAsync(client, scene, "handout-keeper-14", "Secret", "Text", "KeeperFacing", SecretDocument)).GetProperty("id").GetGuid();
        var otherScenario = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{scene.CampaignId}/scenarios", "handout-keeper-14", new { title = "Another" }));
        var otherScenarioId = (await BodyAsync(otherScenario)).GetProperty("id").GetGuid();

        async Task<IReadOnlyList<string>> AnswersAsync(string oid, Guid campaignId, Guid scenarioId, Guid sceneId, Guid handout)
        {
            var target = (campaignId, scenarioId, sceneId);
            var responses = new[]
            {
                await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(target, $"/{handout}"), oid)),
                await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(target), oid, HandoutBody())),
                await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(target, $"/{handout}"), oid, HandoutBody(title: "Hijacked"))),
                await client.SendAsync(BuildRequest(HttpMethod.Delete, HandoutsUri(target, $"/{handout}"), oid)),
                await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(target, "/order"), oid, new { handoutIds = new[] { handout } })),
            };
            Assert.All(responses, response => Assert.Equal(HttpStatusCode.NotFound, response.StatusCode));
            var bodies = new List<string>();
            foreach (var response in responses)
            {
                var body = await WithoutTraceIdAsync(response);
                Assert.DoesNotContain(SecretText, body);
                bodies.Add(body);
            }

            return bodies;
        }

        var player = await AnswersAsync("handout-player-14", scene.CampaignId, scene.ScenarioId, scene.SceneId, handoutId);
        var otherKeeper = await AnswersAsync("handout-other-keeper-14", scene.CampaignId, scene.ScenarioId, scene.SceneId, handoutId);
        var missingCampaign = await AnswersAsync("handout-keeper-14", Guid.NewGuid(), scene.ScenarioId, scene.SceneId, handoutId);
        var wrongScenario = await AnswersAsync("handout-keeper-14", scene.CampaignId, otherScenarioId, scene.SceneId, handoutId);
        var unknownScene = await AnswersAsync("handout-keeper-14", scene.CampaignId, scene.ScenarioId, Guid.NewGuid(), handoutId);
        var foreignScene = await AnswersAsync("handout-keeper-14", scene.CampaignId, otherScene.ScenarioId, otherScene.SceneId, handoutId);

        Assert.All(new[] { otherKeeper, missingCampaign, wrongScenario, unknownScene, foreignScene }, answers => Assert.Equal(player, answers));
        Assert.Equal(["Secret"], await TitlesAsync(client, scene, "handout-keeper-14"));
        var unknownHandout = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(scene, $"/{Guid.NewGuid()}"), "handout-keeper-14"));
        Assert.Equal(HttpStatusCode.NotFound, unknownHandout.StatusCode);
        Assert.Equal(player[0], await WithoutTraceIdAsync(unknownHandout));
    }

    [Fact]
    public async Task Given_a_player_When_reading_the_scene_Then_it_is_404_and_carries_no_handout_data()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "handout-keeper-15");
        await JoinAsPlayerAsync(client, scene.CampaignId, "handout-keeper-15", "handout-player-15");
        await AddAsync(client, scene, "handout-keeper-15", "Arrival", "ReadAloud", "PlayerFacing", SecretDocument);

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, ScenesUri(scene.CampaignId, scene.ScenarioId, $"/{scene.SceneId}"), "handout-player-15"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Arrival", body);
        Assert.DoesNotContain(SecretText, body);
    }

    [Fact]
    public async Task Given_an_unauthenticated_request_When_using_the_handout_endpoints_Then_it_is_unauthorized()
    {
        var client = _factory.CreateClient();
        var target = (Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        var requests = new[]
        {
            new HttpRequestMessage(HttpMethod.Get, HandoutsUri(target, $"/{Guid.NewGuid()}")),
            new HttpRequestMessage(HttpMethod.Post, HandoutsUri(target)),
            new HttpRequestMessage(HttpMethod.Put, HandoutsUri(target, $"/{Guid.NewGuid()}")),
            new HttpRequestMessage(HttpMethod.Delete, HandoutsUri(target, $"/{Guid.NewGuid()}")),
            new HttpRequestMessage(HttpMethod.Put, HandoutsUri(target, "/order")),
        };

        foreach (var request in requests)
        {
            request.Headers.Add("X-Test-Unauthenticated", "true");
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(request)).StatusCode);
        }
    }
}
