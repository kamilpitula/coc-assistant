namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Image, Document, and Map Handout API (specs/scenario-preparation/spec.md, Handout API and File storage): multipart create
/// and edit, the Keeper-only file download, and the 400, 404, 409, and 413 contracts (ADR 0013, ADR 0016, ADR 0018, ADR 0021).
/// Files go to a per-factory temporary directory; a Player, another Campaign's Keeper, and foreign ids all get an identical 404.
/// </summary>
public class HandoutFileApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private const string Text =
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The door creaks open\"}]}]}}";

    private const long MaxBytes = 20 * 1024 * 1024;

    private readonly IdentityApiFactory _factory;

    public HandoutFileApiTests(IdentityApiFactory factory) => _factory = factory;

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

    private static readonly byte[] Pdf = "%PDF-1.4\n1 0 obj\n<< >>\nendobj\n%%EOF\n"u8.ToArray();

    private static readonly byte[] Svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"u8.ToArray();

    private static byte[] Padded(byte[] start, long length)
    {
        var bytes = new byte[length];
        start.CopyTo(bytes, 0);
        return bytes;
    }

    private static string HandoutsUri((Guid CampaignId, Guid ScenarioId, Guid SceneId) scene, string suffix = "") =>
        $"/api/campaigns/{scene.CampaignId}/scenarios/{scene.ScenarioId}/scenes/{scene.SceneId}/handouts{suffix}";

    private static async Task<JsonElement> BodyAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();

    private static string[] PropertyNames(JsonElement element) => element.EnumerateObject().Select(property => property.Name).ToArray();

    private static HttpRequestMessage Multipart(
        HttpMethod method,
        string uri,
        string oid,
        string? kind = "Image",
        string? visibility = "PlayerFacing",
        string? title = "Floor plan",
        byte[]? file = null,
        string fileName = "plan.png",
        string fileContentType = "image/png")
    {
        var content = new MultipartFormDataContent();
        AddField(content, "kind", kind);
        AddField(content, "visibility", visibility);
        AddField(content, "title", title);
        if (file is not null)
        {
            var part = new ByteArrayContent(file);
            part.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(fileContentType);
            content.Add(part, "file", fileName);
        }

        var request = BuildRequest(method, uri, oid);
        request.Content = content;
        return request;
    }

    private static void AddField(MultipartFormDataContent content, string name, string? value)
    {
        if (value is not null)
        {
            content.Add(new StringContent(value), name);
        }
    }

    private static async Task<(Guid CampaignId, Guid ScenarioId, Guid SceneId)> SceneAsync(HttpClient client, string oid)
    {
        var campaignId = (await CreateCampaignAsync(client, oid)).Id;
        var scenario = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/scenarios", oid, new { title = "The Haunting" }));
        var scenarioId = (await BodyAsync(scenario)).GetProperty("id").GetGuid();
        var scene = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes", oid, new { title = "The Corbitt House" }));
        Assert.Equal(HttpStatusCode.Created, scene.StatusCode);
        return (campaignId, scenarioId, (await BodyAsync(scene)).GetProperty("id").GetGuid());
    }

    private static async Task<JsonElement> AddImageAsync(HttpClient client, (Guid CampaignId, Guid ScenarioId, Guid SceneId) scene, string oid, string kind = "Image", string title = "Floor plan", byte[]? file = null, string fileName = "plan.png")
    {
        var response = await client.SendAsync(Multipart(HttpMethod.Post, HandoutsUri(scene), oid, kind: kind, title: title, file: file ?? Png, fileName: fileName));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await BodyAsync(response);
    }

    private static async Task<JsonElement> GetSceneAsync(HttpClient client, (Guid CampaignId, Guid ScenarioId, Guid SceneId) scene, string oid)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{scene.CampaignId}/scenarios/{scene.ScenarioId}/scenes/{scene.SceneId}", oid));
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

    // Problem details carry a per-request traceId; everything else must match.
    private static async Task<string> WithoutTraceIdAsync(HttpResponseMessage response) =>
        System.Text.RegularExpressions.Regex.Replace(await response.Content.ReadAsStringAsync(), "\"traceId\":\"[^\"]*\"", string.Empty);

    private string[] StoredBlobs() =>
        Directory.Exists(_factory.HandoutFilesDirectory) ? Directory.GetFiles(_factory.HandoutFilesDirectory).Select(Path.GetFileName).OfType<string>().ToArray() : [];

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

    [Fact]
    public async Task Given_a_keeper_When_adding_a_map_with_a_png_Then_it_is_201_with_the_file_details_listed_as_a_summary_and_stored()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-1");

        var response = await client.SendAsync(Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-1", kind: "Map", title: "  Arkham ", file: Png, fileName: "C:\\maps\\arkham.png", fileContentType: "text/html"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await BodyAsync(response);
        Assert.Equal(["id", "kind", "visibility", "title", "content", "file"], PropertyNames(body));
        Assert.Equal(("Map", "PlayerFacing", "Arkham"), (body.GetProperty("kind").GetString(), body.GetProperty("visibility").GetString(), body.GetProperty("title").GetString()));
        Assert.Equal(JsonValueKind.Null, body.GetProperty("content").ValueKind);
        var file = body.GetProperty("file");
        Assert.Equal(["name", "mediaType", "sizeBytes"], PropertyNames(file));
        Assert.Equal(("arkham.png", "image/png", (long)Png.Length), (file.GetProperty("name").GetString(), file.GetProperty("mediaType").GetString(), file.GetProperty("sizeBytes").GetInt64()));
        var summary = (await GetSceneAsync(client, scene, "file-keeper-1")).GetProperty("handouts").EnumerateArray().Single();
        Assert.Equal(["id", "kind", "visibility", "title"], PropertyNames(summary));
        Assert.Equal("Map", summary.GetProperty("kind").GetString());
        Assert.Single(StoredBlobs());
    }

    [Fact]
    public async Task Given_an_image_handout_When_getting_the_handout_Then_it_has_the_file_and_null_content()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-2");
        var created = await AddImageAsync(client, scene, "file-keeper-2");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(scene, $"/{created.GetProperty("id").GetGuid()}"), "file-keeper-2"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(created.GetRawText(), (await BodyAsync(response)).GetRawText());
    }

    [Fact]
    public async Task Given_an_image_handout_When_downloading_its_file_Then_the_same_bytes_come_back_with_the_safe_headers()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-3");
        var created = await AddImageAsync(client, scene, "file-keeper-3", fileName: "Plan of the cellar.png");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(scene, $"/{created.GetProperty("id").GetGuid()}/file"), "file-keeper-3"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(Png, await response.Content.ReadAsByteArrayAsync());
        Assert.Equal("image/png", response.Content.Headers.ContentType!.MediaType);
        Assert.Equal("attachment", response.Content.Headers.ContentDisposition!.DispositionType);
        Assert.Equal("Plan of the cellar.png", response.Content.Headers.ContentDisposition.FileName?.Trim('"'));
        Assert.Equal("nosniff", Assert.Single(response.Headers.GetValues("X-Content-Type-Options")));
        Assert.True(response.Headers.CacheControl!.Private);
        Assert.True(response.Headers.CacheControl.NoStore);
    }

    [Fact]
    public async Task Given_a_non_ascii_file_name_When_downloading_Then_the_disposition_carries_an_encoded_filename()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-4");
        var created = await AddImageAsync(client, scene, "file-keeper-4", fileName: "Zo\u00eb.png");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(scene, $"/{created.GetProperty("id").GetGuid()}/file"), "file-keeper-4"));

        Assert.Equal("Zo\u00eb.png", response.Content.Headers.ContentDisposition!.FileNameStar);
    }

    [Fact]
    public async Task Given_a_pdf_document_When_adding_and_downloading_Then_it_is_served_as_application_pdf()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-5");

        var response = await client.SendAsync(Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-5", kind: "Document", title: "Letter", file: Pdf, fileName: "letter.pdf"));
        var created = await BodyAsync(response);
        var download = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(scene, $"/{created.GetProperty("id").GetGuid()}/file"), "file-keeper-5"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("application/pdf", created.GetProperty("file").GetProperty("mediaType").GetString());
        Assert.Equal(Pdf, await download.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Given_a_rich_text_handout_When_downloading_its_file_Then_it_is_404()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-6");
        var text = await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(scene), "file-keeper-6", new { kind = "Text", visibility = "KeeperFacing", title = "Notes", content = JsonDocument.Parse(Text).RootElement }));
        var id = (await BodyAsync(text)).GetProperty("id").GetGuid();

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(scene, $"/{id}/file"), "file-keeper-6"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_file_handout_among_others_When_replacing_the_file_Then_the_position_is_kept_the_old_blob_is_deleted_and_the_new_bytes_are_served()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-7");
        await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(scene), "file-keeper-7", new { kind = "Text", visibility = "KeeperFacing", title = "Notes", content = JsonDocument.Parse(Text).RootElement }));
        var image = await AddImageAsync(client, scene, "file-keeper-7");
        var jpeg = Padded([0xFF, 0xD8, 0xFF, 0xE0], 64);
        var id = image.GetProperty("id").GetGuid();

        var edited = await client.SendAsync(Multipart(HttpMethod.Put, HandoutsUri(scene, $"/{id}"), "file-keeper-7", kind: "Map", visibility: "KeeperFacing", title: "Renamed", file: jpeg, fileName: "new.jpg"));

        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        var body = await BodyAsync(edited);
        Assert.Equal(("Map", "KeeperFacing", "Renamed", "image/jpeg", 64L), (body.GetProperty("kind").GetString(), body.GetProperty("visibility").GetString(), body.GetProperty("title").GetString(), body.GetProperty("file").GetProperty("mediaType").GetString(), body.GetProperty("file").GetProperty("sizeBytes").GetInt64()));
        var handouts = (await GetSceneAsync(client, scene, "file-keeper-7")).GetProperty("handouts").EnumerateArray().ToList();
        Assert.Equal(id, handouts[1].GetProperty("id").GetGuid());
        Assert.Single(StoredBlobs());
        var download = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(scene, $"/{id}/file"), "file-keeper-7"));
        Assert.Equal(jpeg, await download.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Given_an_image_handout_When_editing_without_a_file_Then_the_file_is_kept()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-8");
        var image = await AddImageAsync(client, scene, "file-keeper-8");
        var id = image.GetProperty("id").GetGuid();

        var edited = await client.SendAsync(Multipart(HttpMethod.Put, HandoutsUri(scene, $"/{id}"), "file-keeper-8", kind: "Map", title: "Arkham"));

        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        var body = await BodyAsync(edited);
        Assert.Equal(("Map", "Arkham"), (body.GetProperty("kind").GetString(), body.GetProperty("title").GetString()));
        Assert.Equal(image.GetProperty("file").GetRawText(), body.GetProperty("file").GetRawText());
        Assert.Single(StoredBlobs());
    }

    [Fact]
    public async Task Given_every_invalid_field_When_adding_a_file_handout_Then_each_is_a_400_with_its_key_and_message_and_nothing_is_stored()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-9");
        var cases = new (HttpRequestMessage Request, string Key, string Message)[]
        {
            (Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-9", title: "  ", file: Png), "title", "Enter a title."),
            (Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-9", title: new string('a', 201), file: Png), "title", "Title must be 200 characters or fewer."),
            (Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-9", kind: null, file: Png), "kind", "Choose Image, Document, or Map."),
            (Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-9", kind: "Text", file: Png), "kind", "Choose Image, Document, or Map."),
            (Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-9", kind: "image", file: Png), "kind", "Choose Image, Document, or Map."),
            (Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-9", visibility: null, file: Png), "visibility", "Choose who can see this Handout."),
            (Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-9"), "file", "Choose an image."),
            (Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-9", kind: "Map", file: []), "file", "Choose an image."),
            (Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-9", kind: "Document"), "file", "Choose a PDF."),
            (Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-9", file: Svg, fileName: "plan.png"), "file", "Choose a PNG, JPEG, WebP, or GIF image."),
            (Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-9", kind: "Map", file: Pdf, fileName: "plan.png"), "file", "Choose a PNG, JPEG, WebP, or GIF image."),
            (Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-9", kind: "Document", file: Png, fileName: "letter.pdf", fileContentType: "application/pdf"), "file", "This isn't a PDF. Choose a PDF."),
            (Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-9", file: Padded(Png, MaxBytes + 1)), "file", "The image is larger than 20 MB. Choose a smaller one."),
            (Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-9", kind: "Document", file: Padded(Pdf, MaxBytes + 1), fileName: "letter.pdf"), "file", "The PDF is larger than 20 MB. Choose a smaller one."),
        };

        foreach (var (request, key, message) in cases)
        {
            var problems = await ProblemsAsync(await client.SendAsync(request));

            Assert.Equal([key], problems.Keys);
            Assert.Equal([message], problems[key]);
        }

        Assert.Empty((await GetSceneAsync(client, scene, "file-keeper-9")).GetProperty("handouts").EnumerateArray());
        Assert.Empty(StoredBlobs());
    }

    [Fact]
    public async Task Given_a_file_of_exactly_20_MB_When_adding_Then_it_is_201()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-10");

        var response = await client.SendAsync(Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-10", file: Padded(Png, MaxBytes)));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_body_over_the_request_limit_When_adding_Then_it_is_413_and_nothing_is_stored()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-11");

        var response = await client.SendAsync(Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-11", file: Padded(Png, MaxBytes + 2 * 1024 * 1024)));

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
        Assert.Empty(StoredBlobs());
    }

    [Fact]
    public async Task Given_a_json_request_naming_a_file_kind_When_adding_or_editing_Then_it_is_a_400_on_kind_with_the_rich_text_message()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-12");
        var image = await AddImageAsync(client, scene, "file-keeper-12");
        var body = new { kind = "Image", visibility = "KeeperFacing", title = "T", content = JsonDocument.Parse(Text).RootElement };

        var created = await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(scene), "file-keeper-12", body)));
        var edited = await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Put, HandoutsUri(scene, $"/{image.GetProperty("id").GetGuid()}"), "file-keeper-12", body)));

        Assert.Equal(["Choose Read-aloud or Text."], created["kind"]);
        Assert.Equal(["Choose Read-aloud or Text."], edited["kind"]);
    }

    [Fact]
    public async Task Given_a_request_with_no_content_type_When_adding_or_editing_Then_the_json_actions_answer_415_not_an_ambiguous_match_500()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-24");
        var image = await AddImageAsync(client, scene, "file-keeper-24");
        var created = BuildRequest(HttpMethod.Post, HandoutsUri(scene), "file-keeper-24");
        var edited = BuildRequest(HttpMethod.Put, HandoutsUri(scene, $"/{image.GetProperty("id").GetGuid()}"), "file-keeper-24");

        var createdResponse = await client.SendAsync(created);
        var editedResponse = await client.SendAsync(edited);

        Assert.Null(created.Content);
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, createdResponse.StatusCode);
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, editedResponse.StatusCode);
        Assert.Single(StoredBlobs());
    }

    [Fact]
    public async Task Given_no_bearer_token_When_using_the_file_routes_Then_each_is_401_and_nothing_is_stored_or_read()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-25");
        var image = await AddImageAsync(client, scene, "file-keeper-25");
        var id = image.GetProperty("id").GetGuid();
        var blobsBefore = StoredBlobs();
        var requests = new[]
        {
            Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-25", file: Png),
            Multipart(HttpMethod.Put, HandoutsUri(scene, $"/{id}"), "file-keeper-25", file: Padded(Png, 100)),
            BuildRequest(HttpMethod.Get, HandoutsUri(scene, $"/{id}/file"), "file-keeper-25"),
        };

        foreach (var request in requests)
        {
            request.Headers.Add("X-Test-Unauthenticated", "true");
            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            Assert.Empty(await response.Content.ReadAsByteArrayAsync());
        }

        Assert.Equal(blobsBefore, StoredBlobs());
        Assert.Equal(1, (await GetSceneAsync(client, scene, "file-keeper-25")).GetProperty("handouts").GetArrayLength());
    }

    [Fact]
    public async Task Given_a_request_with_another_content_type_When_adding_Then_it_is_415()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-13");
        var request = BuildRequest(HttpMethod.Post, HandoutsUri(scene), "file-keeper-13");
        request.Content = new StringContent("kind=Image", System.Text.Encoding.UTF8, "text/plain");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_kind_change_across_families_When_editing_Then_it_is_a_400_on_kind_with_the_same_message_on_both_endpoints()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-14");
        var image = await AddImageAsync(client, scene, "file-keeper-14");
        var document = await client.SendAsync(Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-14", kind: "Document", title: "Letter", file: Pdf, fileName: "letter.pdf"));
        var text = await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(scene), "file-keeper-14", new { kind = "Text", visibility = "KeeperFacing", title = "Notes", content = JsonDocument.Parse(Text).RootElement }));
        const string message = "A Handout's kind can change only between Read-aloud and Text, or between Image and Map.";
        var imageUri = HandoutsUri(scene, $"/{image.GetProperty("id").GetGuid()}");
        var documentUri = HandoutsUri(scene, $"/{(await BodyAsync(document)).GetProperty("id").GetGuid()}");
        var textUri = HandoutsUri(scene, $"/{(await BodyAsync(text)).GetProperty("id").GetGuid()}");
        var jsonText = new { kind = "ReadAloud", visibility = "KeeperFacing", title = "T", content = JsonDocument.Parse(Text).RootElement };

        var problems = new[]
        {
            await ProblemsAsync(await client.SendAsync(Multipart(HttpMethod.Put, imageUri, "file-keeper-14", kind: "Document"))),
            await ProblemsAsync(await client.SendAsync(Multipart(HttpMethod.Put, documentUri, "file-keeper-14", kind: "Image"))),
            await ProblemsAsync(await client.SendAsync(Multipart(HttpMethod.Put, textUri, "file-keeper-14", kind: "Image", file: Png))),
            await ProblemsAsync(await client.SendAsync(BuildRequest(HttpMethod.Put, imageUri, "file-keeper-14", jsonText))),
        };

        Assert.All(problems, problem => Assert.Equal([message], problem["kind"]));
    }

    [Fact]
    public async Task Given_an_image_handout_When_changing_it_to_a_map_Then_it_is_200()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-15");
        var image = await AddImageAsync(client, scene, "file-keeper-15");

        var response = await client.SendAsync(Multipart(HttpMethod.Put, HandoutsUri(scene, $"/{image.GetProperty("id").GetGuid()}"), "file-keeper-15", kind: "Map"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_finished_scene_When_adding_or_editing_a_file_handout_Then_both_are_409_and_nothing_changes()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-16");
        var image = await AddImageAsync(client, scene, "file-keeper-16");
        await PlayAsync(scene.SceneId, SceneStatus.Finished);

        var created = await client.SendAsync(Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-16", file: Png));
        var edited = await client.SendAsync(Multipart(HttpMethod.Put, HandoutsUri(scene, $"/{image.GetProperty("id").GetGuid()}"), "file-keeper-16", file: Png));

        Assert.Equal(HttpStatusCode.Conflict, created.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, edited.StatusCode);
        Assert.Equal("A Finished Scene can't be changed.", (await BodyAsync(created)).GetProperty("title").GetString());
        Assert.Single(StoredBlobs());
    }

    [Fact]
    public async Task Given_an_active_scene_When_replacing_the_file_Then_both_blobs_are_kept_and_when_deleting_the_handout_it_is_409()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-17");
        var image = await AddImageAsync(client, scene, "file-keeper-17");
        var id = image.GetProperty("id").GetGuid();
        await PlayAsync(scene.SceneId, SceneStatus.Active);

        var edited = await client.SendAsync(Multipart(HttpMethod.Put, HandoutsUri(scene, $"/{id}"), "file-keeper-17", file: Padded(Png, 100)));
        var deleted = await client.SendAsync(BuildRequest(HttpMethod.Delete, HandoutsUri(scene, $"/{id}"), "file-keeper-17"));

        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, deleted.StatusCode);
        Assert.Equal(2, StoredBlobs().Length);
    }

    [Fact]
    public async Task Given_a_prepared_scene_When_deleting_a_file_handout_Then_it_is_204_and_the_blob_is_gone()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-18");
        var image = await AddImageAsync(client, scene, "file-keeper-18");

        var deleted = await client.SendAsync(BuildRequest(HttpMethod.Delete, HandoutsUri(scene, $"/{image.GetProperty("id").GetGuid()}"), "file-keeper-18"));

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Empty(StoredBlobs());
    }

    [Fact]
    public async Task Given_a_prepared_scene_with_file_handouts_When_removing_the_scene_Then_its_blobs_are_deleted()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-19");
        await AddImageAsync(client, scene, "file-keeper-19");
        await AddImageAsync(client, scene, "file-keeper-19", title: "Second");

        var removed = await client.SendAsync(BuildRequest(HttpMethod.Delete, $"/api/campaigns/{scene.CampaignId}/scenarios/{scene.ScenarioId}/scenes/{scene.SceneId}", "file-keeper-19"));

        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Empty(StoredBlobs());
    }

    [Fact]
    public async Task Given_a_player_another_keeper_and_foreign_ids_When_using_the_file_endpoints_Then_every_response_is_the_same_404_with_no_handout_data()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-20");
        await JoinAsPlayerAsync(client, scene.CampaignId, "file-keeper-20", "file-player-20");
        var image = await AddImageAsync(client, scene, "file-keeper-20", title: "Secret map");
        var id = image.GetProperty("id").GetGuid();
        var otherScene = await SceneAsync(client, "file-keeper-21");
        var unknown = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(scene, $"/{Guid.NewGuid()}/file"), "file-keeper-20"));

        var responses = new List<HttpResponseMessage>
        {
            await client.SendAsync(Multipart(HttpMethod.Post, HandoutsUri(scene), "file-player-20", file: Png)),
            await client.SendAsync(Multipart(HttpMethod.Put, HandoutsUri(scene, $"/{id}"), "file-player-20", file: Png)),
            await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(scene, $"/{id}/file"), "file-player-20")),
            await client.SendAsync(Multipart(HttpMethod.Post, HandoutsUri(scene), "file-keeper-21", file: Png)),
            await client.SendAsync(Multipart(HttpMethod.Put, HandoutsUri(scene, $"/{id}"), "file-keeper-21", file: Png)),
            await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(scene, $"/{id}/file"), "file-keeper-21")),
            await client.SendAsync(Multipart(HttpMethod.Put, HandoutsUri(scene with { SceneId = otherScene.SceneId }, $"/{id}"), "file-keeper-20", file: Png)),
            await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(scene with { ScenarioId = otherScene.ScenarioId }, $"/{id}/file"), "file-keeper-20")),
            unknown,
        };

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.NotFound, response.StatusCode));
        var bodies = await Task.WhenAll(responses.Select(WithoutTraceIdAsync));
        Assert.Single(bodies.Distinct());
        Assert.DoesNotContain("Secret map", bodies[0]);
        Assert.Single(StoredBlobs());
    }

    [Fact]
    public async Task Given_a_blob_that_is_missing_When_downloading_Then_it_is_503()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-22");
        var image = await AddImageAsync(client, scene, "file-keeper-22");
        foreach (var blob in Directory.GetFiles(_factory.HandoutFilesDirectory))
        {
            File.Delete(blob);
        }

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(scene, $"/{image.GetProperty("id").GetGuid()}/file"), "file-keeper-22"));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_scene_with_a_file_handout_When_reading_the_scene_Then_the_property_set_is_unchanged_and_carries_no_file_data()
    {
        var client = _factory.CreateClient();
        var scene = await SceneAsync(client, "file-keeper-23");
        await AddImageAsync(client, scene, "file-keeper-23");

        var loaded = await GetSceneAsync(client, scene, "file-keeper-23");

        Assert.Equal(
            ["finishedAt", "handouts", "id", "itemLinks", "keeperNotes", "location", "nonPlayerEntityLinks", "startedAt", "status", "title"],
            PropertyNames(loaded).Order());
        Assert.DoesNotContain("plan.png", loaded.GetRawText());
    }
}

