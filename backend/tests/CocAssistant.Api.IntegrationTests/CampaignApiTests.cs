namespace CocAssistant.Api.IntegrationTests;

/// <summary>Integration tests for the Campaign API against a real SQL Server database, reset between tests via Respawn.</summary>
public class CampaignApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;
    private Respawner _respawner = null!;

    public CampaignApiTests(IdentityApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.EnsureDatabaseCreatedAsync();

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CampaignPlayDbContext>();
        var connection = dbContext.Database.GetDbConnection();
        await connection.OpenAsync();
        _respawner = await Respawner.CreateAsync(connection, new RespawnerOptions
        {
            DbAdapter = DbAdapter.SqlServer,
            TablesToIgnore = ["__EFMigrationsHistory", "__CampaignPlayMigrationsHistory", "__ScenarioPreparationMigrationsHistory"],
        });
        await _respawner.ResetAsync(connection);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private static HttpRequestMessage BuildKeeperRequest(HttpMethod method, string uri, string oid) =>
        new(method, uri)
        {
            Headers =
            {
                { "X-Test-Oid", oid },
                { "X-Test-Name", "Integration Keeper" },
                { "X-Test-Email", $"{oid}@example.com" },
            },
        };

    [Fact]
    public async Task Given_an_authenticated_user_When_creating_a_campaign_Then_they_are_recorded_as_its_keeper()
    {
        var client = _factory.CreateClient();
        var request = BuildKeeperRequest(HttpMethod.Post, "/api/campaigns", "campaign-keeper-1");
        request.Content = JsonContent.Create(new { name = "The Haunting" });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var campaign = await response.Content.ReadFromJsonAsync<CampaignResponse>();
        Assert.NotNull(campaign);
        Assert.Equal("The Haunting", campaign!.Name);
        Assert.NotEqual(Guid.Empty, campaign.KeeperAccountId);
    }

    [Fact]
    public async Task Given_a_configured_player_limit_When_creating_a_campaign_Then_the_limit_is_returned()
    {
        var client = _factory.CreateClient();
        var request = BuildKeeperRequest(HttpMethod.Post, "/api/campaigns", "campaign-keeper-limit-1");
        request.Content = JsonContent.Create(new { name = "The Haunting", playerLimit = 3 });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var campaign = await response.Content.ReadFromJsonAsync<CampaignResponse>();
        Assert.Equal(3, campaign!.PlayerLimit);
    }

    [Fact]
    public async Task Given_no_player_limit_When_creating_a_campaign_Then_the_default_of_eight_is_returned()
    {
        var client = _factory.CreateClient();
        var request = BuildKeeperRequest(HttpMethod.Post, "/api/campaigns", "campaign-keeper-limit-2");
        request.Content = JsonContent.Create(new { name = "The Haunting" });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var campaign = await response.Content.ReadFromJsonAsync<CampaignResponse>();
        Assert.Equal(8, campaign!.PlayerLimit);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(17)]
    public async Task Given_an_out_of_range_player_limit_When_creating_a_campaign_Then_it_is_a_bad_request(int playerLimit)
    {
        var client = _factory.CreateClient();
        var request = BuildKeeperRequest(HttpMethod.Post, "/api/campaigns", "campaign-keeper-limit-3");
        request.Content = JsonContent.Create(new { name = "The Haunting", playerLimit });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_campaign_When_its_keeper_requests_it_Then_the_campaign_is_returned()
    {
        var client = _factory.CreateClient();
        var createRequest = BuildKeeperRequest(HttpMethod.Post, "/api/campaigns", "campaign-keeper-2");
        createRequest.Content = JsonContent.Create(new { name = "The Haunting" });
        var created = await (await client.SendAsync(createRequest)).Content.ReadFromJsonAsync<CampaignResponse>();

        var getResponse = await client.SendAsync(
            BuildKeeperRequest(HttpMethod.Get, $"/api/campaigns/{created!.Id}", "campaign-keeper-2"));

        getResponse.EnsureSuccessStatusCode();
        var fetched = await getResponse.Content.ReadFromJsonAsync<CampaignResponse>();
        Assert.Equal(created.Id, fetched!.Id);
    }

    // specs/campaign-play/spec.md API Contracts: GET /api/campaigns/{campaignId} is role-aware.
    [Fact]
    public async Task Given_a_campaign_When_its_keeper_requests_it_Then_the_keeper_view_carries_the_keeper_role()
    {
        var client = _factory.CreateClient();
        var created = await CreateCampaignAsync(client, "campaign-keeper-role-1");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{created.Id}", "campaign-keeper-role-1"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("Keeper", body.RootElement.GetProperty("role").GetString());
        Assert.Equal(created.KeeperAccountId, body.RootElement.GetProperty("keeperAccountId").GetGuid());
        Assert.Equal(8, body.RootElement.GetProperty("playerLimit").GetInt32());
    }

    // Scenario: Player reads the Campaign without Keeper-only data
    [Fact]
    public async Task Given_a_player_has_joined_When_the_player_requests_the_campaign_Then_the_reduced_player_view_is_returned()
    {
        var client = _factory.CreateClient();
        var created = await CreateCampaignAsync(client, "campaign-keeper-role-2");
        await JoinAsPlayerAsync(client, created.Id, "campaign-keeper-role-2", "campaign-player-role-2");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{created.Id}", "campaign-player-role-2"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = body.RootElement;
        Assert.Equal(
            ["allowedCreationMethods", "era", "id", "name", "role"],
            root.EnumerateObject().Select(property => property.Name).Order());
        Assert.Equal("Player", root.GetProperty("role").GetString());
        Assert.Equal("The Haunting", root.GetProperty("name").GetString());
        Assert.Equal("1920s", root.GetProperty("era").GetString());
        Assert.Equal(3, root.GetProperty("allowedCreationMethods").GetArrayLength());
    }

    [Fact]
    public async Task Given_a_campaign_When_an_unrelated_account_requests_it_Then_it_is_not_found()
    {
        var client = _factory.CreateClient();
        var createRequest = BuildKeeperRequest(HttpMethod.Post, "/api/campaigns", "campaign-keeper-3");
        createRequest.Content = JsonContent.Create(new { name = "The Haunting" });
        var created = await (await client.SendAsync(createRequest)).Content.ReadFromJsonAsync<CampaignResponse>();

        var getResponse = await client.SendAsync(
            BuildKeeperRequest(HttpMethod.Get, $"/api/campaigns/{created!.Id}", "unrelated-account-3"));

        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task Given_no_bearer_token_When_creating_a_campaign_Then_the_response_is_unauthorized()
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/campaigns")
        {
            Content = JsonContent.Create(new { name = "The Haunting" }),
        };
        request.Headers.Add("X-Test-Unauthenticated", "true");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
