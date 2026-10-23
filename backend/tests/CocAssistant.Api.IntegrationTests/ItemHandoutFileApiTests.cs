namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Image, Document, and Map Handout API of an Item (specs/scenario-preparation/spec.md, Item API and File storage; PBI-SP-008 D3,
/// D5): multipart create and edit, the Keeper-only download, the 400 and 404 contracts, and what happens to stored files. While the
/// Item is in play a replaced file is kept and the Handout cannot be deleted; otherwise a replaced or deleted file is removed after
/// the commit (ADR 0021, ADR 0022).
/// </summary>
public class ItemHandoutFileApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public ItemHandoutFileApiTests(IdentityApiFactory factory) => _factory = factory;

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

    private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46];

    private string[] StoredBlobs() =>
        Directory.Exists(_factory.HandoutFilesDirectory) ? Directory.GetFiles(_factory.HandoutFilesDirectory).Select(Path.GetFileName).OfType<string>().ToArray() : [];

    private static string HandoutsUri(Guid campaignId, Guid itemId, string suffix = "") => ItemsUri(campaignId, $"/{itemId}/handouts{suffix}");

    private static HttpRequestMessage Multipart(
        HttpMethod method,
        string uri,
        string oid,
        string? kind = "Image",
        string? visibility = "PlayerFacing",
        string? title = "A photograph",
        byte[]? file = null,
        string fileName = "photo.png")
    {
        var content = new MultipartFormDataContent();
        AddField(content, "kind", kind);
        AddField(content, "visibility", visibility);
        AddField(content, "title", title);
        if (file is not null)
        {
            var part = new ByteArrayContent(file);
            part.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream");
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

    private async Task<(HttpClient Client, Guid CampaignId, Guid ItemId)> ItemAsync(string oid)
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, oid)).Id;
        var itemId = (await CreateItemAsync(client, campaignId, oid)).GetProperty("id").GetGuid();
        return (client, campaignId, itemId);
    }

    private static async Task<JsonElement> AddImageAsync(HttpClient client, Guid campaignId, Guid itemId, string oid)
    {
        var response = await client.SendAsync(Multipart(HttpMethod.Post, HandoutsUri(campaignId, itemId), oid, file: Png));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await BodyAsync(response);
    }

    [Fact]
    public async Task Given_a_keeper_When_adding_an_image_to_an_Item_Then_it_is_201_with_the_file_details_and_one_blob_is_stored()
    {
        var (client, campaignId, itemId) = await ItemAsync("ifile-keeper-1");

        var response = await client.SendAsync(Multipart(HttpMethod.Post, HandoutsUri(campaignId, itemId), "ifile-keeper-1", kind: "Map", title: "  Arkham ", file: Png, fileName: "C:\\maps\\arkham.png"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await BodyAsync(response);
        Assert.Equal(("Map", "Arkham", JsonValueKind.Null), (body.GetProperty("kind").GetString(), body.GetProperty("title").GetString(), body.GetProperty("content").ValueKind));
        var file = body.GetProperty("file");
        Assert.Equal(("arkham.png", "image/png", (long)Png.Length), (file.GetProperty("name").GetString(), file.GetProperty("mediaType").GetString(), file.GetProperty("sizeBytes").GetInt64()));
        Assert.Equal("Map", Assert.Single((await GetItemAsync(client, campaignId, itemId, "ifile-keeper-1")).GetProperty("handouts").EnumerateArray()).GetProperty("kind").GetString());
        Assert.Single(StoredBlobs());
    }

    [Fact]
    public async Task Given_an_image_and_a_pdf_Handout_When_downloading_their_files_Then_the_same_bytes_come_back_with_the_safe_headers()
    {
        var (client, campaignId, itemId) = await ItemAsync("ifile-keeper-2");
        var image = await AddImageAsync(client, campaignId, itemId, "ifile-keeper-2");
        var document = await BodyAsync(await client.SendAsync(Multipart(HttpMethod.Post, HandoutsUri(campaignId, itemId), "ifile-keeper-2", kind: "Document", title: "Letter", file: Pdf, fileName: "letter.pdf")));

        var imageDownload = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(campaignId, itemId, $"/{image.GetProperty("id").GetGuid()}/file"), "ifile-keeper-2"));
        var documentDownload = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(campaignId, itemId, $"/{document.GetProperty("id").GetGuid()}/file"), "ifile-keeper-2"));

        Assert.Equal(Png, await imageDownload.Content.ReadAsByteArrayAsync());
        Assert.Equal("image/png", imageDownload.Content.Headers.ContentType!.MediaType);
        Assert.Equal("attachment", imageDownload.Content.Headers.ContentDisposition!.DispositionType);
        Assert.Equal("nosniff", Assert.Single(imageDownload.Headers.GetValues("X-Content-Type-Options")));
        Assert.True(imageDownload.Headers.CacheControl!.NoStore);
        Assert.Equal(Pdf, await documentDownload.Content.ReadAsByteArrayAsync());
        Assert.Equal("application/pdf", documentDownload.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task Given_a_rich_text_Handout_When_downloading_its_file_Then_it_is_404()
    {
        var (client, campaignId, itemId) = await ItemAsync("ifile-keeper-3");
        var text = await client.SendAsync(BuildRequest(HttpMethod.Post, HandoutsUri(campaignId, itemId), "ifile-keeper-3", new { kind = "Text", visibility = "KeeperFacing", title = "Notes", content = Json(Notes) }));
        var id = (await BodyAsync(text)).GetProperty("id").GetGuid();

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(campaignId, itemId, $"/{id}/file"), "ifile-keeper-3"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_missing_unsupported_or_wrong_kind_input_When_adding_Then_each_is_a_400_keyed_by_the_field_and_nothing_is_stored()
    {
        var (client, campaignId, itemId) = await ItemAsync("ifile-keeper-4");

        async Task<IReadOnlyDictionary<string, string[]>> PostAsync(HttpRequestMessage request) => await ProblemsAsync(await client.SendAsync(request));

        var noFile = await PostAsync(Multipart(HttpMethod.Post, HandoutsUri(campaignId, itemId), "ifile-keeper-4"));
        var svg = await PostAsync(Multipart(HttpMethod.Post, HandoutsUri(campaignId, itemId), "ifile-keeper-4", file: Svg, fileName: "drawing.svg"));
        var pdfAsImage = await PostAsync(Multipart(HttpMethod.Post, HandoutsUri(campaignId, itemId), "ifile-keeper-4", file: Pdf, fileName: "letter.pdf"));
        var textKind = await PostAsync(Multipart(HttpMethod.Post, HandoutsUri(campaignId, itemId), "ifile-keeper-4", kind: "Text", file: Png));
        var noTitle = await PostAsync(Multipart(HttpMethod.Post, HandoutsUri(campaignId, itemId), "ifile-keeper-4", title: " ", file: Png));

        Assert.Equal(["Choose an image."], noFile["file"]);
        Assert.Equal(["Choose a PNG, JPEG, WebP, or GIF image."], svg["file"]);
        Assert.Equal(["Choose a PNG, JPEG, WebP, or GIF image."], pdfAsImage["file"]);
        Assert.Equal(["kind"], textKind.Keys);
        Assert.Equal(["Enter a title."], noTitle["title"]);
        Assert.Empty(StoredBlobs());
        Assert.Equal(0, await CountAsync(_factory, "Handouts"));
    }

    [Fact]
    public async Task Given_an_Item_not_in_play_When_replacing_a_file_Then_the_old_blob_is_deleted_and_the_new_bytes_are_served()
    {
        var (client, campaignId, itemId) = await ItemAsync("ifile-keeper-5");
        var id = (await AddImageAsync(client, campaignId, itemId, "ifile-keeper-5")).GetProperty("id").GetGuid();

        var edited = await client.SendAsync(Multipart(HttpMethod.Put, HandoutsUri(campaignId, itemId, $"/{id}"), "ifile-keeper-5", kind: "Map", visibility: "KeeperFacing", title: "Renamed", file: Jpeg, fileName: "new.jpg"));

        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        Assert.Equal("image/jpeg", (await BodyAsync(edited)).GetProperty("file").GetProperty("mediaType").GetString());
        Assert.Single(StoredBlobs());
        var download = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(campaignId, itemId, $"/{id}/file"), "ifile-keeper-5"));
        Assert.Equal(Jpeg, await download.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Given_an_image_Handout_When_editing_without_a_file_Then_the_file_is_kept()
    {
        var (client, campaignId, itemId) = await ItemAsync("ifile-keeper-6");
        var id = (await AddImageAsync(client, campaignId, itemId, "ifile-keeper-6")).GetProperty("id").GetGuid();

        var edited = await client.SendAsync(Multipart(HttpMethod.Put, HandoutsUri(campaignId, itemId, $"/{id}"), "ifile-keeper-6", title: "Renamed"));

        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        Assert.Equal("Renamed", (await BodyAsync(edited)).GetProperty("title").GetString());
        Assert.Single(StoredBlobs());
    }

    [Theory]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public async Task Given_an_Item_linked_to_an_Active_or_Finished_Scene_When_replacing_a_file_Then_both_blobs_are_kept_and_the_new_bytes_are_served(SceneStatus status)
    {
        var client = _factory.CreateClient();
        var oid = $"ifile-keeper-7-{status}";
        var scene = await SceneAsync(client, oid);
        var itemId = (await CreateItemAsync(client, scene.CampaignId, oid)).GetProperty("id").GetGuid();
        var id = (await AddImageAsync(client, scene.CampaignId, itemId, oid)).GetProperty("id").GetGuid();
        await LinkItemAsync(client, scene, oid, itemId);
        await PlayAsync(_factory, scene.SceneId, status);

        var edited = await client.SendAsync(Multipart(HttpMethod.Put, HandoutsUri(scene.CampaignId, itemId, $"/{id}"), oid, file: Jpeg, fileName: "new.jpg"));

        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        Assert.Equal(2, StoredBlobs().Length);
        var download = await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(scene.CampaignId, itemId, $"/{id}/file"), oid));
        Assert.Equal(Jpeg, await download.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Given_an_Item_not_in_play_When_deleting_a_file_Handout_Then_it_is_204_and_the_blob_is_deleted()
    {
        var (client, campaignId, itemId) = await ItemAsync("ifile-keeper-8");
        var id = (await AddImageAsync(client, campaignId, itemId, "ifile-keeper-8")).GetProperty("id").GetGuid();

        var response = await client.SendAsync(BuildRequest(HttpMethod.Delete, HandoutsUri(campaignId, itemId, $"/{id}"), "ifile-keeper-8"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(StoredBlobs());
        Assert.Equal(0, await CountAsync(_factory, "Handouts"));
    }

    [Theory]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public async Task Given_an_Item_linked_to_an_Active_or_Finished_Scene_When_deleting_a_file_Handout_Then_it_is_a_409_and_the_blob_stays(SceneStatus status)
    {
        var client = _factory.CreateClient();
        var oid = $"ifile-keeper-9-{status}";
        var scene = await SceneAsync(client, oid);
        var itemId = (await CreateItemAsync(client, scene.CampaignId, oid)).GetProperty("id").GetGuid();
        var id = (await AddImageAsync(client, scene.CampaignId, itemId, oid)).GetProperty("id").GetGuid();
        await LinkItemAsync(client, scene, oid, itemId);
        await PlayAsync(_factory, scene.SceneId, status);

        var response = await client.SendAsync(BuildRequest(HttpMethod.Delete, HandoutsUri(scene.CampaignId, itemId, $"/{id}"), oid));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(HandoutsKeptTitle, await ProblemTitleAsync(response));
        Assert.Single(StoredBlobs());
        Assert.Equal(1, await CountAsync(_factory, "Handouts"));
    }

    [Fact]
    public async Task Given_a_player_or_another_keeper_or_foreign_ids_When_using_the_multipart_and_download_endpoints_Then_each_is_the_same_404()
    {
        var (client, campaignId, itemId) = await ItemAsync("ifile-keeper-10");
        await JoinAsPlayerAsync(client, campaignId, "ifile-keeper-10", "ifile-player-10");
        var otherCampaignId = (await CreateCampaignAsync(client, "ifile-other-keeper-10")).Id;
        var foreignItemId = (await CreateItemAsync(client, otherCampaignId, "ifile-other-keeper-10")).GetProperty("id").GetGuid();
        var id = (await AddImageAsync(client, campaignId, itemId, "ifile-keeper-10")).GetProperty("id").GetGuid();

        async Task<IReadOnlyList<string>> AnswersAsync(string oid, Guid campaign, Guid item)
        {
            var responses = new[]
            {
                await client.SendAsync(Multipart(HttpMethod.Post, HandoutsUri(campaign, item), oid, file: Png)),
                await client.SendAsync(Multipart(HttpMethod.Put, HandoutsUri(campaign, item, $"/{id}"), oid, file: Png)),
                await client.SendAsync(BuildRequest(HttpMethod.Get, HandoutsUri(campaign, item, $"/{id}/file"), oid)),
            };
            Assert.All(responses, response => Assert.Equal(HttpStatusCode.NotFound, response.StatusCode));
            var answers = new List<string>();
            foreach (var response in responses)
            {
                answers.Add(await WithoutTraceIdAsync(response));
            }

            return answers;
        }

        var player = await AnswersAsync("ifile-player-10", campaignId, itemId);
        var otherKeeper = await AnswersAsync("ifile-other-keeper-10", campaignId, itemId);
        var foreignItem = await AnswersAsync("ifile-keeper-10", campaignId, foreignItemId);
        var unknownItem = await AnswersAsync("ifile-keeper-10", campaignId, Guid.NewGuid());

        Assert.All(new[] { otherKeeper, foreignItem, unknownItem }, answers => Assert.Equal(player, answers));
        Assert.Single(StoredBlobs());
    }

    [Fact]
    public async Task Given_a_request_with_no_content_type_When_adding_or_editing_to_an_Item_Then_the_json_actions_answer_415_not_an_ambiguous_match_500()
    {
        var (client, campaignId, itemId) = await ItemAsync("ifile-keeper-11");
        var image = await AddImageAsync(client, campaignId, itemId, "ifile-keeper-11");
        var created = BuildRequest(HttpMethod.Post, HandoutsUri(campaignId, itemId), "ifile-keeper-11");
        var edited = BuildRequest(HttpMethod.Put, HandoutsUri(campaignId, itemId, $"/{image.GetProperty("id").GetGuid()}"), "ifile-keeper-11");

        var createdResponse = await client.SendAsync(created);
        var editedResponse = await client.SendAsync(edited);

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, createdResponse.StatusCode);
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, editedResponse.StatusCode);
        Assert.Single(StoredBlobs());
    }

    [Fact]
    public async Task Given_no_bearer_token_When_using_the_Item_file_routes_Then_each_is_401_and_nothing_is_stored_or_read()
    {
        var (client, campaignId, itemId) = await ItemAsync("ifile-keeper-12");
        var id = (await AddImageAsync(client, campaignId, itemId, "ifile-keeper-12")).GetProperty("id").GetGuid();
        var blobsBefore = StoredBlobs();
        var requests = new[]
        {
            Multipart(HttpMethod.Post, HandoutsUri(campaignId, itemId), "ifile-keeper-12", file: Png),
            Multipart(HttpMethod.Put, HandoutsUri(campaignId, itemId, $"/{id}"), "ifile-keeper-12", file: Png),
            BuildRequest(HttpMethod.Get, HandoutsUri(campaignId, itemId, $"/{id}/file"), "ifile-keeper-12"),
        };

        foreach (var request in requests)
        {
            request.Headers.Add("X-Test-Unauthenticated", "true");
            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        Assert.Equal(blobsBefore, StoredBlobs());
        Assert.Equal(1, await CountAsync(_factory, "Handouts"));
    }
}
