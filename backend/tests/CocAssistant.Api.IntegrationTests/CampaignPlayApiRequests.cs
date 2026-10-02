namespace CocAssistant.Api.IntegrationTests;

/// <summary>Shared request builders and use-case helpers for the CampaignPlay integration tests.</summary>
public static class CampaignPlayApiRequests
{
    /// <summary>Builds a request authenticated as the Account with the given oid; its display name is "Account {oid}".</summary>
    public static HttpRequestMessage BuildRequest(HttpMethod method, string uri, string oid, object? body = null) =>
        new(method, uri)
        {
            Headers =
            {
                { "X-Test-Oid", oid },
                { "X-Test-Name", DisplayNameFor(oid) },
                { "X-Test-Email", $"{oid}@example.com" },
            },
            Content = body is null ? null : JsonContent.Create(body),
        };

    /// <summary>The display name the test authentication handler gives the Account with this oid.</summary>
    public static string DisplayNameFor(string oid) => $"Account {oid}";

    /// <summary>Creates a Campaign as the Keeper with the given oid and returns it.</summary>
    public static async Task<CampaignResponse> CreateCampaignAsync(HttpClient client, string keeperOid, object? body = null)
    {
        var response = await client.SendAsync(
            BuildRequest(HttpMethod.Post, "/api/campaigns", keeperOid, body ?? new { name = "The Haunting" }));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CampaignResponse>())!;
    }

    /// <summary>Issues an Invite as the Keeper and joins the Campaign through it as the Player.</summary>
    public static async Task JoinAsPlayerAsync(HttpClient client, Guid campaignId, string keeperOid, string playerOid)
    {
        var inviteResponse = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/invite", keeperOid));
        inviteResponse.EnsureSuccessStatusCode();
        var invite = await inviteResponse.Content.ReadFromJsonAsync<InviteResponse>();
        var joinResponse = await client.SendAsync(BuildRequest(HttpMethod.Post, "/api/campaigns/join", playerOid, new { token = invite!.Token }));
        joinResponse.EnsureSuccessStatusCode();
    }

    /// <summary>Migrates the test database and deletes all rows, keeping the migration history.</summary>
    public static async Task ResetDatabaseAsync(IdentityApiFactory factory)
    {
        await factory.EnsureDatabaseCreatedAsync();

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CampaignPlayDbContext>();
        var connection = dbContext.Database.GetDbConnection();
        await connection.OpenAsync();
        var respawner = await Respawner.CreateAsync(connection, new RespawnerOptions
        {
            DbAdapter = DbAdapter.SqlServer,
            TablesToIgnore = ["__EFMigrationsHistory", "__CampaignPlayMigrationsHistory"],
        });
        await respawner.ResetAsync(connection);
    }
}
