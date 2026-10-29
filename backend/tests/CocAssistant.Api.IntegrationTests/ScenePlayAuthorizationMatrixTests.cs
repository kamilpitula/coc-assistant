namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The endpoint-list authorization matrix for Scene Play (ADR 0023; specs/scene-play/spec.md, Regression Guardrails). One table has
/// a row, with a valid body, for every endpoint the app registers from the ScenePlay.Controllers assembly. A caller without a token
/// gets 401; a Player gets the row's status (404 for Keeper-only rows, 200 with the non-present shape for the read); another
/// Campaign's Keeper and the Keeper addressing a missing Campaign get 404. A refused call changes no Scene, no present Investigator,
/// and no Wall Entry, and no response carries prepared text.
/// </summary>
public class ScenePlayAuthorizationMatrixTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private const string KeeperOid = "spl-matrix-keeper";
    private const string PlayerOid = "spl-matrix-player";
    private const string PresentPlayerOid = "spl-matrix-present";
    private const string OtherKeeperOid = "spl-matrix-other-keeper";

    private readonly IdentityApiFactory _factory;

    public ScenePlayAuthorizationMatrixTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private sealed record Row(string Method, string Template, Func<HttpContent?> Content, HttpStatusCode PlayerStatus)
    {
        public string Key => $"{Method} {Template}";
    }

    private sealed record Seeded(Guid CampaignId, Guid PreparedSceneId);

    private sealed record Addresses(Guid CampaignId, Guid SceneId);

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

        await AssertEveryRowAsync(seeded, _ => HttpStatusCode.Unauthorized, request => request.Headers.Add("X-Test-Unauthenticated", "true"), addresses => addresses);
    }

    [Fact]
    public async Task Given_a_player_of_the_campaign_When_calling_every_endpoint_Then_each_answers_its_player_status_and_nothing_changes()
    {
        var seeded = await SeedAsync();

        await AssertEveryRowAsync(seeded, row => row.PlayerStatus, request => Authenticate(request, PlayerOid), addresses => addresses);
    }

    [Fact]
    public async Task Given_another_campaigns_keeper_When_calling_every_endpoint_Then_each_answers_404_and_nothing_changes()
    {
        var seeded = await SeedAsync();

        await AssertEveryRowAsync(seeded, _ => HttpStatusCode.NotFound, request => Authenticate(request, OtherKeeperOid), addresses => addresses);
    }

    [Fact]
    public async Task Given_the_keeper_and_a_missing_campaign_When_calling_every_endpoint_Then_each_answers_404_and_nothing_changes()
    {
        var seeded = await SeedAsync();

        await AssertEveryRowAsync(seeded, _ => HttpStatusCode.NotFound, request => Authenticate(request, KeeperOid), addresses => addresses with { CampaignId = Guid.NewGuid() });
    }

    [Fact]
    public async Task Given_no_scene_is_active_When_a_player_reads_the_active_scene_Then_it_is_204()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, KeeperOid)).Id;
        await JoinAsPlayerAsync(client, campaignId, KeeperOid, PlayerOid);

        using var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/active-scene", PlayerOid));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    private async Task AssertEveryRowAsync(
        Seeded seeded,
        Func<Row, HttpStatusCode> expected,
        Action<HttpRequestMessage> authenticate,
        Func<Addresses, Addresses> address)
    {
        var client = _factory.CreateClient();
        var before = await SnapshotAsync();
        var wrong = new List<string>();
        var leaks = new List<string>();

        foreach (var row in Rows())
        {
            var target = address(new Addresses(seeded.CampaignId, seeded.PreparedSceneId));
            using var request = new HttpRequestMessage(new HttpMethod(row.Method), row.Template.Replace("{campaignId}", target.CampaignId.ToString()).Replace("{sceneId}", target.SceneId.ToString()))
            {
                Content = row.Content(),
            };
            authenticate(request);
            using var response = await client.SendAsync(request);
            if (response.StatusCode != expected(row))
            {
                wrong.Add($"{row.Key} answered {(int)response.StatusCode}, expected {(int)expected(row)}");
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

    // A Campaign with a Player who has no Investigator, a Player with an Approved one, a prepared Scenario full of secret text, and an
    // Active Scene whose title is plain, because the title of the Active Scene is meant to reach every member.
    private async Task<Seeded> SeedAsync()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, KeeperOid)).Id;
        await JoinAsPlayerAsync(client, campaignId, KeeperOid, PlayerOid);
        await JoinAsPlayerAsync(client, campaignId, KeeperOid, PresentPlayerOid);
        var investigatorId = await CreateApprovedAsync(client, campaignId, KeeperOid, PresentPlayerOid, "Harvey Walters");
        await CreateCampaignAsync(client, OtherKeeperOid);
        var prepared = await PreparedScenarioSeed.PrepareAsync(client, campaignId, KeeperOid);
        var scenes = $"/api/campaigns/{campaignId}/scenarios/{prepared.ScenarioId}/scenes";
        var created = await client.SendAsync(BuildRequest(HttpMethod.Post, scenes, KeeperOid, new { title = "The Corbitt House" }));
        created.EnsureSuccessStatusCode();
        var activeSceneId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var start = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/scenes/{activeSceneId}/start", KeeperOid, new { presentInvestigatorIds = new[] { investigatorId }, finishActiveScene = false }));
        start.EnsureSuccessStatusCode();
        return new Seeded(campaignId, prepared.SceneId);
    }

    // The (method, template) pairs of the assembly's actions, with route constraints removed so they match the table.
    private HashSet<string> RegisteredEndpoints()
    {
        var assembly = typeof(ActiveSceneController).Assembly;
        return _factory.Services.GetRequiredService<EndpointDataSource>().Endpoints
            .OfType<RouteEndpoint>()
            .Where(endpoint => endpoint.Metadata.GetMetadata<ControllerActionDescriptor>()?.ControllerTypeInfo.Assembly == assembly)
            .SelectMany(endpoint => endpoint.Metadata.GetMetadata<HttpMethodMetadata>()!.HttpMethods
                .Select(method => $"{method} /{System.Text.RegularExpressions.Regex.Replace(endpoint.RoutePattern.RawText!, @"\{(\w+):\w+\}", "{$1}")}"))
            .ToHashSet();
    }

    // Row count and checksum of the Scene tables and the Wall, which are what Scene Play writes.
    private async Task<string> SnapshotAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var lines = new List<string>();
        lines.AddRange(await ChecksumsAsync(scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>(), "Scenes", "SceneInvestigatorsPresent"));
        lines.AddRange(await ChecksumsAsync(scope.ServiceProvider.GetRequiredService<CampaignPlayDbContext>(), "WallEntries"));
        return string.Join('\n', lines);
    }

    private static async Task<List<string>> ChecksumsAsync(DbContext dbContext, params string[] tables)
    {
        var connection = dbContext.Database.GetDbConnection();
        await connection.OpenAsync();
        var lines = new List<string>();
        foreach (var table in tables)
        {
            await using var command = connection.CreateCommand();
            command.CommandText = $"SELECT COUNT_BIG(*), CHECKSUM_AGG(BINARY_CHECKSUM(*)) FROM [dbo].[{table}]";
            await using var reader = await command.ExecuteReaderAsync();
            await reader.ReadAsync();
            lines.Add($"{table}: {reader.GetValue(0)} {reader.GetValue(1)}");
        }

        await connection.CloseAsync();
        return lines;
    }

    private static Func<HttpContent?> Json(object body) => () => JsonContent.Create(body);

    private static Func<HttpContent?> NoBody => () => null;

    private static readonly Guid SomeId = Guid.NewGuid();

    // One row per endpoint.
    private static IReadOnlyList<Row> Rows()
    {
        const string campaign = "/api/campaigns/{campaignId}";
        return
        [
            new("POST", campaign + "/scenes/{sceneId}/start", Json(new { presentInvestigatorIds = new[] { SomeId }, finishActiveScene = true }), HttpStatusCode.NotFound),
            new("POST", campaign + "/active-scene/finish", NoBody, HttpStatusCode.NotFound),
            new("PUT", campaign + "/active-scene/present-investigators", Json(new { presentInvestigatorIds = new[] { SomeId } }), HttpStatusCode.NotFound),
            new("GET", campaign + "/active-scene", NoBody, HttpStatusCode.OK),
        ];
    }
}
