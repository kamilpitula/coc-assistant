namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Campaign's Non-Player Entity list and the rule-data adapter behind NPC Profile validation
/// (specs/scenario-preparation/spec.md: Keeper finds a profile in the list).
/// </summary>
public class NonPlayerEntityListApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public NonPlayerEntityListApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private static string ListUri(Guid campaignId) => $"/api/campaigns/{campaignId}/non-player-entities";

    private static async Task CreateHumanNpcAsync(HttpClient client, Guid campaignId, string oid, string name)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/human-npcs", oid, new { name, age = 40 }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Given_human_npcs_in_two_campaigns_When_the_keeper_lists_Then_only_this_campaigns_come_back_as_id_type_and_name_ordered_by_name()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "list-keeper-1")).Id;
        var otherCampaignId = (await CreateCampaignAsync(client, "list-keeper-1")).Id;
        await CreateHumanNpcAsync(client, campaignId, "list-keeper-1", "Mr. Knott");
        await CreateHumanNpcAsync(client, campaignId, "list-keeper-1", "Desk sergeant");
        await CreateHumanNpcAsync(client, otherCampaignId, "list-keeper-1", "Elsewhere");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, ListUri(campaignId), "list-keeper-1"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = (await response.Content.ReadFromJsonAsync<NonPlayerEntityListResponse>())!.Items;
        Assert.Equal([("Desk sergeant", "HumanNpc"), ("Mr. Knott", "HumanNpc")], items.Select(item => (item.Name, item.Type)));
        Assert.All(items, item => Assert.NotEqual(Guid.Empty, item.Id));
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(["id", "name", "type"], document.RootElement.GetProperty("items")[0].EnumerateObject().Select(property => property.Name).Order());
    }

    [Fact]
    public async Task Given_human_npcs_and_mythos_creatures_When_the_keeper_lists_Then_both_types_come_back_ordered_by_name_then_id()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "list-keeper-4")).Id;
        var otherCampaignId = (await CreateCampaignAsync(client, "list-keeper-4")).Id;
        await CreateHumanNpcAsync(client, campaignId, "list-keeper-4", "Mr. Knott");
        await CreateHumanNpcAsync(client, campaignId, "list-keeper-4", "Ghoul");
        foreach (var (campaign, name) in new[] { (campaignId, "Ghoul"), (campaignId, "Deep One"), (otherCampaignId, "Elsewhere") })
        {
            var created = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaign}/mythos-creatures", "list-keeper-4", new { name }));
            Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        }

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, ListUri(campaignId), "list-keeper-4"));

        var items = (await response.Content.ReadFromJsonAsync<NonPlayerEntityListResponse>())!.Items;
        Assert.Equal(["Deep One", "Ghoul", "Ghoul", "Mr. Knott"], items.Select(item => item.Name));
        Assert.Equal(["HumanNpc", "MythosCreature"], items.Where(item => item.Name == "Ghoul").Select(item => item.Type).Order());
        Assert.Equal(4, items.Select(item => item.Id).Distinct().Count());
    }

    [Fact]
    public async Task Given_a_campaign_without_entities_When_the_keeper_lists_Then_the_items_are_empty()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "list-keeper-2")).Id;

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, ListUri(campaignId), "list-keeper-2"));

        Assert.Empty((await response.Content.ReadFromJsonAsync<NonPlayerEntityListResponse>())!.Items);
    }

    [Fact]
    public async Task Given_a_player_or_another_keeper_or_a_missing_campaign_When_listing_Then_the_answer_is_404()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "list-keeper-3")).Id;
        await JoinAsPlayerAsync(client, campaignId, "list-keeper-3", "list-player-3");
        await CreateHumanNpcAsync(client, campaignId, "list-keeper-3", "Mr. Knott");

        var player = await client.SendAsync(BuildRequest(HttpMethod.Get, ListUri(campaignId), "list-player-3"));
        var stranger = await client.SendAsync(BuildRequest(HttpMethod.Get, ListUri(campaignId), "list-stranger-3"));
        var missing = await client.SendAsync(BuildRequest(HttpMethod.Get, ListUri(Guid.NewGuid()), "list-keeper-3"));

        Assert.Equal([HttpStatusCode.NotFound, HttpStatusCode.NotFound, HttpStatusCode.NotFound], [player.StatusCode, stranger.StatusCode, missing.StatusCode]);
    }

    [Fact]
    public void Given_the_assembled_application_When_resolving_the_rule_data_port_Then_it_serves_the_catalog_specializations_and_damage_bonus_table()
    {
        using var scope = _factory.Services.CreateScope();

        var ruleData = scope.ServiceProvider.GetRequiredService<INonPlayerEntityRuleData>();

        Assert.Contains("Brawl", ruleData.CombatSkillSpecializations.Fighting);
        Assert.Contains("Handgun", ruleData.CombatSkillSpecializations.Firearms);
        Assert.DoesNotContain("Handgun", ruleData.CombatSkillSpecializations.Fighting);
        Assert.Equal("+1D4", ruleData.CharacteristicsRules.DamageBonusAndBuild.Single(band => band.Contains(135)).DamageBonus);
    }
}
