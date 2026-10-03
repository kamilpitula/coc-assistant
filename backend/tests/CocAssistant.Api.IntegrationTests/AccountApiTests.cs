namespace CocAssistant.Api.IntegrationTests;

/// <summary>Integration tests for GET /api/account/me against a real SQL Server database, reset between tests via Respawn.</summary>
public class AccountApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;
    private Respawner _respawner = null!;

    public AccountApiTests(IdentityApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.EnsureDatabaseCreatedAsync();

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var connection = dbContext.Database.GetDbConnection();
        await connection.OpenAsync();
        _respawner = await Respawner.CreateAsync(connection, new RespawnerOptions
        {
            DbAdapter = DbAdapter.SqlServer,
            TablesToIgnore = ["__EFMigrationsHistory", "__CampaignPlayMigrationsHistory"],
        });
        await _respawner.ResetAsync(connection);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Given_no_bearer_token_When_calling_account_me_Then_the_response_is_unauthorized()
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/account/me");
        request.Headers.Add("X-Test-Unauthenticated", "true");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Given_no_existing_account_When_calling_account_me_Then_an_account_is_provisioned()
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/account/me");
        request.Headers.Add("X-Test-Oid", "integration-oid-1");
        request.Headers.Add("X-Test-Name", "Integration Keeper");
        request.Headers.Add("X-Test-Email", "integration.keeper@example.com");

        var response = await client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var account = await response.Content.ReadFromJsonAsync<AccountResponse>();
        Assert.NotNull(account);
        Assert.Equal("Integration Keeper", account!.DisplayName);
    }

    [Fact]
    public async Task Given_an_existing_account_When_calling_account_me_again_Then_no_duplicate_is_created()
    {
        var client = _factory.CreateClient();

        HttpRequestMessage BuildRequest(string name) =>
            new(HttpMethod.Get, "/api/account/me")
            {
                Headers =
                {
                    { "X-Test-Oid", "integration-oid-2" },
                    { "X-Test-Name", name },
                    { "X-Test-Email", "integration.player@example.com" },
                },
            };

        var first = await client.SendAsync(BuildRequest("First Name"));
        first.EnsureSuccessStatusCode();
        var second = await client.SendAsync(BuildRequest("Second Name"));
        second.EnsureSuccessStatusCode();

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var matching = await dbContext.Accounts.Where(a => a.EntraObjectId == "integration-oid-2").ToListAsync();

        Assert.Single(matching);
        Assert.Equal("Second Name", matching[0].DisplayName);
    }

    [Fact]
    public async Task Given_an_existing_account_When_signing_in_with_the_entra_placeholder_name_Then_the_stored_name_is_kept()
    {
        var client = _factory.CreateClient();
        (await client.SendAsync(MeRequest("integration-oid-3", "Real Name"))).EnsureSuccessStatusCode();

        var response = await client.SendAsync(MeRequest("integration-oid-3", "unknown"));

        response.EnsureSuccessStatusCode();
        var account = await response.Content.ReadFromJsonAsync<AccountResponse>();
        Assert.Equal("Real Name", account!.DisplayName);
    }

    [Fact]
    public async Task Given_an_existing_account_When_calling_a_campaign_play_endpoint_Then_the_account_snapshot_is_not_refreshed()
    {
        var client = _factory.CreateClient();
        (await client.SendAsync(MeRequest("integration-oid-4", "Real Name"))).EnsureSuccessStatusCode();

        await CampaignPlayApiRequests.CreateCampaignAsync(client, "integration-oid-4");

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var account = await dbContext.Accounts.SingleAsync(a => a.EntraObjectId == "integration-oid-4");
        Assert.Equal("Real Name", account.DisplayName);
    }

    private static HttpRequestMessage MeRequest(string oid, string name) =>
        new(HttpMethod.Get, "/api/account/me")
        {
            Headers =
            {
                { "X-Test-Oid", oid },
                { "X-Test-Name", name },
                { "X-Test-Email", $"{oid}@example.com" },
            },
        };
}
