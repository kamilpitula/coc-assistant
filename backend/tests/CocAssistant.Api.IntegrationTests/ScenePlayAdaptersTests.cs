namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// Scene Play's consumer-owned ports, resolved from the assembled application and backed by Campaign Play and Scenario Preparation
/// (ADR 0008, ADR 0024): roles, Approved Investigators, the Public Wall Entry, and the outcome mapping onto the Scene lifecycle.
/// </summary>
public class ScenePlayAdaptersTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public ScenePlayAdaptersTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private static async Task<Guid> AccountIdAsync(HttpClient client, string oid)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, "/api/account/me", oid));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    [Fact]
    public async Task Given_a_campaign_with_a_player_When_asking_for_roles_Then_the_keeper_player_and_strangers_are_told_apart()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "spl-roles-keeper");
        await JoinAsPlayerAsync(client, campaign.Id, "spl-roles-keeper", "spl-roles-player");
        var playerAccountId = await AccountIdAsync(client, "spl-roles-player");

        using var scope = _factory.Services.CreateScope();
        var roles = scope.ServiceProvider.GetRequiredService<ICampaignRoles>();

        Assert.Equal(CampaignMemberRole.Keeper, await roles.RoleOfAsync(campaign.Id, campaign.KeeperAccountId, CancellationToken.None));
        Assert.Equal(CampaignMemberRole.Player, await roles.RoleOfAsync(campaign.Id, playerAccountId, CancellationToken.None));
        Assert.Null(await roles.RoleOfAsync(campaign.Id, Guid.NewGuid(), CancellationToken.None));
        Assert.Null(await roles.RoleOfAsync(Guid.NewGuid(), campaign.KeeperAccountId, CancellationToken.None));
    }

    [Fact]
    public async Task Given_a_submitted_and_an_approved_investigator_When_listing_approved_Then_only_the_approved_one_is_returned_with_its_player()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "spl-approved-keeper");
        await JoinAsPlayerAsync(client, campaign.Id, "spl-approved-keeper", "spl-approved-one");
        await JoinAsPlayerAsync(client, campaign.Id, "spl-approved-keeper", "spl-approved-two");
        var approved = await CreateApprovedAsync(client, campaign.Id, "spl-approved-keeper", "spl-approved-one", "Harvey Walters");
        await CreateSubmittedAsync(client, campaign.Id, "spl-approved-two", "Lucy Ward");

        using var scope = _factory.Services.CreateScope();
        var listed = await scope.ServiceProvider.GetRequiredService<IApprovedInvestigators>().ListAsync(campaign.Id, CancellationToken.None);

        var only = Assert.Single(listed);
        Assert.Equal((approved, await AccountIdAsync(client, "spl-approved-one"), "Harvey Walters"), (only.InvestigatorId, only.PlayerAccountId, only.Name));
    }

    [Fact]
    public async Task Given_the_keeper_When_adding_a_public_wall_entry_Then_players_see_it_and_a_non_member_author_is_refused()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "spl-wall-keeper");
        await JoinAsPlayerAsync(client, campaign.Id, "spl-wall-keeper", "spl-wall-player");

        using (var scope = _factory.Services.CreateScope())
        {
            var wall = scope.ServiceProvider.GetRequiredService<ISceneWallEntries>();
            await wall.AddPublicAsync(campaign.Id, campaign.KeeperAccountId, "Scene started: The Corbitt House", CancellationToken.None);
            await Assert.ThrowsAsync<InvalidOperationException>(() => wall.AddPublicAsync(campaign.Id, Guid.NewGuid(), "Scene started: X", CancellationToken.None));
        }

        var listing = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaign.Id}/wall-entries", "spl-wall-player"));
        var entries = (await listing.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("entries").EnumerateArray().ToList();
        var entry = Assert.Single(entries);
        Assert.Equal(("Scene started: The Corbitt House", "Public"), (entry.GetProperty("text").GetString(), entry.GetProperty("visibility").GetString()));
    }

    [Fact]
    public void Given_the_Scene_lifecycle_outcomes_When_mapping_by_name_Then_every_member_has_a_Scene_Play_counterpart()
    {
        Assert.Empty(Enum.GetNames<SceneStartOutcome>().Except(Enum.GetNames<StartSceneOutcome>()));
        Assert.Empty(Enum.GetNames<SceneFinishOutcome>().Except(Enum.GetNames<FinishSceneOutcome>()));
        Assert.Empty(Enum.GetNames<InvestigatorsPresentOutcome>().Except(Enum.GetNames<ChangePresentOutcome>()));
    }
}
