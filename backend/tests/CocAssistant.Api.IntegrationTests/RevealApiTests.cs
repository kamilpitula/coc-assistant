namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// Reveals and Clues (specs/scene-play/spec.md, API Contracts and Scenarios; PBI-SPL-002): every 400, 404, and 409 with their order,
/// targeting in the Active Scene and in Clues, the Reveal file, snapshots that survive later changes, and the live signals that reach
/// only the Keeper and the targeted Players. Authorization for every route is in ScenePlayAuthorizationMatrixTests.
/// </summary>
public class RevealApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public RevealApiTests(IdentityApiFactory factory) => _factory = factory;

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
        string StrangerOid,
        Guid CampaignId,
        Guid HarveyId,
        Guid LucyId,
        Guid ScenarioId,
        Guid MeetingKnott,
        Guid CorbittHouse);

    private async Task<Table> TableAsync(string suffix, bool start = true)
    {
        var client = _factory.CreateClient();
        var keeper = $"reveal-keeper-{suffix}";
        var harveyOid = $"reveal-harvey-{suffix}";
        var lucyOid = $"reveal-lucy-{suffix}";
        var campaignId = (await CreateCampaignAsync(client, keeper)).Id;
        await JoinAsPlayerAsync(client, campaignId, keeper, harveyOid);
        await JoinAsPlayerAsync(client, campaignId, keeper, lucyOid);
        var harvey = await CreateApprovedAsync(client, campaignId, keeper, harveyOid, "Harvey Walters");
        var lucy = await CreateApprovedAsync(client, campaignId, keeper, lucyOid, "Lucy Ward");
        var scenario = await CreateAsync(client, $"/api/campaigns/{campaignId}/scenarios", keeper, new { title = "The Haunting" });
        var scenes = $"/api/campaigns/{campaignId}/scenarios/{scenario}/scenes";
        var meetingKnott = await CreateAsync(client, scenes, keeper, new { title = "Meeting Knott", location = "Arkham" });
        var corbittHouse = await CreateAsync(client, scenes, keeper, new { title = "The Corbitt House", location = "Boston Road" });
        var table = new Table(client, keeper, harveyOid, lucyOid, $"reveal-stranger-{suffix}", campaignId, harvey, lucy, scenario, meetingKnott, corbittHouse);
        if (start)
        {
            Assert.Equal(HttpStatusCode.OK, (await StartAsync(table, corbittHouse, [harvey, lucy])).StatusCode);
        }

        return table;
    }

    private static async Task<Guid> CreateAsync(HttpClient client, string uri, string oid, object body)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, uri, oid, body));
        Assert.True(response.StatusCode is HttpStatusCode.Created or HttpStatusCode.OK, $"POST {uri} answered {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static string CampaignUri(Table table, string suffix) => $"/api/campaigns/{table.CampaignId}{suffix}";

    private static string SceneUri(Table table, Guid sceneId, string suffix = "") =>
        $"/api/campaigns/{table.CampaignId}/scenarios/{table.ScenarioId}/scenes/{sceneId}{suffix}";

    private static Task<HttpResponseMessage> StartAsync(Table table, Guid sceneId, Guid[] present, bool finishActiveScene = false) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, CampaignUri(table, $"/scenes/{sceneId}/start"), table.KeeperOid, new { presentInvestigatorIds = present, finishActiveScene }));

    private static Task<HttpResponseMessage> FinishAsync(Table table) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, CampaignUri(table, "/active-scene/finish"), table.KeeperOid));

    private static Task<HttpResponseMessage> ChangePresentAsync(Table table, params Guid[] present) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Put, CampaignUri(table, "/active-scene/present-investigators"), table.KeeperOid, new { presentInvestigatorIds = present }));

    private static Task<HttpResponseMessage> GetActiveAsync(Table table, string oid) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Get, CampaignUri(table, "/active-scene"), oid));

    private static Task<HttpResponseMessage> RevealAsync(Table table, object body, string? oid = null) =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Post, CampaignUri(table, "/active-scene/reveals"), oid ?? table.KeeperOid, body));

    private static object Subject(string type, Guid id) => new { type, id };

    private static Task<HttpResponseMessage> RevealHandoutAsync(Table table, Guid handoutId, Guid[]? to = null) =>
        RevealAsync(table, new { subject = Subject("Handout", handoutId), investigatorIds = to });

    private static Task<HttpResponseMessage> CluesAsync(Table table, string oid, string path = "mine") =>
        table.Client.SendAsync(BuildRequest(HttpMethod.Get, CampaignUri(table, $"/investigators/{path}/clues"), oid));

    private static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();

    private static string Rich(string text) =>
        PreparedScenarioSeed.RichText(text);

    private static Task<Guid> AddTextHandoutAsync(Table table, Guid sceneId, string title, string visibility = "PlayerFacing", string text = "The door creaks open") =>
        CreateAsync(table.Client, SceneUri(table, sceneId, "/handouts"), table.KeeperOid, new { kind = "ReadAloud", visibility, title, content = PreparedScenarioSeed.Json(Rich(text)) });

    private static MultipartFormDataContent MapContent(string title, byte[] file, string? imageDescription, string kind = "Map", string visibility = "PlayerFacing")
    {
        var content = new MultipartFormDataContent
        {
            { new StringContent(kind), "kind" },
            { new StringContent(visibility), "visibility" },
            { new StringContent(title), "title" },
        };
        if (imageDescription is not null)
        {
            content.Add(new StringContent(imageDescription), "imageDescription");
        }

        var part = new ByteArrayContent(file);
        part.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
        content.Add(part, "file", "cellar.png");
        return content;
    }

    private static async Task<Guid> AddMapHandoutAsync(Table table, Guid sceneId, string title = "Corbitt House cellar", string? imageDescription = "A plan of the cellar")
    {
        var request = BuildRequest(HttpMethod.Post, SceneUri(table, sceneId, "/handouts"), table.KeeperOid);
        request.Content = MapContent(title, ScenarioPreparation.Tests.HandoutFileSamples.Png(), imageDescription);
        var response = await table.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await JsonAsync(response)).GetProperty("id").GetGuid();
    }

    private static string[] Titles(JsonElement reveals) => reveals.EnumerateArray().Select(reveal => reveal.GetProperty("title").GetString()!).ToArray();

    private static string[] Errors(JsonElement problem) => problem.GetProperty("errors").EnumerateObject().Select(error => error.Name).ToArray();

    private string[] StoredBlobs() =>
        Directory.Exists(_factory.HandoutFilesDirectory) ? Directory.GetFiles(_factory.HandoutFilesDirectory).Select(Path.GetFileName).OfType<string>().ToArray() : [];

    private async Task<int> SceneVersionAsync(Guid sceneId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>();
        return await dbContext.Scenes.Where(candidate => candidate.Id == sceneId).Select(scene => scene.Version).SingleAsync();
    }

    private async Task<int> RevealRowsAsync()
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>().Set<Reveal>().CountAsync();
    }

    [Fact]
    public async Task Given_a_handout_When_the_Keeper_reveals_it_to_one_Investigator_Then_only_that_Player_sees_it_and_the_Keeper_sees_the_recipients()
    {
        var table = await TableAsync("1");
        var handoutId = await AddTextHandoutAsync(table, table.CorbittHouse, "The cellar door");

        var response = await RevealHandoutAsync(table, handoutId, [table.HarveyId]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var reveal = await JsonAsync(response);
        Assert.Equal(("Handout", "The cellar door", handoutId), (reveal.GetProperty("subjectType").GetString(), reveal.GetProperty("title").GetString(), reveal.GetProperty("subjectId").GetGuid()));
        Assert.Equal(("ReadAloud", JsonValueKind.Object), (reveal.GetProperty("handoutKind").GetString(), reveal.GetProperty("content").ValueKind));
        var recipient = Assert.Single(reveal.GetProperty("recipients").EnumerateArray());
        Assert.Equal((table.HarveyId, "Harvey Walters"), (recipient.GetProperty("id").GetGuid(), recipient.GetProperty("name").GetString()));
        Assert.Equal(reveal.GetRawText(), (await JsonAsync(await GetActiveAsync(table, table.KeeperOid))).GetProperty("reveals")[0].GetRawText());

        var harveyRaw = await (await GetActiveAsync(table, table.HarveyOid)).Content.ReadAsStringAsync();
        var harvey = JsonDocument.Parse(harveyRaw).RootElement;
        var seen = Assert.Single(harvey.GetProperty("reveals").EnumerateArray());
        Assert.Equal("The cellar door", seen.GetProperty("title").GetString());
        Assert.DoesNotContain(handoutId.ToString(), harveyRaw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(table.LucyId.ToString(), harveyRaw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(table.HarveyId.ToString(), harveyRaw, StringComparison.OrdinalIgnoreCase);
        Assert.False(seen.TryGetProperty("subjectId", out _));
        Assert.False(seen.TryGetProperty("recipients", out _));

        var lucyRaw = await (await GetActiveAsync(table, table.LucyOid)).Content.ReadAsStringAsync();
        Assert.Equal(0, JsonDocument.Parse(lucyRaw).RootElement.GetProperty("reveals").GetArrayLength());
        Assert.DoesNotContain("The cellar door", lucyRaw, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Given_no_Investigators_named_When_revealing_Then_every_Investigator_present_receives_it_and_the_Scene_version_is_unchanged()
    {
        var table = await TableAsync("2");
        var handoutId = await AddTextHandoutAsync(table, table.CorbittHouse, "The cellar door");
        await ChangePresentAsync(table, table.HarveyId);
        var versionBefore = await SceneVersionAsync(table.CorbittHouse);

        var response = await RevealHandoutAsync(table, handoutId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal([table.HarveyId], (await JsonAsync(response)).GetProperty("recipients").EnumerateArray().Select(recipient => recipient.GetProperty("id").GetGuid()).ToArray());
        Assert.Equal(1, (await JsonAsync(await GetActiveAsync(table, table.HarveyOid))).GetProperty("reveals").GetArrayLength());
        Assert.Equal(versionBefore, await SceneVersionAsync(table.CorbittHouse));
    }

    [Fact]
    public async Task Given_a_re_reveal_to_the_same_Investigator_When_revealing_again_Then_there_are_two_reveals_newest_first()
    {
        var table = await TableAsync("3");
        var handoutId = await AddTextHandoutAsync(table, table.CorbittHouse, "The cellar door");

        await RevealHandoutAsync(table, handoutId, [table.HarveyId]);
        await RevealHandoutAsync(table, handoutId, [table.HarveyId]);

        var reveals = (await JsonAsync(await GetActiveAsync(table, table.HarveyOid))).GetProperty("reveals");
        Assert.Equal(2, reveals.GetArrayLength());
        Assert.True(reveals[0].GetProperty("revealedAt").GetDateTimeOffset() >= reveals[1].GetProperty("revealedAt").GetDateTimeOffset());
        Assert.Equal(2, await RevealRowsAsync());
    }

    [Fact]
    public async Task Given_a_Non_Player_Entity_link_When_revealing_Then_only_its_player_facing_name_and_description_are_shown()
    {
        var table = await TableAsync("4");
        var humanNpcId = await CreateAsync(table.Client, CampaignUri(table, "/human-npcs"), table.KeeperOid, new { name = "Walter Corbitt secret name", age = 62 });
        var linkId = await CreateAsync(table.Client, SceneUri(table, table.CorbittHouse, "/non-player-entity-links"), table.KeeperOid, new
        {
            nonPlayerEntity = new { type = "HumanNpc", id = humanNpcId },
            playerFacingName = "A nervous clerk",
            playerFacingDescription = PreparedScenarioSeed.Json(Rich("He keeps looking at the door")),
        });

        var response = await RevealAsync(table, new { subject = Subject("NonPlayerEntity", linkId), investigatorIds = new[] { table.LucyId } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var lucyRaw = await (await GetActiveAsync(table, table.LucyOid)).Content.ReadAsStringAsync();
        Assert.Contains("A nervous clerk", lucyRaw, StringComparison.Ordinal);
        Assert.Contains("He keeps looking at the door", lucyRaw, StringComparison.Ordinal);
        Assert.DoesNotContain("Walter Corbitt secret name", lucyRaw, StringComparison.Ordinal);
        Assert.DoesNotContain(humanNpcId.ToString(), lucyRaw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(linkId.ToString(), lucyRaw, StringComparison.OrdinalIgnoreCase);
        var reveal = (await JsonAsync(await GetActiveAsync(table, table.LucyOid))).GetProperty("reveals")[0];
        Assert.Equal(("NonPlayerEntity", JsonValueKind.Null), (reveal.GetProperty("subjectType").GetString(), reveal.GetProperty("handoutKind").ValueKind));
    }

    [Fact]
    public async Task Given_a_Player_or_a_stranger_When_revealing_Then_it_is_404_and_nothing_is_recorded()
    {
        var table = await TableAsync("5");
        var handoutId = await AddTextHandoutAsync(table, table.CorbittHouse, "The cellar door");

        var asPlayer = await RevealAsync(table, new { subject = Subject("Handout", handoutId) }, table.HarveyOid);
        var asStranger = await RevealAsync(table, new { subject = Subject("Handout", handoutId) }, table.StrangerOid);

        Assert.Equal((HttpStatusCode.NotFound, HttpStatusCode.NotFound), (asPlayer.StatusCode, asStranger.StatusCode));
        Assert.Equal(0, await RevealRowsAsync());
    }

    [Fact]
    public async Task Given_no_Active_Scene_When_revealing_Then_it_is_409_even_for_an_unknown_subject_type()
    {
        var table = await TableAsync("6", start: false);

        var valid = await RevealAsync(table, new { subject = Subject("Handout", Guid.NewGuid()) });
        var unknownType = await RevealAsync(table, new { subject = Subject("Banana", Guid.NewGuid()) });
        var missingSubject = await RevealAsync(table, new { investigatorIds = new[] { table.HarveyId } });

        Assert.All([valid, unknownType, missingSubject], response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        Assert.Equal("No Scene is Active.", (await JsonAsync(valid)).GetProperty("title").GetString());
    }

    [Fact]
    public async Task Given_a_finished_Scene_When_revealing_Then_it_is_409()
    {
        var table = await TableAsync("7");
        var handoutId = await AddTextHandoutAsync(table, table.CorbittHouse, "The cellar door");
        await FinishAsync(table);

        Assert.Equal(HttpStatusCode.Conflict, (await RevealHandoutAsync(table, handoutId)).StatusCode);
    }

    [Fact]
    public async Task Given_a_bad_subject_type_When_revealing_Then_it_is_a_400_at_subject_type_and_an_unknown_Item_is_not_found()
    {
        var table = await TableAsync("8");

        var missing = await RevealAsync(table, new { investigatorIds = new[] { table.HarveyId } });
        var unknown = await RevealAsync(table, new { subject = Subject("Banana", Guid.NewGuid()) });

        Assert.All([missing, unknown], response => Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode));
        Assert.All([await JsonAsync(missing), await JsonAsync(unknown)], problem => Assert.Equal(["subject.type"], Errors(problem)));
        Assert.Equal("Choose a Handout, a Non-Player Entity, or an Item to reveal.", (await JsonAsync(unknown)).GetProperty("errors").GetProperty("subject.type")[0].GetString());

        var unlinkedItem = await RevealAsync(table, new { subject = Subject("Item", Guid.NewGuid()) });

        Assert.Equal(HttpStatusCode.BadRequest, unlinkedItem.StatusCode);
        Assert.Equal(["subject.id"], Errors(await JsonAsync(unlinkedItem)));
        Assert.Equal(0, await RevealRowsAsync());
    }

    [Fact]
    public async Task Given_a_subject_that_cannot_be_revealed_When_revealing_Then_it_is_a_400_at_subject_id()
    {
        var table = await TableAsync("9");
        var keeperFacing = await AddTextHandoutAsync(table, table.CorbittHouse, "Keeper only", "KeeperFacing");
        var otherSceneHandout = await AddTextHandoutAsync(table, table.MeetingKnott, "Other scene");

        var keeperFacingResponse = await RevealHandoutAsync(table, keeperFacing);
        var unknown = await RevealHandoutAsync(table, Guid.NewGuid());
        var otherScene = await RevealHandoutAsync(table, otherSceneHandout);
        var asNonPlayerEntity = await RevealAsync(table, new { subject = Subject("NonPlayerEntity", keeperFacing) });

        Assert.All([keeperFacingResponse, unknown, otherScene, asNonPlayerEntity], response => Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode));
        Assert.Equal(["subject.id"], Errors(await JsonAsync(keeperFacingResponse)));
        Assert.Equal("This Handout is Keeper-facing and can't be revealed.", (await JsonAsync(keeperFacingResponse)).GetProperty("errors").GetProperty("subject.id")[0].GetString());
        Assert.All([await JsonAsync(unknown), await JsonAsync(otherScene), await JsonAsync(asNonPlayerEntity)], problem => Assert.Equal(["subject.id"], Errors(problem)));
        Assert.Equal(0, await RevealRowsAsync());
    }

    [Fact]
    public async Task Given_bad_recipients_When_revealing_Then_each_is_a_400_at_investigatorIds_and_the_subject_is_checked_first()
    {
        var table = await TableAsync("10");
        var handoutId = await AddTextHandoutAsync(table, table.CorbittHouse, "The cellar door");
        var keeperFacing = await AddTextHandoutAsync(table, table.CorbittHouse, "Keeper only", "KeeperFacing");
        await ChangePresentAsync(table, table.HarveyId);

        var empty = await RevealHandoutAsync(table, handoutId, []);
        var duplicate = await RevealHandoutAsync(table, handoutId, [table.HarveyId, table.HarveyId]);
        var notPresent = await RevealHandoutAsync(table, handoutId, [table.HarveyId, table.LucyId]);
        var unknown = await RevealHandoutAsync(table, handoutId, [Guid.NewGuid()]);
        var subjectFirst = await RevealHandoutAsync(table, keeperFacing, []);

        foreach (var response in new[] { empty, duplicate, notPresent, unknown })
        {
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal(["investigatorIds"], Errors(await JsonAsync(response)));
        }

        Assert.Equal(["subject.id"], Errors(await JsonAsync(subjectFirst)));
        Assert.Equal(0, await RevealRowsAsync());
    }

    [Fact]
    public async Task Given_a_revealed_map_When_a_recipient_downloads_it_Then_it_is_an_attachment_with_the_stored_type_and_everyone_else_gets_404()
    {
        var table = await TableAsync("11");
        var handoutId = await AddMapHandoutAsync(table, table.CorbittHouse);
        var reveal = await JsonAsync(await RevealHandoutAsync(table, handoutId, [table.HarveyId]));
        var revealId = reveal.GetProperty("revealId").GetGuid();
        var uri = CampaignUri(table, $"/reveals/{revealId}/file");

        var harvey = await table.Client.SendAsync(BuildRequest(HttpMethod.Get, uri, table.HarveyOid));
        var keeper = await table.Client.SendAsync(BuildRequest(HttpMethod.Get, uri, table.KeeperOid));
        var lucy = await table.Client.SendAsync(BuildRequest(HttpMethod.Get, uri, table.LucyOid));
        var stranger = await table.Client.SendAsync(BuildRequest(HttpMethod.Get, uri, table.StrangerOid));
        var anonymous = await table.Client.SendAsync(new HttpRequestMessage(HttpMethod.Get, uri) { Headers = { { "X-Test-Unauthenticated", "true" } } });
        var unknownReveal = await table.Client.SendAsync(BuildRequest(HttpMethod.Get, CampaignUri(table, $"/reveals/{Guid.NewGuid()}/file"), table.HarveyOid));

        Assert.Equal(HttpStatusCode.OK, harvey.StatusCode);
        Assert.Equal(ScenarioPreparation.Tests.HandoutFileSamples.Png(), await harvey.Content.ReadAsByteArrayAsync());
        Assert.Equal("image/png", harvey.Content.Headers.ContentType!.MediaType);
        Assert.Equal("attachment", harvey.Content.Headers.ContentDisposition!.DispositionType);
        Assert.Equal("nosniff", harvey.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.True(harvey.Headers.CacheControl!.NoStore && harvey.Headers.CacheControl.Private);
        Assert.Equal(HttpStatusCode.OK, keeper.StatusCode);
        Assert.Equal((HttpStatusCode.NotFound, HttpStatusCode.NotFound, HttpStatusCode.NotFound), (lucy.StatusCode, stranger.StatusCode, unknownReveal.StatusCode));
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        Assert.Equal(("Corbitt House cellar", "A plan of the cellar", "image/png"), (reveal.GetProperty("title").GetString(), reveal.GetProperty("imageDescription").GetString(), reveal.GetProperty("file").GetProperty("mediaType").GetString()));
        Assert.False(reveal.GetProperty("file").TryGetProperty("key", out _));
    }

    [Fact]
    public async Task Given_a_revealed_text_handout_When_downloading_its_file_Then_it_is_404()
    {
        var table = await TableAsync("12");
        var handoutId = await AddTextHandoutAsync(table, table.CorbittHouse, "The cellar door");
        var revealId = (await JsonAsync(await RevealHandoutAsync(table, handoutId))).GetProperty("revealId").GetGuid();

        var response = await table.Client.SendAsync(BuildRequest(HttpMethod.Get, CampaignUri(table, $"/reveals/{revealId}/file"), table.KeeperOid));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_revealed_file_whose_blob_is_missing_When_downloading_Then_it_is_503()
    {
        var table = await TableAsync("13");
        var handoutId = await AddMapHandoutAsync(table, table.CorbittHouse);
        var revealId = (await JsonAsync(await RevealHandoutAsync(table, handoutId))).GetProperty("revealId").GetGuid();
        foreach (var blob in StoredBlobs())
        {
            File.Delete(Path.Combine(_factory.HandoutFilesDirectory, blob));
        }

        var response = await table.Client.SendAsync(BuildRequest(HttpMethod.Get, CampaignUri(table, $"/reveals/{revealId}/file"), table.HarveyOid));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_revealed_handout_When_it_is_edited_replaced_unlinked_or_its_profile_deletion_is_refused_Then_the_Players_snapshot_is_unchanged()
    {
        var table = await TableAsync("14");
        var mapId = await AddMapHandoutAsync(table, table.CorbittHouse);
        var humanNpcId = await CreateAsync(table.Client, CampaignUri(table, "/human-npcs"), table.KeeperOid, new { name = "Walter Corbitt", age = 62 });
        var linkId = await CreateAsync(table.Client, SceneUri(table, table.CorbittHouse, "/non-player-entity-links"), table.KeeperOid, new
        {
            nonPlayerEntity = new { type = "HumanNpc", id = humanNpcId },
            playerFacingName = "A nervous clerk",
            playerFacingDescription = PreparedScenarioSeed.Json(Rich("He keeps looking at the door")),
        });
        var mapRevealId = (await JsonAsync(await RevealHandoutAsync(table, mapId, [table.HarveyId]))).GetProperty("revealId").GetGuid();
        await RevealAsync(table, new { subject = Subject("NonPlayerEntity", linkId), investigatorIds = new[] { table.HarveyId } });
        var before = await (await GetActiveAsync(table, table.HarveyOid)).Content.ReadAsStringAsync();
        var deleteProfile = await table.Client.SendAsync(BuildRequest(HttpMethod.Delete, CampaignUri(table, $"/human-npcs/{humanNpcId}"), table.KeeperOid));
        var edit = BuildRequest(HttpMethod.Put, SceneUri(table, table.CorbittHouse, $"/handouts/{mapId}"), table.KeeperOid);
        edit.Content = MapContent("Renamed", ScenarioPreparation.Tests.HandoutFileSamples.Gif(), "Another description", visibility: "KeeperFacing");

        var editResponse = await table.Client.SendAsync(edit);
        var editLink = await table.Client.SendAsync(BuildRequest(HttpMethod.Put, SceneUri(table, table.CorbittHouse, $"/non-player-entity-links/{linkId}"), table.KeeperOid, new { playerFacingName = "Someone else", playerFacingDescription = (object?)null }));
        var unlink = await table.Client.SendAsync(BuildRequest(HttpMethod.Delete, SceneUri(table, table.CorbittHouse, $"/non-player-entity-links/{linkId}"), table.KeeperOid));

        Assert.Equal(HttpStatusCode.OK, editResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, editLink.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, unlink.StatusCode);
        Assert.Equal(before, await (await GetActiveAsync(table, table.HarveyOid)).Content.ReadAsStringAsync());
        var file = await table.Client.SendAsync(BuildRequest(HttpMethod.Get, CampaignUri(table, $"/reveals/{mapRevealId}/file"), table.HarveyOid));
        Assert.Equal(ScenarioPreparation.Tests.HandoutFileSamples.Png(), await file.Content.ReadAsByteArrayAsync());
        Assert.Equal(2, StoredBlobs().Length);
        Assert.Equal(HttpStatusCode.Conflict, deleteProfile.StatusCode);
        Assert.Equal(2, await RevealRowsAsync());
    }

    [Fact]
    public async Task Given_reveals_on_a_finished_Scene_and_the_Active_Scene_When_a_Player_reads_Clues_Then_both_are_listed_newest_first_with_their_Scene()
    {
        var table = await TableAsync("15");
        var first = await AddTextHandoutAsync(table, table.CorbittHouse, "First clue");
        await RevealHandoutAsync(table, first, [table.HarveyId]);
        await FinishAsync(table);
        Assert.Equal(HttpStatusCode.OK, (await StartAsync(table, table.MeetingKnott, [table.HarveyId, table.LucyId])).StatusCode);
        var second = await AddTextHandoutAsync(table, table.MeetingKnott, "Second clue");
        var forLucy = await AddTextHandoutAsync(table, table.MeetingKnott, "Lucy only");
        await RevealHandoutAsync(table, second, [table.HarveyId]);
        await RevealHandoutAsync(table, forLucy, [table.LucyId]);

        var clues = await JsonAsync(await CluesAsync(table, table.HarveyOid));

        Assert.Equal("Harvey Walters", clues.GetProperty("investigatorName").GetString());
        Assert.Equal(["Second clue", "First clue"], Titles(clues.GetProperty("clues")));
        Assert.Equal(["Meeting Knott", "The Corbitt House"], clues.GetProperty("clues").EnumerateArray().Select(clue => clue.GetProperty("scene").GetProperty("title").GetString()!).ToArray());
        var raw = clues.GetRawText();
        Assert.DoesNotContain("Lucy only", raw, StringComparison.Ordinal);
        Assert.DoesNotContain(table.LucyId.ToString(), raw, StringComparison.OrdinalIgnoreCase);
        Assert.False(clues.GetProperty("clues")[0].TryGetProperty("subjectId", out _));
        Assert.False(clues.GetProperty("clues")[0].TryGetProperty("recipients", out _));
    }

    [Fact]
    public async Task Given_an_Investigator_removed_from_the_present_list_When_reading_Then_the_Active_Scene_is_not_present_but_the_Clues_remain()
    {
        var table = await TableAsync("16");
        var handoutId = await AddTextHandoutAsync(table, table.CorbittHouse, "The cellar door");
        await RevealHandoutAsync(table, handoutId, [table.HarveyId]);
        await ChangePresentAsync(table, table.LucyId);

        var active = await JsonAsync(await GetActiveAsync(table, table.HarveyOid));
        var clues = await JsonAsync(await CluesAsync(table, table.HarveyOid));

        Assert.Equal(["isPresent", "title"], active.EnumerateObject().Select(property => property.Name).Order().ToArray());
        Assert.False(active.GetProperty("isPresent").GetBoolean());
        Assert.Equal(["The cellar door"], Titles(clues.GetProperty("clues")));
    }

    [Fact]
    public async Task Given_an_Investigator_added_later_When_reading_Then_earlier_reveals_are_not_theirs()
    {
        var table = await TableAsync("17", start: false);
        Assert.Equal(HttpStatusCode.OK, (await StartAsync(table, table.CorbittHouse, [table.HarveyId])).StatusCode);
        var handoutId = await AddTextHandoutAsync(table, table.CorbittHouse, "Before Lucy");
        await RevealHandoutAsync(table, handoutId);

        await ChangePresentAsync(table, table.HarveyId, table.LucyId);

        var lucy = await JsonAsync(await GetActiveAsync(table, table.LucyOid));
        Assert.Equal(0, lucy.GetProperty("reveals").GetArrayLength());
        Assert.Equal(0, (await JsonAsync(await CluesAsync(table, table.LucyOid))).GetProperty("clues").GetArrayLength());
    }

    [Fact]
    public async Task Given_the_Keeper_When_reading_an_Investigators_Clues_Then_they_are_listed_and_unknown_or_unauthorized_callers_get_404()
    {
        var table = await TableAsync("18");
        var handoutId = await AddTextHandoutAsync(table, table.CorbittHouse, "The cellar door");
        await RevealHandoutAsync(table, handoutId, [table.LucyId]);

        var keeper = await CluesAsync(table, table.KeeperOid, table.LucyId.ToString());
        var keeperOnHarvey = await CluesAsync(table, table.KeeperOid, table.HarveyId.ToString());
        var unknown = await CluesAsync(table, table.KeeperOid, Guid.NewGuid().ToString());
        var keeperMine = await CluesAsync(table, table.KeeperOid, "mine");
        var playerOnOther = await CluesAsync(table, table.HarveyOid, table.LucyId.ToString());
        var stranger = await CluesAsync(table, table.StrangerOid, "mine");

        Assert.Equal(["The cellar door"], Titles((await JsonAsync(keeper)).GetProperty("clues")));
        Assert.Equal(0, (await JsonAsync(keeperOnHarvey)).GetProperty("clues").GetArrayLength());
        Assert.All([unknown, keeperMine, playerOnOther, stranger], response => Assert.Equal(HttpStatusCode.NotFound, response.StatusCode));
    }

    [Fact]
    public async Task Given_connected_members_When_the_Keeper_reveals_Then_only_the_Keeper_and_the_targeted_Player_are_signalled_and_nobody_hears_activeScene()
    {
        var table = await TableAsync("19");
        var first = await AddTextHandoutAsync(table, table.CorbittHouse, "For Harvey");
        var sentinel = await AddTextHandoutAsync(table, table.CorbittHouse, "For everyone");
        var (keeperHub, _) = await CampaignHubTestClient.SubscribeAsync(_factory, table.KeeperOid, table.CampaignId);
        var (harveyHub, _) = await CampaignHubTestClient.SubscribeAsync(_factory, table.HarveyOid, table.CampaignId);
        var (lucyHub, _) = await CampaignHubTestClient.SubscribeAsync(_factory, table.LucyOid, table.CampaignId);
        await using var _1 = keeperHub;
        await using var _2 = harveyHub;
        await using var _3 = lucyHub;

        await RevealHandoutAsync(table, first, [table.HarveyId]);
        await RevealHandoutAsync(table, sentinel);
        await ChangePresentAsync(table, table.HarveyId, table.LucyId);

        Assert.Equal("myClues|myClues", await TopicsUntilActiveSceneAsync(harveyHub, table.CampaignId));
        Assert.Equal("myClues", await TopicsUntilActiveSceneAsync(lucyHub, table.CampaignId));
        Assert.Equal("sceneReveals|sceneReveals", await TopicsUntilActiveSceneAsync(keeperHub, table.CampaignId));
    }

    [Fact]
    public async Task Given_a_give_wins_the_race_When_revealing_an_Item_Then_it_is_409_and_nothing_is_revealed()
    {
        var table = await TableAsync("20");

        for (var attempt = 0; attempt < 20; attempt++)
        {
            var itemId = (await CreateItemAsync(table.Client, table.CampaignId, table.KeeperOid, $"Race diary {attempt}")).GetProperty("id").GetGuid();
            await LinkItemAsync(table.Client, (table.CampaignId, table.ScenarioId, table.CorbittHouse), table.KeeperOid, itemId);
            var before = await RevealRowsAsync();
            var reveal = RevealAsync(table, new { subject = Subject("Item", itemId) });
            var give = table.Client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{table.CampaignId}/items/{itemId}/give", table.KeeperOid, new { investigatorId = table.HarveyId }));
            var responses = await Task.WhenAll(reveal, give);
            Assert.DoesNotContain(HttpStatusCode.InternalServerError, responses.Select(response => response.StatusCode));
            if (responses[0].StatusCode == HttpStatusCode.Conflict)
            {
                Assert.Equal("Another change won the race. Fetch again and try again.", (await JsonAsync(responses[0])).GetProperty("title").GetString());
                // The +1 is the winning give's own reveal; the refused reveal added nothing.
                Assert.Equal(before + 1, await RevealRowsAsync());
                return;
            }
        }

        Assert.Fail("The give never beat the Item reveal to the write in 20 races.");
    }

    [Fact]
    public async Task Given_a_give_wins_the_race_When_revealing_an_Item_Handout_Then_it_is_409_and_nothing_is_revealed()
    {
        var table = await TableAsync("21");

        for (var attempt = 0; attempt < 20; attempt++)
        {
            var itemId = (await CreateItemAsync(table.Client, table.CampaignId, table.KeeperOid, $"Race diary {attempt}")).GetProperty("id").GetGuid();
            var handoutId = await AddItemHandoutAsync(table, itemId, $"Race entry {attempt}");
            await LinkItemAsync(table.Client, (table.CampaignId, table.ScenarioId, table.CorbittHouse), table.KeeperOid, itemId);
            var before = await RevealRowsAsync();
            var reveal = RevealAsync(table, new { subject = Subject("Handout", handoutId) });
            var give = table.Client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{table.CampaignId}/items/{itemId}/give", table.KeeperOid, new { investigatorId = table.LucyId }));
            var responses = await Task.WhenAll(reveal, give);
            Assert.DoesNotContain(HttpStatusCode.InternalServerError, responses.Select(response => response.StatusCode));
            if (responses[0].StatusCode == HttpStatusCode.Conflict)
            {
                Assert.Equal("Another change won the race. Fetch again and try again.", (await JsonAsync(responses[0])).GetProperty("title").GetString());
                // The +1 is the winning give's own reveal; the refused reveal added nothing.
                Assert.Equal(before + 1, await RevealRowsAsync());
                return;
            }
        }

        Assert.Fail("The give never beat the Item Handout reveal to the write in 20 races.");
    }

    private static async Task<Guid> AddItemHandoutAsync(Table table, Guid itemId, string title)
    {
        var response = await table.Client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{table.CampaignId}/items/{itemId}/handouts", table.KeeperOid, new { kind = "Text", visibility = "PlayerFacing", title, content = PreparedScenarioSeed.Json(Rich("The last entry")) }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await JsonAsync(response)).GetProperty("id").GetGuid();
    }

    // The activeScene and sceneHistory signals are sent after the reveals and in order on every connection, so everything
    // a client heard before them is what the reveals sent.
    private static async Task<string> TopicsUntilActiveSceneAsync(CampaignHubTestClient client, Guid campaignId)
    {
        var before = new List<string>();
        while (true)
        {
            if (await client.NextMessageAsync() is CampaignDataChangedMessage message && message.CampaignId == campaignId)
            {
                var topics = message.Topics.ToArray();
                if (topics.SequenceEqual(["activeScene", "sceneHistory"]))
                {
                    return string.Join('|', before);
                }

                before.Add(string.Join(',', topics));
            }
        }
    }
}