/// <summary>A store that is down: the failure contract of a storage outage on create (PBI-SP-007 D5).</summary>
public class HandoutFileStoreOutageApiTests : IClassFixture<HandoutFileStoreOutageApiTests.OutageApiFactory>, IAsyncLifetime
{
    private readonly OutageApiFactory _factory;

    public HandoutFileStoreOutageApiTests(OutageApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Given_a_store_that_is_down_When_adding_a_file_handout_Then_it_is_503_with_the_storage_title_and_no_handout_is_added()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "outage-keeper")).Id;
        var scenario = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/scenarios", "outage-keeper", new { title = "The Haunting" }));
        var scenarioId = JsonDocument.Parse(await scenario.Content.ReadAsStringAsync()).RootElement.GetProperty("id").GetGuid();
        var sceneUri = $"/api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes";
        var sceneResponse = await client.SendAsync(BuildRequest(HttpMethod.Post, sceneUri, "outage-keeper", new { title = "The Corbitt House" }));
        var sceneId = JsonDocument.Parse(await sceneResponse.Content.ReadAsStringAsync()).RootElement.GetProperty("id").GetGuid();
        var content = new MultipartFormDataContent
        {
            { new StringContent("Image"), "kind" },
            { new StringContent("PlayerFacing"), "visibility" },
            { new StringContent("Floor plan"), "title" },
            { new ByteArrayContent(Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")), "file", "plan.png" },
        };
        var request = BuildRequest(HttpMethod.Post, $"{sceneUri}/{sceneId}/handouts", "outage-keeper");
        request.Content = content;

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("The image or PDF couldn't be stored. Try again.", JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("title").GetString());
        var scene = await client.SendAsync(BuildRequest(HttpMethod.Get, $"{sceneUri}/{sceneId}", "outage-keeper"));
        Assert.Equal(0, JsonDocument.Parse(await scene.Content.ReadAsStringAsync()).RootElement.GetProperty("handouts").GetArrayLength());
    }

    public sealed class OutageApiFactory : IdentityApiFactory
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IHandoutFileStore>();
                services.AddSingleton<IHandoutFileStore, UnavailableHandoutFileStore>();
            });
        }
    }

    private sealed class UnavailableHandoutFileStore : IHandoutFileStore
    {
        public Task SaveAsync(string key, Stream content, string mediaType, CancellationToken cancellationToken) =>
            throw new HandoutFileStoreException("The store is down.");

        public Task<Stream> OpenReadAsync(string key, CancellationToken cancellationToken) =>
            throw new HandoutFileStoreException("The store is down.");

        public Task DeleteAsync(string key, CancellationToken cancellationToken) =>
            throw new HandoutFileStoreException("The store is down.");
    }
}
