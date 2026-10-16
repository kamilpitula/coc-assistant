namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// Scenario Preparation's ownership port, resolved from the assembled application and backed by Campaign Play
/// (ADR 0013): only the Campaign's Keeper is a Keeper.
/// </summary>
public class CampaignKeepersAdapterTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public CampaignKeepersAdapterTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Given_a_campaign_with_a_player_When_asking_who_is_the_keeper_Then_only_the_keeper_is()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "keepers-keeper-1");
        await JoinAsPlayerAsync(client, campaign.Id, "keepers-keeper-1", "keepers-player-1");
        var playerAccountId = await AccountIdAsync(client, "keepers-player-1");

        using var scope = _factory.Services.CreateScope();
        var keepers = scope.ServiceProvider.GetRequiredService<ICampaignKeepers>();

        Assert.True(await keepers.IsKeeperAsync(campaign.Id, campaign.KeeperAccountId, CancellationToken.None));
        Assert.False(await keepers.IsKeeperAsync(campaign.Id, playerAccountId, CancellationToken.None));
        Assert.False(await keepers.IsKeeperAsync(campaign.Id, Guid.NewGuid(), CancellationToken.None));
        Assert.False(await keepers.IsKeeperAsync(Guid.NewGuid(), campaign.KeeperAccountId, CancellationToken.None));
    }

    private static async Task<Guid> AccountIdAsync(HttpClient client, string oid)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, "/api/account/me", oid));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }
}
