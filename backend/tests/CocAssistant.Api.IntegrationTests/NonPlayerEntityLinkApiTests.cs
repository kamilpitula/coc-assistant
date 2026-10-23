namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Scene link API and the delete refusal (specs/scenario-preparation/spec.md: link, edit, unlink, Keeper-only, Finished is
/// read-only, played material cannot be deleted, Prepared links cascade, a duplicate gets no links). A Player, another
/// Campaign's Keeper, and ids from another Scenario or Campaign all get an identical 404 (ADR 0013, ADR 0016). A refused write
/// is a 400 whose keys are request paths and whose values are server-owned messages (ADR 0018). Active and Finished Scenes are
/// seeded through the domain transitions because no endpoint starts a Scene yet.
/// </summary>
public class NonPlayerEntityLinkApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private const string Description =
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"A shape\",\"format\":1,\"style\":\"\"}]}]}}";

    private const string ImageDescription = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\",\"src\":\"https://example.com/a.png\"}]}}";

    private const string FinishedTitle = "A Finished Scene can't be changed.";
    private const string InUseTitle = "A Non-Player Entity linked to an Active or Finished Scene can't be deleted.";

    private readonly IdentityApiFactory _factory;

    public NonPlayerEntityLinkApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private static string ScenesUri(Guid campaignId, Guid scenarioId, string suffix = "") => $"/api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes{suffix}";

    private static string LinksUri(Guid campaignId, Guid scenarioId, Guid sceneId, string suffix = "") =>
        ScenesUri(campaignId, scenarioId, $"/{sceneId}/non-player-entity-links{suffix}");

    private static string HumanNpcsUri(Guid campaignId, string suffix = "") => $"/api/campaigns/{campaignId}/human-npcs{suffix}";

    private static string CreaturesUri(Guid campaignId, string suffix = "") => $"/api/campaigns/{campaignId}/mythos-creatures{suffix}";

    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static async Task<JsonElement> BodyAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();

    private static async Task<(Guid CampaignId, Guid ScenarioId, Guid SceneId)> SceneAsync(HttpClient client, string oid)
    {
        var campaignId = (await CreateCampaignAsync(client, oid)).Id;
        return await SceneInCampaignAsync(client, campaignId, oid);
    }

    private static async Task<(Guid CampaignId, Guid ScenarioId, Guid SceneId)> SceneInCampaignAsync(HttpClient client, Guid campaignId, string oid, string title = "The Corbitt House")
    {
        var scenario = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/scenarios", oid, new { title = "The Haunting" }));
        var scenarioId = (await BodyAsync(scenario)).GetProperty("id").GetGuid();
        var scene = await client.SendAsync(BuildRequest(HttpMethod.Post, ScenesUri(campaignId, scenarioId), oid, new { title }));
        Assert.Equal(HttpStatusCode.Created, scene.StatusCode);
        return (campaignId, scenarioId, (await BodyAsync(scene)).GetProperty("id").GetGuid());
    }

    private static async Task<Guid> CreateHumanNpcAsync(HttpClient client, Guid campaignId, string oid, string name = "Mr. Knott")
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, HumanNpcsUri(campaignId), oid, new { name, age = 62 }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await BodyAsync(response)).GetProperty("id").GetGuid();
    }

    private static async Task<Guid> CreateCreatureAsync(HttpClient client, Guid campaignId, string oid, string name = "Ghoul")
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, CreaturesUri(campaignId), oid, new { name }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await BodyAsync(response)).GetProperty("id").GetGuid();
    }

    private static object LinkBody(string? type, Guid? id, string? name = "A shape in the cellar", string? description = Description) => new
    {
        nonPlayerEntity = type is null && id is null ? null : new { type, id },
        playerFacingName = name,
        playerFacingDescription = description is null ? (JsonElement?)null : Json(description),
    };

    private static async Task<JsonElement> LinkAsync(HttpClient client, (Guid CampaignId, Guid ScenarioId, Guid SceneId) scene, string oid, string type, Guid id, string name = "A shape in the cellar", string? description = Description)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, LinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId), oid, LinkBody(type, id, name, description)));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await BodyAsync(response);
    }

    private static async Task<JsonElement> GetSceneAsync(HttpClient client, (Guid CampaignId, Guid ScenarioId, Guid SceneId) scene, string oid)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, ScenesUri(scene.CampaignId, scene.ScenarioId, $"/{scene.SceneId}"), oid));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await BodyAsync(response);
    }

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
        var scene = await dbContext.Scenes.SingleAsync(candidate => candidate.Id == sceneId);
        scene.Start(DateTimeOffset.UtcNow);
        if (status == SceneStatus.Finished)
        {
            scene.Finish(DateTimeOffset.UtcNow.AddMinutes(30));
        }

        await dbContext.SaveChangesAsync();
    }

    private async Task<int> StoredLinkCountAsync()
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>().NonPlayerEntityLinks.CountAsync();
    }

    [Fact]
    public async Task Given_a_keeper_When_linking_a_mythos_creature_Then_it_is_201_and_get_scene_returns_the_link_with_the_live_name_in_order_linked()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "link-keeper-1");
        var creatureId = await CreateCreatureAsync(client, scene.CampaignId, "link-keeper-1", "Ghoul");
        var humanId = await CreateHumanNpcAsync(client, scene.CampaignId, "link-keeper-1", "Mr. Knott");

        var first = await LinkAsync(client, scene, "link-keeper-1", "MythosCreature", creatureId, "  A shape in the cellar ");
        var second = await LinkAsync(client, scene, "link-keeper-1", "HumanNpc", humanId, "The landlord", null);
        var loaded = await GetSceneAsync(client, scene, "link-keeper-1");

        Assert.Equal(
            ("A shape in the cellar", "Ghoul", "MythosCreature", creatureId),
            (first.GetProperty("playerFacingName").GetString(), first.GetProperty("nonPlayerEntity").GetProperty("name").GetString(), first.GetProperty("nonPlayerEntity").GetProperty("type").GetString(), first.GetProperty("nonPlayerEntity").GetProperty("id").GetGuid()));
        Assert.Equal(Json(Description).GetRawText(), first.GetProperty("playerFacingDescription").GetRawText());
        Assert.Equal(JsonValueKind.Null, second.GetProperty("playerFacingDescription").ValueKind);
        var links = loaded.GetProperty("nonPlayerEntityLinks").EnumerateArray().ToList();
        Assert.Equal([first.GetProperty("id").GetGuid(), second.GetProperty("id").GetGuid()], links.Select(link => link.GetProperty("id").GetGuid()));
        Assert.Equal(first.GetRawText(), links[0].GetRawText());
        Assert.Equal(["id", "nonPlayerEntity", "playerFacingName", "playerFacingDescription"], links[0].EnumerateObject().Select(property => property.Name));
        Assert.Equal(["id", "type", "name"], links[0].GetProperty("nonPlayerEntity").EnumerateObject().Select(property => property.Name));
    }

    [Fact]
    public async Task Given_a_new_scene_When_reading_it_Then_nonPlayerEntityLinks_is_an_empty_array()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "link-keeper-2");

        var loaded = await GetSceneAsync(client, scene, "link-keeper-2");

        Assert.Equal(JsonValueKind.Array, loaded.GetProperty("nonPlayerEntityLinks").ValueKind);
        Assert.Equal(0, loaded.GetProperty("nonPlayerEntityLinks").GetArrayLength());
    }

    [Fact]
    public async Task Given_a_mythos_creature_with_attacks_armor_powers_and_sanity_loss_When_linked_Then_the_scene_references_it_and_the_profile_is_unchanged()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "link-keeper-3");
        var creatureId = await CreateCreatureAsync(client, scene.CampaignId, "link-keeper-3", "Ghoul");
        var profile = new
        {
            name = "Ghoul",
            details = new { creatureKind = "mythos" },
            keeperNotes = (JsonElement?)null,
            characteristics = new
            {
                values = new Dictionary<string, int?> { ["STR"] = 80, ["CON"] = 60, ["SIZ"] = 60, ["DEX"] = 60, ["INT"] = 60, ["POW"] = 60 },
                hitPointsNotApplicable = false,
                overrides = (object?)null,
            },
            combat = new
            {
                attacksPerRound = 3,
                dodge = 30,
                attacks = new[] { new { name = "Claw", skill = "Fighting", skillValue = 40, damage = "1D6+DB", effect = (string?)null, manoeuvre = false } },
            },
            defenses = new { armorPoints = 2, armorNote = (string?)null, immunities = Array.Empty<object>(), vulnerabilities = Array.Empty<object>() },
            powers = new[] { new { name = "Drain", magicPointCost = (string?)null, effect = (string?)null, limits = "Once per day" } },
            sanityLoss = new { value = "0/1D6" },
        };
        var put = await client.SendAsync(BuildRequest(HttpMethod.Put, CreaturesUri(scene.CampaignId, $"/{creatureId}"), "link-keeper-3", profile));
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);
        var before = await client.SendAsync(BuildRequest(HttpMethod.Get, CreaturesUri(scene.CampaignId, $"/{creatureId}"), "link-keeper-3"));

        await LinkAsync(client, scene, "link-keeper-3", "MythosCreature", creatureId);
        var loaded = await GetSceneAsync(client, scene, "link-keeper-3");
        var after = await client.SendAsync(BuildRequest(HttpMethod.Get, CreaturesUri(scene.CampaignId, $"/{creatureId}"), "link-keeper-3"));

        var reference = Assert.Single(loaded.GetProperty("nonPlayerEntityLinks").EnumerateArray()).GetProperty("nonPlayerEntity");
        Assert.Equal(("MythosCreature", creatureId), (reference.GetProperty("type").GetString(), reference.GetProperty("id").GetGuid()));
        var creature = await BodyAsync(after);
        Assert.Equal(
            ("Claw", 2, "Drain", "0/1D6"),
            (creature.GetProperty("combat").GetProperty("attacks")[0].GetProperty("name").GetString(),
                creature.GetProperty("defenses").GetProperty("armorPoints").GetInt32(),
                creature.GetProperty("powers")[0].GetProperty("name").GetString(),
                creature.GetProperty("sanityLoss").GetProperty("value").GetString()));
        Assert.Equal((await BodyAsync(before)).GetRawText(), creature.GetRawText());
    }

    [Fact]
    public async Task Given_the_same_entity_When_linked_twice_Then_the_scene_has_two_links_with_different_ids()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "link-keeper-4");
        var humanId = await CreateHumanNpcAsync(client, scene.CampaignId, "link-keeper-4");

        var first = await LinkAsync(client, scene, "link-keeper-4", "HumanNpc", humanId, "Disguised");
        var second = await LinkAsync(client, scene, "link-keeper-4", "HumanNpc", humanId, "Unmasked");

        Assert.NotEqual(first.GetProperty("id").GetGuid(), second.GetProperty("id").GetGuid());
        Assert.Equal(2, (await GetSceneAsync(client, scene, "link-keeper-4")).GetProperty("nonPlayerEntityLinks").GetArrayLength());
    }

    [Fact]
    public async Task Given_a_link_When_editing_it_Then_it_is_200_the_entity_stays_fixed_and_unlinking_is_204_and_leaves_the_profile()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "link-keeper-5");
        var humanId = await CreateHumanNpcAsync(client, scene.CampaignId, "link-keeper-5");
        var otherId = await CreateHumanNpcAsync(client, scene.CampaignId, "link-keeper-5", "Someone else");
        var link = await LinkAsync(client, scene, "link-keeper-5", "HumanNpc", humanId, "Before");
        var linkId = link.GetProperty("id").GetGuid();

        var edit = await client.SendAsync(BuildRequest(
            HttpMethod.Put,
            LinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId, $"/{linkId}"),
            "link-keeper-5",
            new { nonPlayerEntity = new { type = "HumanNpc", id = otherId }, playerFacingName = "  After ", playerFacingDescription = (JsonElement?)null }));
        var edited = await BodyAsync(edit);
        var unlink = await client.SendAsync(BuildRequest(HttpMethod.Delete, LinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId, $"/{linkId}"), "link-keeper-5"));
        var again = await client.SendAsync(BuildRequest(HttpMethod.Delete, LinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId, $"/{linkId}"), "link-keeper-5"));
        var profile = await client.SendAsync(BuildRequest(HttpMethod.Get, HumanNpcsUri(scene.CampaignId, $"/{humanId}"), "link-keeper-5"));

        Assert.Equal(HttpStatusCode.OK, edit.StatusCode);
        Assert.Equal((linkId, "After", humanId), (edited.GetProperty("id").GetGuid(), edited.GetProperty("playerFacingName").GetString(), edited.GetProperty("nonPlayerEntity").GetProperty("id").GetGuid()));
        Assert.Equal(JsonValueKind.Null, edited.GetProperty("playerFacingDescription").ValueKind);
        Assert.Equal(HttpStatusCode.NoContent, unlink.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, again.StatusCode);
        Assert.Equal(HttpStatusCode.OK, profile.StatusCode);
        Assert.Equal(0, (await GetSceneAsync(client, scene, "link-keeper-5")).GetProperty("nonPlayerEntityLinks").GetArrayLength());
    }

    [Fact]
    public async Task Given_invalid_links_When_posting_Then_each_is_a_400_keyed_by_request_path_with_a_server_owned_message()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "link-keeper-6");
        var humanId = await CreateHumanNpcAsync(client, scene.CampaignId, "link-keeper-6");
        var otherCampaignId = (await CreateCampaignAsync(client, "link-keeper-6")).Id;
        var elsewhereId = await CreateHumanNpcAsync(client, otherCampaignId, "link-keeper-6", "Elsewhere");
        const string chooseEntity = "Choose a Non-Player Entity from this Campaign.";

        async Task<IReadOnlyDictionary<string, string[]>> PostAsync(object body) =>
            await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Post, LinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId), "link-keeper-6", body)));

        var missing = await PostAsync(LinkBody(null, null));
        var unknownType = await PostAsync(LinkBody("Monster", humanId));
        var noId = await PostAsync(LinkBody("HumanNpc", null));
        var unknownEntity = await PostAsync(LinkBody("HumanNpc", Guid.NewGuid()));
        var otherCampaign = await PostAsync(LinkBody("HumanNpc", elsewhereId));
        var wrongType = await PostAsync(LinkBody("MythosCreature", humanId));
        var emptyName = await PostAsync(LinkBody("HumanNpc", humanId, "   "));
        var noName = await PostAsync(LinkBody("HumanNpc", humanId, null));
        var longName = await PostAsync(LinkBody("HumanNpc", humanId, new string('n', 201)));
        var badDescription = await PostAsync(LinkBody("HumanNpc", humanId, "Name", ImageDescription));

        Assert.All(
            new[] { missing, unknownType, noId, unknownEntity, otherCampaign, wrongType },
            problems =>
            {
                Assert.Equal(["nonPlayerEntity"], problems.Keys);
                Assert.Equal([chooseEntity], problems["nonPlayerEntity"]);
            });
        Assert.All(new[] { emptyName, noName }, problems => Assert.Equal(["Enter a Player-facing name."], problems["playerFacingName"]));
        Assert.Equal(["Player-facing name must be 200 characters or fewer."], longName["playerFacingName"]);
        Assert.Equal(["This Player-facing description can't be saved. Shorten it or remove unsupported content."], badDescription["playerFacingDescription"]);
        Assert.Equal(0, await StoredLinkCountAsync());
    }

    [Fact]
    public async Task Given_invalid_fields_When_editing_a_link_Then_each_is_a_400_and_the_link_is_unchanged()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "link-keeper-7");
        var humanId = await CreateHumanNpcAsync(client, scene.CampaignId, "link-keeper-7");
        var linkId = (await LinkAsync(client, scene, "link-keeper-7", "HumanNpc", humanId, "Before")).GetProperty("id").GetGuid();
        var uri = LinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId, $"/{linkId}");

        var emptyName = await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Put, uri, "link-keeper-7", new { playerFacingName = "" })));
        var badDescription = await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Put, uri, "link-keeper-7", new { playerFacingName = "After", playerFacingDescription = Json(ImageDescription) })));

        Assert.Equal(["Enter a Player-facing name."], emptyName["playerFacingName"]);
        Assert.Equal(["playerFacingDescription"], badDescription.Keys);
        var stored = Assert.Single((await GetSceneAsync(client, scene, "link-keeper-7")).GetProperty("nonPlayerEntityLinks").EnumerateArray());
        Assert.Equal("Before", stored.GetProperty("playerFacingName").GetString());
    }

    [Fact]
    public async Task Given_an_active_scene_When_linking_editing_and_unlinking_Then_all_three_succeed()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "link-keeper-8");
        var humanId = await CreateHumanNpcAsync(client, scene.CampaignId, "link-keeper-8");
        await PlayAsync(scene.SceneId, SceneStatus.Active);

        var link = await LinkAsync(client, scene, "link-keeper-8", "HumanNpc", humanId);
        var uri = LinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId, $"/{link.GetProperty("id").GetGuid()}");
        var edit = await client.SendAsync(BuildRequest(HttpMethod.Put, uri, "link-keeper-8", new { playerFacingName = "Changed" }));
        var unlink = await client.SendAsync(BuildRequest(HttpMethod.Delete, uri, "link-keeper-8"));

        Assert.Equal((HttpStatusCode.OK, HttpStatusCode.NoContent), (edit.StatusCode, unlink.StatusCode));
    }

    [Fact]
    public async Task Given_a_finished_scene_When_linking_editing_or_unlinking_Then_each_is_the_same_409_title_and_the_links_are_unchanged()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "link-keeper-9");
        var humanId = await CreateHumanNpcAsync(client, scene.CampaignId, "link-keeper-9");
        var link = await LinkAsync(client, scene, "link-keeper-9", "HumanNpc", humanId, "Before");
        await PlayAsync(scene.SceneId, SceneStatus.Finished);
        var uri = LinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId, $"/{link.GetProperty("id").GetGuid()}");

        var post = await client.SendAsync(BuildRequest(HttpMethod.Post, LinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId), "link-keeper-9", LinkBody("HumanNpc", humanId)));
        var invalidPost = await client.SendAsync(BuildRequest(HttpMethod.Post, LinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId), "link-keeper-9", LinkBody("HumanNpc", humanId, "")));
        var put = await client.SendAsync(BuildRequest(HttpMethod.Put, uri, "link-keeper-9", new { playerFacingName = "After" }));
        var delete = await client.SendAsync(BuildRequest(HttpMethod.Delete, uri, "link-keeper-9"));

        Assert.All([post, invalidPost, put, delete], response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        foreach (var response in new[] { post, invalidPost, put, delete })
        {
            Assert.Equal(FinishedTitle, await ProblemTitleAsync(response));
        }

        var stored = Assert.Single((await GetSceneAsync(client, scene, "link-keeper-9")).GetProperty("nonPlayerEntityLinks").EnumerateArray());
        Assert.Equal("Before", stored.GetProperty("playerFacingName").GetString());
    }

    [Fact]
    public async Task Given_a_finished_scene_When_linking_an_entity_outside_the_Campaign_Then_it_is_409_not_400_and_nothing_changes()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "link-keeper-finished-outside");
        var otherCampaignId = (await CreateCampaignAsync(client, "link-keeper-finished-outside")).Id;
        var elsewhereId = await CreateHumanNpcAsync(client, otherCampaignId, "link-keeper-finished-outside", "Elsewhere");
        await PlayAsync(scene.SceneId, SceneStatus.Finished);
        var uri = LinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId);

        var responses = new[]
        {
            await client.SendAsync(BuildRequest(HttpMethod.Post, uri, "link-keeper-finished-outside", LinkBody("HumanNpc", elsewhereId))),
            await client.SendAsync(BuildRequest(HttpMethod.Post, uri, "link-keeper-finished-outside", LinkBody("HumanNpc", Guid.NewGuid()))),
            await client.SendAsync(BuildRequest(HttpMethod.Post, uri, "link-keeper-finished-outside", LinkBody(null, null))),
        };

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        foreach (var response in responses)
        {
            Assert.Equal(FinishedTitle, await ProblemTitleAsync(response));
        }

        Assert.Equal(0, await StoredLinkCountAsync());
    }

    [Fact]
    public async Task Given_a_player_or_another_keeper_or_other_ids_When_using_every_link_endpoint_Then_each_is_the_same_404()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "link-keeper-10");
        await JoinAsPlayerAsync(client, scene.CampaignId, "link-keeper-10", "link-player-10");
        var otherScene = await SceneAsync(client, "link-other-keeper-10");
        var humanId = await CreateHumanNpcAsync(client, scene.CampaignId, "link-keeper-10");
        var linkId = (await LinkAsync(client, scene, "link-keeper-10", "HumanNpc", humanId)).GetProperty("id").GetGuid();
        var otherScenario = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{scene.CampaignId}/scenarios", "link-keeper-10", new { title = "Another" }));
        var otherScenarioId = (await BodyAsync(otherScenario)).GetProperty("id").GetGuid();

        async Task<IReadOnlyList<string>> AnswersAsync(string oid, Guid campaignId, Guid scenarioId, Guid sceneId, Guid link)
        {
            var uri = LinksUri(campaignId, scenarioId, sceneId, $"/{link}");
            var responses = new[]
            {
                await client.SendAsync(BuildRequest(HttpMethod.Post, LinksUri(campaignId, scenarioId, sceneId), oid, LinkBody("HumanNpc", humanId))),
                await client.SendAsync(BuildRequest(HttpMethod.Put, uri, oid, new { playerFacingName = "Hijacked" })),
                await client.SendAsync(BuildRequest(HttpMethod.Delete, uri, oid)),
            };
            Assert.All(responses, response => Assert.Equal(HttpStatusCode.NotFound, response.StatusCode));
            return [await WithoutTraceIdAsync(responses[0]), await WithoutTraceIdAsync(responses[1]), await WithoutTraceIdAsync(responses[2])];
        }

        var player = await AnswersAsync("link-player-10", scene.CampaignId, scene.ScenarioId, scene.SceneId, linkId);
        var otherKeeper = await AnswersAsync("link-other-keeper-10", scene.CampaignId, scene.ScenarioId, scene.SceneId, linkId);
        var missingCampaign = await AnswersAsync("link-keeper-10", Guid.NewGuid(), scene.ScenarioId, scene.SceneId, linkId);
        var wrongScenario = await AnswersAsync("link-keeper-10", scene.CampaignId, otherScenarioId, scene.SceneId, linkId);
        var unknownScene = await AnswersAsync("link-keeper-10", scene.CampaignId, scene.ScenarioId, Guid.NewGuid(), linkId);
        var unknownLinkUri = LinksUri(scene.CampaignId, scene.ScenarioId, scene.SceneId, $"/{Guid.NewGuid()}");
        var unknownLinkPut = await client.SendAsync(BuildRequest(HttpMethod.Put, unknownLinkUri, "link-keeper-10", new { playerFacingName = "Hijacked" }));
        var unknownLinkDelete = await client.SendAsync(BuildRequest(HttpMethod.Delete, unknownLinkUri, "link-keeper-10"));
        var foreignScene = await AnswersAsync("link-keeper-10", scene.CampaignId, otherScene.ScenarioId, otherScene.SceneId, linkId);

        Assert.All(new[] { otherKeeper, missingCampaign, wrongScenario, unknownScene, foreignScene }, answers => Assert.Equal(player, answers));
        Assert.Equal(player[1], await WithoutTraceIdAsync(unknownLinkPut));
        Assert.Equal(player[2], await WithoutTraceIdAsync(unknownLinkDelete));
        Assert.Equal(1, await StoredLinkCountAsync());
    }

    [Theory]
    [InlineData("HumanNpc")]
    [InlineData("MythosCreature")]
    public async Task Given_an_entity_linked_to_an_active_or_finished_scene_When_deleting_it_Then_it_is_a_409_and_it_stays(string type)
    {
        var client = _factory.CreateClient();
        var oid = $"link-keeper-11-{type}";
        var active = await SceneAsync(client, oid);
        var finished = await SceneInCampaignAsync(client, active.CampaignId, oid, "The cellar");
        var id = type == "HumanNpc" ? await CreateHumanNpcAsync(client, active.CampaignId, oid) : await CreateCreatureAsync(client, active.CampaignId, oid);
        var uri = type == "HumanNpc" ? HumanNpcsUri(active.CampaignId, $"/{id}") : CreaturesUri(active.CampaignId, $"/{id}");
        await LinkAsync(client, active, oid, type, id);
        await PlayAsync(active.SceneId, SceneStatus.Active);

        var whileActive = await client.SendAsync(BuildRequest(HttpMethod.Delete, uri, oid));
        await LinkAsync(client, finished, oid, type, id);
        await PlayAsync(finished.SceneId, SceneStatus.Finished);
        var unlink = await client.SendAsync(BuildRequest(HttpMethod.Delete, LinksUri(active.CampaignId, active.ScenarioId, active.SceneId, $"/{(await GetSceneAsync(client, active, oid)).GetProperty("nonPlayerEntityLinks")[0].GetProperty("id").GetGuid()}"), oid));
        var whileFinished = await client.SendAsync(BuildRequest(HttpMethod.Delete, uri, oid));
        var get = await client.SendAsync(BuildRequest(HttpMethod.Get, uri, oid));

        Assert.Equal(HttpStatusCode.Conflict, whileActive.StatusCode);
        Assert.Equal(InUseTitle, await ProblemTitleAsync(whileActive));
        Assert.Equal(HttpStatusCode.NoContent, unlink.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, whileFinished.StatusCode);
        Assert.Equal(InUseTitle, await ProblemTitleAsync(whileFinished));
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
    }

    [Theory]
    [InlineData("HumanNpc")]
    [InlineData("MythosCreature")]
    public async Task Given_an_entity_linked_only_to_prepared_scenes_When_deleting_it_Then_it_is_204_and_its_links_are_gone(string type)
    {
        var client = _factory.CreateClient();
        var oid = $"link-keeper-12-{type}";
        var scene = await SceneAsync(client, oid);
        var other = await SceneInCampaignAsync(client, scene.CampaignId, oid, "Second");
        var id = type == "HumanNpc" ? await CreateHumanNpcAsync(client, scene.CampaignId, oid) : await CreateCreatureAsync(client, scene.CampaignId, oid);
        var keptId = await CreateHumanNpcAsync(client, scene.CampaignId, oid, "Bystander");
        await LinkAsync(client, scene, oid, type, id);
        await LinkAsync(client, other, oid, type, id);
        await LinkAsync(client, scene, oid, "HumanNpc", keptId, "Stays");

        var delete = await client.SendAsync(BuildRequest(HttpMethod.Delete, type == "HumanNpc" ? HumanNpcsUri(scene.CampaignId, $"/{id}") : CreaturesUri(scene.CampaignId, $"/{id}"), oid));

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        var remaining = Assert.Single((await GetSceneAsync(client, scene, oid)).GetProperty("nonPlayerEntityLinks").EnumerateArray());
        Assert.Equal("Stays", remaining.GetProperty("playerFacingName").GetString());
        Assert.Equal(0, (await GetSceneAsync(client, other, oid)).GetProperty("nonPlayerEntityLinks").GetArrayLength());
    }

    [Fact]
    public async Task Given_a_prepared_scene_with_links_When_it_is_removed_Then_its_links_go_with_it_and_the_profile_stays()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "link-keeper-13");
        var humanId = await CreateHumanNpcAsync(client, scene.CampaignId, "link-keeper-13");
        await LinkAsync(client, scene, "link-keeper-13", "HumanNpc", humanId);

        var remove = await client.SendAsync(BuildRequest(HttpMethod.Delete, ScenesUri(scene.CampaignId, scene.ScenarioId, $"/{scene.SceneId}"), "link-keeper-13"));
        var profile = await client.SendAsync(BuildRequest(HttpMethod.Get, HumanNpcsUri(scene.CampaignId, $"/{humanId}"), "link-keeper-13"));

        Assert.Equal(HttpStatusCode.NoContent, remove.StatusCode);
        Assert.Equal(HttpStatusCode.OK, profile.StatusCode);
        Assert.Equal(0, await StoredLinkCountAsync());
    }

    [Theory]
    [InlineData("HumanNpc")]
    [InlineData("MythosCreature")]
    public async Task Given_a_linked_profile_When_duplicating_it_Then_the_copy_is_in_no_link(string type)
    {
        var client = _factory.CreateClient();
        var oid = $"link-keeper-14-{type}";
        var scene = await SceneAsync(client, oid);
        var id = type == "HumanNpc" ? await CreateHumanNpcAsync(client, scene.CampaignId, oid) : await CreateCreatureAsync(client, scene.CampaignId, oid);
        await LinkAsync(client, scene, oid, type, id);

        var duplicate = await client.SendAsync(BuildRequest(HttpMethod.Post, (type == "HumanNpc" ? HumanNpcsUri(scene.CampaignId, $"/{id}") : CreaturesUri(scene.CampaignId, $"/{id}")) + "/duplicate", oid));
        var copyId = (await BodyAsync(duplicate)).GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.Created, duplicate.StatusCode);
        var link = Assert.Single((await GetSceneAsync(client, scene, oid)).GetProperty("nonPlayerEntityLinks").EnumerateArray());
        Assert.Equal(id, link.GetProperty("nonPlayerEntity").GetProperty("id").GetGuid());
        Assert.NotEqual(copyId, id);
        Assert.Equal(1, await StoredLinkCountAsync());
    }
}
