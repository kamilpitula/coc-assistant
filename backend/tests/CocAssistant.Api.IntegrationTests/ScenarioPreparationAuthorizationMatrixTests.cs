namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The endpoint-list authorization matrix for Scenario Preparation (ADR 0023; specs/scenario-preparation/spec.md, Architecture and
/// Regression Guardrails). One table has a row, with a valid body, for every endpoint the app registers from the
/// ScenarioPreparation.Controllers assembly. A caller without a token gets 401; a Player of the Campaign, another Campaign's Keeper,
/// and the Keeper addressing a missing Campaign all get 404. Each test sends every row, reports every wrong endpoint at once, and checks
/// that no response carries prepared text and that no row or stored file changed.
/// </summary>
public class ScenarioPreparationAuthorizationMatrixTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private const string KeeperOid = "matrix-keeper";
    private const string PlayerOid = "matrix-player";
    private const string OtherKeeperOid = "matrix-other-keeper";

    private readonly IdentityApiFactory _factory;

    public ScenarioPreparationAuthorizationMatrixTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private sealed record Row(string Method, string Template, Func<HttpContent?> Content)
    {
        // The table tells same-named route parameters apart (item Handout, Item link); the routes call them handoutId and linkId.
        public string Key => $"{Method} {Template}".Replace("{itemHandoutId}", "{handoutId}").Replace("{itemLinkId}", "{linkId}");
    }

    private sealed record Seeded(Guid CampaignId, PreparedScenarioIds Ids);

    [Fact]
    public void Given_the_registered_endpoints_When_comparing_with_the_matrix_Then_every_endpoint_has_a_row_and_every_row_an_endpoint()
    {
        var registered = RegisteredEndpoints();
        var tabled = Rows().Select(row => row.Key).ToHashSet();

        Assert.Empty(registered.Except(tabled).Order());
        Assert.Empty(tabled.Except(registered).Order());
    }

    [Fact]
    public async Task Given_no_token_When_calling_every_endpoint_Then_each_answers_401_and_nothing_changes()
    {
        var seeded = await SeedAsync();

        await AssertEveryRowAsync(seeded, HttpStatusCode.Unauthorized, request => request.Headers.Add("X-Test-Unauthenticated", "true"), addresses => addresses);
    }

    [Fact]
    public async Task Given_a_player_of_the_campaign_When_calling_every_endpoint_Then_each_answers_404_and_nothing_changes()
    {
        var seeded = await SeedAsync();

        await AssertEveryRowAsync(seeded, HttpStatusCode.NotFound, request => Authenticate(request, PlayerOid), addresses => addresses);
    }

    [Fact]
    public async Task Given_another_campaigns_keeper_When_calling_every_endpoint_Then_each_answers_404_and_nothing_changes()
    {
        var seeded = await SeedAsync();

        await AssertEveryRowAsync(seeded, HttpStatusCode.NotFound, request => Authenticate(request, OtherKeeperOid), addresses => addresses);
    }

    [Fact]
    public async Task Given_the_keeper_and_a_missing_campaign_When_calling_every_endpoint_Then_each_answers_404_and_nothing_changes()
    {
        var seeded = await SeedAsync();

        await AssertEveryRowAsync(seeded, HttpStatusCode.NotFound, request => Authenticate(request, KeeperOid), addresses => addresses with { CampaignId = Guid.NewGuid() });
    }

    private sealed record Addresses(Guid CampaignId, PreparedScenarioIds Ids);

    private async Task AssertEveryRowAsync(
        Seeded seeded,
        HttpStatusCode expected,
        Action<HttpRequestMessage> authenticate,
        Func<Addresses, Addresses> address)
    {
        var client = _factory.CreateClient();
        var before = await SnapshotAsync();
        var wrong = new List<string>();
        var leaks = new List<string>();

        foreach (var row in Rows())
        {
            var target = address(new Addresses(seeded.CampaignId, seeded.Ids));
            using var request = new HttpRequestMessage(new HttpMethod(row.Method), Expand(row.Template, target))
            {
                Content = row.Content(),
            };
            authenticate(request);
            using var response = await client.SendAsync(request);
            if (response.StatusCode != expected)
            {
                wrong.Add($"{row.Key} answered {(int)response.StatusCode}, expected {(int)expected}");
            }

            if ((await response.Content.ReadAsStringAsync()).Contains(PreparedScenarioSeed.SecretPrefix, StringComparison.Ordinal))
            {
                leaks.Add(row.Key);
            }
        }

        Assert.Empty(wrong);
        Assert.Empty(leaks);
        Assert.Equal(before, await SnapshotAsync());
    }

    private static void Authenticate(HttpRequestMessage request, string oid)
    {
        request.Headers.Add("X-Test-Oid", oid);
        request.Headers.Add("X-Test-Name", DisplayNameFor(oid));
        request.Headers.Add("X-Test-Email", $"{oid}@example.com");
    }

    private async Task<Seeded> SeedAsync()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, KeeperOid)).Id;
        await JoinAsPlayerAsync(client, campaignId, KeeperOid, PlayerOid);
        await CreateCampaignAsync(client, OtherKeeperOid);
        return new Seeded(campaignId, await PreparedScenarioSeed.PrepareAsync(client, campaignId, KeeperOid));
    }

    private static string Expand(string template, Addresses target) => template
        .Replace("{campaignId}", target.CampaignId.ToString())
        .Replace("{scenarioId}", target.Ids.ScenarioId.ToString())
        .Replace("{sceneId}", target.Ids.SceneId.ToString())
        .Replace("{humanNpcId}", target.Ids.HumanNpcId.ToString())
        .Replace("{mythosCreatureId}", target.Ids.MythosCreatureId.ToString())
        .Replace("{linkId}", target.Ids.NonPlayerEntityLinkId.ToString())
        .Replace("{handoutId}", target.Ids.SceneHandoutId.ToString())
        .Replace("{itemId}", target.Ids.ItemId.ToString())
        .Replace("{itemHandoutId}", target.Ids.ItemHandoutId.ToString())
        .Replace("{itemLinkId}", target.Ids.ItemLinkId.ToString());

    // The (method, template) pairs of the assembly's actions, with route constraints removed so they match the table.
    private HashSet<string> RegisteredEndpoints()
    {
        var assembly = typeof(ScenariosController).Assembly;
        return _factory.Services.GetRequiredService<EndpointDataSource>().Endpoints
            .OfType<RouteEndpoint>()
            .Where(endpoint => endpoint.Metadata.GetMetadata<ControllerActionDescriptor>()?.ControllerTypeInfo.Assembly == assembly)
            .SelectMany(endpoint => endpoint.Metadata.GetMetadata<HttpMethodMetadata>()!.HttpMethods
                .Select(method => $"{method} /{System.Text.RegularExpressions.Regex.Replace(endpoint.RoutePattern.RawText!, @"\{(\w+):\w+\}", "{$1}")}"))
            .ToHashSet();
    }

    // Row count and checksum of every Scenario Preparation table, plus every stored Handout file with its size.
    private async Task<string> SnapshotAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>();
        var connection = dbContext.Database.GetDbConnection();
        await connection.OpenAsync();
        var lines = new List<string>();
        foreach (var table in dbContext.Model.GetEntityTypes().Select(entity => (Schema: entity.GetSchema() ?? "dbo", Name: entity.GetTableName())).Where(table => table.Name is not null).Distinct().Order())
        {
            await using var command = connection.CreateCommand();
            command.CommandText = $"SELECT COUNT_BIG(*), CHECKSUM_AGG(BINARY_CHECKSUM(*)) FROM [{table.Schema}].[{table.Name}]";
            await using var reader = await command.ExecuteReaderAsync();
            await reader.ReadAsync();
            lines.Add($"{table.Name}: {reader.GetValue(0)} {reader.GetValue(1)}");
        }

        await connection.CloseAsync();
        var files = Directory.Exists(_factory.HandoutFilesDirectory)
            ? Directory.GetFiles(_factory.HandoutFilesDirectory).Order().Select(path => $"{Path.GetFileName(path)}: {new FileInfo(path).Length}")
            : [];
        return string.Join('\n', lines.Concat(files));
    }

    private static Func<HttpContent?> Json(object body) => () => JsonContent.Create(body);

    private static Func<HttpContent?> NoBody => () => null;

    private static Func<HttpContent?> Multipart(string label, string kind) => () => PreparedScenarioSeed.FileHandoutContent(label, kind);

    private static readonly Guid SomeId = Guid.NewGuid();

    // One row per endpoint; a second row with the same key covers the multipart action that shares a route with a JSON action.
    private static IReadOnlyList<Row> Rows()
    {
        const string campaign = "/api/campaigns/{campaignId}";
        const string scenario = campaign + "/scenarios/{scenarioId}";
        const string scenes = scenario + "/scenes";
        const string scene = scenes + "/{sceneId}";
        const string item = campaign + "/items/{itemId}";
        var handout = PreparedScenarioSeed.HandoutBody("matrix");
        return
        [
            new("GET", campaign + "/scenarios", NoBody),
            new("POST", campaign + "/scenarios", Json(new { title = "Matrix", keeperNotes = "Matrix" })),
            new("GET", scenario, NoBody),
            new("PUT", scenario, Json(new { title = "Matrix", keeperNotes = "Matrix" })),
            new("PUT", campaign + "/scenarios/order", Json(new { scenarioIds = new[] { SomeId } })),
            new("GET", scenes, NoBody),
            new("POST", scenes, Json(new { title = "Matrix", location = "Matrix" })),
            new("GET", scene, NoBody),
            new("PUT", scene, Json(new { title = "Matrix", location = "Matrix" })),
            new("DELETE", scene, NoBody),
            new("PUT", scenario + "/scenes/order", Json(new { sceneIds = new[] { SomeId } })),
            new("POST", scene + "/non-player-entity-links", Json(new { nonPlayerEntity = new { type = "HumanNpc", id = SomeId }, playerFacingName = "Matrix" })),
            new("PUT", scene + "/non-player-entity-links/{linkId}", Json(new { playerFacingName = "Matrix" })),
            new("DELETE", scene + "/non-player-entity-links/{linkId}", NoBody),
            new("POST", scene + "/item-links", Json(new { itemId = SomeId })),
            new("DELETE", scene + "/item-links/{itemLinkId}", NoBody),
            new("POST", scene + "/handouts", Json(handout)),
            new("POST", scene + "/handouts", Multipart("matrix", "Image")),
            new("GET", scene + "/handouts/{handoutId}", NoBody),
            new("PUT", scene + "/handouts/{handoutId}", Json(handout)),
            new("PUT", scene + "/handouts/{handoutId}", Multipart("matrix", "Image")),
            new("DELETE", scene + "/handouts/{handoutId}", NoBody),
            new("PUT", scene + "/handouts/order", Json(new { handoutIds = new[] { SomeId } })),
            new("GET", scene + "/handouts/{handoutId}/file", NoBody),
            new("GET", campaign + "/non-player-entities", NoBody),
            new("POST", campaign + "/human-npcs", Json(new { name = "Matrix", age = 40 })),
            new("GET", campaign + "/human-npcs/{humanNpcId}", NoBody),
            new("PUT", campaign + "/human-npcs/{humanNpcId}", Json(PreparedScenarioSeed.HumanNpcBody("matrix"))),
            new("POST", campaign + "/human-npcs/{humanNpcId}/duplicate", NoBody),
            new("DELETE", campaign + "/human-npcs/{humanNpcId}", NoBody),
            new("POST", campaign + "/mythos-creatures", Json(new { name = "Matrix" })),
            new("GET", campaign + "/mythos-creatures/{mythosCreatureId}", NoBody),
            new("PUT", campaign + "/mythos-creatures/{mythosCreatureId}", Json(PreparedScenarioSeed.MythosCreatureBody("matrix"))),
            new("POST", campaign + "/mythos-creatures/{mythosCreatureId}/duplicate", NoBody),
            new("DELETE", campaign + "/mythos-creatures/{mythosCreatureId}", NoBody),
            new("GET", campaign + "/items", NoBody),
            new("POST", campaign + "/items", Json(PreparedScenarioSeed.ItemBody("matrix"))),
            new("GET", item, NoBody),
            new("PUT", item, Json(PreparedScenarioSeed.ItemBody("matrix"))),
            new("DELETE", item, NoBody),
            new("POST", item + "/handouts", Json(handout)),
            new("POST", item + "/handouts", Multipart("matrix", "Image")),
            new("GET", item + "/handouts/{itemHandoutId}", NoBody),
            new("PUT", item + "/handouts/{itemHandoutId}", Json(handout)),
            new("PUT", item + "/handouts/{itemHandoutId}", Multipart("matrix", "Image")),
            new("DELETE", item + "/handouts/{itemHandoutId}", NoBody),
            new("PUT", item + "/handouts/order", Json(new { handoutIds = new[] { SomeId } })),
            new("GET", item + "/handouts/{itemHandoutId}/file", NoBody),
        ];
    }
}
