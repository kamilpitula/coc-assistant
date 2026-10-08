namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// Integration tests for Campaign rules options and the Era rule data endpoint
/// (specs/campaign-play/spec.md "Campaign rules options" and API Contracts).
/// </summary>
public class CampaignRulesOptionsApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private static readonly string[] AllCreationMethods = ["StandardRolling", "PointBuy", "QuickFire"];

    private readonly IdentityApiFactory _factory;

    public CampaignRulesOptionsApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private static Task<HttpResponseMessage> ChangeAllowedCreationMethodsAsync(
        HttpClient client, Guid campaignId, string oid, string[] allowedCreationMethods) =>
        client.SendAsync(BuildRequest(
            HttpMethod.Put,
            $"/api/campaigns/{campaignId}/allowed-creation-methods",
            oid,
            new { allowedCreationMethods }));

    private static async Task<CampaignResponse> GetAsKeeperAsync(HttpClient client, Guid campaignId, string keeperOid)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}", keeperOid));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CampaignResponse>())!;
    }

    // Scenario: Keeper creates a Campaign with default rules options
    [Fact]
    public async Task Given_no_rules_options_When_creating_a_campaign_Then_it_is_1920s_with_all_creation_methods()
    {
        var client = _factory.CreateClient();

        var created = await CreateCampaignAsync(client, "rules-keeper-1");

        Assert.Equal("1920s", created.Era);
        Assert.Equal(AllCreationMethods, created.AllowedCreationMethods);
        var stored = await GetAsKeeperAsync(client, created.Id, "rules-keeper-1");
        Assert.Equal("1920s", stored.Era);
        Assert.Equal(AllCreationMethods, stored.AllowedCreationMethods);
    }

    [Fact]
    public async Task Given_chosen_rules_options_When_creating_a_campaign_Then_they_are_returned()
    {
        var client = _factory.CreateClient();

        var created = await CreateCampaignAsync(
            client,
            "rules-keeper-2",
            new { name = "The Haunting", era = "1920s", allowedCreationMethods = new[] { "QuickFire", "PointBuy" } });

        Assert.Equal("1920s", created.Era);
        Assert.Equal(["PointBuy", "QuickFire"], created.AllowedCreationMethods);
    }

    [Theory]
    [InlineData("1890s", new[] { "PointBuy" })]
    [InlineData("1920s", new string[0])]
    [InlineData("1920s", new[] { "Freeform" })]
    [InlineData("1920s", new[] { "pointbuy" })]
    public async Task Given_invalid_rules_options_When_creating_a_campaign_Then_it_is_rejected(string era, string[] allowedCreationMethods)
    {
        var client = _factory.CreateClient();

        var response = await client.SendAsync(BuildRequest(
            HttpMethod.Post,
            "/api/campaigns",
            "rules-keeper-3",
            new { name = "The Haunting", era, allowedCreationMethods }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_keeper_When_changing_the_allowed_creation_methods_Then_they_are_replaced()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "rules-keeper-4");

        var response = await ChangeAllowedCreationMethodsAsync(client, campaign.Id, "rules-keeper-4", ["PointBuy"]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var changed = await response.Content.ReadFromJsonAsync<CampaignResponse>();
        Assert.Equal(["PointBuy"], changed!.AllowedCreationMethods);
        var stored = await GetAsKeeperAsync(client, campaign.Id, "rules-keeper-4");
        Assert.Equal(["PointBuy"], stored.AllowedCreationMethods);
        Assert.Equal("1920s", stored.Era);
    }

    [Fact]
    public async Task Given_a_keeper_When_removing_every_creation_method_Then_it_is_rejected_and_nothing_changes()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "rules-keeper-5");

        var response = await ChangeAllowedCreationMethodsAsync(client, campaign.Id, "rules-keeper-5", []);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(AllCreationMethods, (await GetAsKeeperAsync(client, campaign.Id, "rules-keeper-5")).AllowedCreationMethods);
    }

    // Regression Guardrail: A Player cannot perform Keeper actions through a Player-authorized operation.
    [Fact]
    public async Task Given_a_player_When_changing_the_allowed_creation_methods_Then_the_campaign_is_not_found_and_nothing_changes()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "rules-keeper-6");
        await JoinAsPlayerAsync(client, campaign.Id, "rules-keeper-6", "rules-player-6");

        var response = await ChangeAllowedCreationMethodsAsync(client, campaign.Id, "rules-player-6", ["PointBuy"]);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(AllCreationMethods, (await GetAsKeeperAsync(client, campaign.Id, "rules-keeper-6")).AllowedCreationMethods);
    }

    [Fact]
    public async Task Given_a_non_member_When_changing_the_allowed_creation_methods_Then_the_campaign_is_not_found()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "rules-keeper-7");

        var response = await ChangeAllowedCreationMethodsAsync(client, campaign.Id, "rules-stranger-7", ["PointBuy"]);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("rules-keeper-8")]
    [InlineData("rules-player-8")]
    public async Task Given_a_campaign_member_When_reading_occupations_Then_the_1920s_catalog_is_returned(string callerOid)
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "rules-keeper-8");
        await JoinAsPlayerAsync(client, campaign.Id, "rules-keeper-8", "rules-player-8");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaign.Id}/rules/occupations", callerOid));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var catalog = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("1920s", catalog.RootElement.GetProperty("era").GetString());
        var antiquarian = catalog.RootElement.GetProperty("occupations").EnumerateArray()
            .Single(occupation => occupation.GetProperty("id").GetString() == "antiquarian");
        Assert.Equal("Antiquarian", antiquarian.GetProperty("name").GetString());
        Assert.Equal("group", antiquarian.GetProperty("skillSlots")[5].GetProperty("kind").GetString());
        Assert.Equal(4, catalog.RootElement.GetProperty("skillGroups").GetProperty("interpersonal").GetArrayLength());
    }

    [Fact]
    public async Task Given_a_non_member_When_reading_occupations_Then_the_campaign_is_not_found()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "rules-keeper-9");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaign.Id}/rules/occupations", "rules-stranger-9"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_an_unknown_campaign_When_reading_occupations_Then_it_is_not_found()
    {
        var client = _factory.CreateClient();

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{Guid.NewGuid()}/rules/occupations", "rules-keeper-10"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_campaign_player_When_reading_skills_Then_the_1920s_skills_specializations_and_suggestions_are_returned()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "rules-keeper-11");
        await JoinAsPlayerAsync(client, campaign.Id, "rules-keeper-11", "rules-player-11");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaign.Id}/rules/skills", "rules-player-11"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var skills = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = skills.RootElement;
        Assert.Equal("1920s", root.GetProperty("era").GetString());
        var dodge = root.GetProperty("skills").EnumerateArray().Single(skill => skill.GetProperty("skill").GetString() == "Dodge");
        Assert.Equal(("characteristic", "DEX", 2), (dodge.GetProperty("base").GetProperty("kind").GetString(), dodge.GetProperty("base").GetProperty("characteristic").GetString(), dodge.GetProperty("base").GetProperty("divisor").GetInt32()));
        var firearms = root.GetProperty("closedFamilies").EnumerateArray().Single(family => family.GetProperty("skill").GetString() == "Firearms");
        Assert.Contains(firearms.GetProperty("specializations").EnumerateArray(), specialization => specialization.GetProperty("specialization").GetString() == "Bow");
        Assert.Contains("Art/Craft", root.GetProperty("openFamilies").EnumerateArray().Select(family => family.GetString()));
        Assert.Contains("Photography", root.GetProperty("specializationSuggestions").GetProperty("Art/Craft").EnumerateArray().Select(suggestion => suggestion.GetString()));
    }

    [Fact]
    public async Task Given_a_non_member_When_reading_skills_Then_the_campaign_is_not_found()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "rules-keeper-12");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaign.Id}/rules/skills", "rules-stranger-12"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public void Given_the_assembled_application_When_resolving_rule_data_Then_every_supported_era_has_rule_data()
    {
        using var scope = _factory.Services.CreateScope();
        var ruleData = scope.ServiceProvider.GetServices<IEraRuleData>();

        Assert.Equal(Era.Supported, ruleData.Select(data => data.Era));
    }
}
