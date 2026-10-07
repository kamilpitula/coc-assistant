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

    /// <summary>A valid Point Buy Character Sheet request body with the given Investigator name.</summary>
    public static object ValidCharacterSheet(string name) => new
    {
        identity = new { name, age = 25, gender = (string?)null, residence = "Boston", birthplace = (string?)null },
        creationMethod = "PointBuy",
        characteristics = new Dictionary<string, int?>
        {
            ["STR"] = 60,
            ["CON"] = 60,
            ["DEX"] = 60,
            ["APP"] = 50,
            ["POW"] = 60,
            ["SIZ"] = 60,
            ["INT"] = 60,
            ["EDU"] = 50,
        },
        ageEffects = new { deductions = new Dictionary<string, int?>(), eduImprovementChecks = new[] { new { check = (int?)30, gain = (int?)null } } },
        luckRolls = new int?[] { 11 },
        occupation = ValidAntiquarian,
        skills = ValidSkillAllocations,
    };

    /// <summary>The 1920s Antiquarian with a pick for every open skill slot (section 7.2).</summary>
    public static object ValidAntiquarian => new
    {
        catalogId = "antiquarian",
        formulaCharacteristics = Array.Empty<string?>(),
        skillChoices = new object[][]
        {
            [],
            [new { skill = "Art/Craft", specialization = "Painting" }],
            [],
            [],
            [new { skill = "Language (Other)", specialization = "Latin" }],
            [new { skill = "Charm", specialization = (string?)null }],
            [],
            [new { skill = "Firearms", specialization = "Handgun" }],
        },
    };

    /// <summary>All 200 occupation points (Credit Rating 30) and all 120 personal interest points for the valid sheet.</summary>
    public static object[] ValidSkillAllocations =>
    [
        new { skill = "Credit Rating", occupationPoints = 30 },
        new { skill = "Library Use", occupationPoints = 50 },
        new { skill = "Appraise", occupationPoints = 50 },
        new { skill = "History", occupationPoints = 50 },
        new { skill = "Spot Hidden", occupationPoints = 20 },
        new { skill = "Drive Auto", personalInterestPoints = 60 },
        new { skill = "Listen", personalInterestPoints = 60 },
    ];

    /// <summary>Creates the Player's Draft with a valid, named Character Sheet and returns the Investigator id.</summary>
    public static async Task<Guid> CreateNamedDraftAsync(HttpClient client, Guid campaignId, string playerOid, string name)
    {
        var investigators = $"/api/campaigns/{campaignId}/investigators";
        var created = await client.SendAsync(BuildRequest(HttpMethod.Post, investigators, playerOid));
        created.EnsureSuccessStatusCode();
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        (await client.SendAsync(BuildRequest(HttpMethod.Put, $"{investigators}/mine/character-sheet", playerOid, ValidCharacterSheet(name))))
            .EnsureSuccessStatusCode();
        return id;
    }

    /// <summary>Creates and submits the Player's named Investigator and returns its id.</summary>
    public static async Task<Guid> CreateSubmittedAsync(HttpClient client, Guid campaignId, string playerOid, string name)
    {
        var id = await CreateNamedDraftAsync(client, campaignId, playerOid, name);
        (await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/investigators/mine/submit", playerOid)))
            .EnsureSuccessStatusCode();
        return id;
    }

    /// <summary>Creates, submits, and approves (as the Keeper) the Player's named Investigator and returns its id.</summary>
    public static async Task<Guid> CreateApprovedAsync(HttpClient client, Guid campaignId, string keeperOid, string playerOid, string name)
    {
        var id = await CreateSubmittedAsync(client, campaignId, playerOid, name);
        (await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/investigators/{id}/approve", keeperOid)))
            .EnsureSuccessStatusCode();
        return id;
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
