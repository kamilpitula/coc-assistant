namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The CampaignPlay port for Account display names, resolved from the assembled application and backed by
/// Identity (ADR 0008).
/// </summary>
public class AccountDisplayNamesAdapterTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public AccountDisplayNamesAdapterTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Given_a_provisioned_account_When_campaign_play_reads_its_display_name_Then_the_identity_name_is_returned()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "names-keeper-1");

        using var scope = _factory.Services.CreateScope();
        var displayNames = scope.ServiceProvider.GetRequiredService<IAccountDisplayNames>();
        var names = await displayNames.GetDisplayNamesAsync([campaign.KeeperAccountId, Guid.NewGuid()], CancellationToken.None);

        Assert.Equal(DisplayNameFor("names-keeper-1"), Assert.Single(names).Value);
    }
}
