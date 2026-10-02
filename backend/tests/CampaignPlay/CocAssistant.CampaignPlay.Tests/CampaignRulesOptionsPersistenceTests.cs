namespace CocAssistant.CampaignPlay.Tests;

public class CampaignRulesOptionsPersistenceTests : IDisposable
{
    private readonly SqliteCampaignPlayDbContextFixture _fixture = new();

    private static readonly Guid KeeperAccountId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset CreatedAt = new(2026, 10, 2, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Given_a_campaign_with_chosen_rules_options_When_it_is_saved_and_reloaded_Then_the_era_and_methods_are_kept()
    {
        var methods = AllowedCreationMethods.Create([CreationMethod.QuickFire, CreationMethod.StandardRolling]);
        var campaign = new Campaign("The Haunting", KeeperAccountId, CreatedAt, era: Era.The1920s, allowedCreationMethods: methods);
        using (var dbContext = _fixture.CreateContext())
        {
            dbContext.Campaigns.Add(campaign);
            await dbContext.SaveChangesAsync();
        }

        using var verifyContext = _fixture.CreateContext();
        var stored = await verifyContext.Campaigns.SingleAsync(c => c.Id == campaign.Id);

        Assert.Equal(Era.The1920s, stored.Era);
        Assert.Equal(methods, stored.AllowedCreationMethods);
    }

    [Fact]
    public async Task Given_a_stored_campaign_When_its_allowed_creation_methods_change_Then_the_change_is_persisted()
    {
        var campaign = new Campaign("The Haunting", KeeperAccountId, CreatedAt);
        using (var dbContext = _fixture.CreateContext())
        {
            dbContext.Campaigns.Add(campaign);
            await dbContext.SaveChangesAsync();
        }

        var pointBuyOnly = AllowedCreationMethods.Create([CreationMethod.PointBuy]);
        using (var dbContext = _fixture.CreateContext())
        {
            var loaded = await dbContext.Campaigns.SingleAsync(c => c.Id == campaign.Id);
            loaded.ChangeAllowedCreationMethods(pointBuyOnly);
            await dbContext.SaveChangesAsync();
        }

        using var verifyContext = _fixture.CreateContext();
        var stored = await verifyContext.Campaigns.SingleAsync(c => c.Id == campaign.Id);
        Assert.Equal(pointBuyOnly, stored.AllowedCreationMethods);
    }

    public void Dispose() => _fixture.Dispose();
}
