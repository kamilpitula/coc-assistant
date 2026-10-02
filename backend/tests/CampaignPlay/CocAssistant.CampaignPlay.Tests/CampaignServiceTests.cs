namespace CocAssistant.CampaignPlay.Tests;

public class CampaignServiceTests : IDisposable
{
    private readonly SqliteCampaignPlayDbContextFixture _fixture = new();
    private readonly FakeTimeProvider _timeProvider = new(new DateTimeOffset(2026, 9, 22, 12, 0, 0, TimeSpan.Zero));

    private static readonly Guid KeeperAccountId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    [Fact]
    public async Task Given_an_authenticated_account_When_creating_a_campaign_Then_it_is_persisted_with_that_keeper()
    {
        using var dbContext = _fixture.CreateContext();
        var service = new CampaignService(_fixture.CreateRepository(dbContext), _timeProvider);

        var campaign = await service.CreateCampaignAsync("The Haunting", KeeperAccountId, null, CancellationToken.None);

        Assert.Equal("The Haunting", campaign.Name);
        Assert.Equal(KeeperAccountId, campaign.KeeperAccountId);
        Assert.Equal(_timeProvider.GetUtcNow(), campaign.CreatedAt);

        using var verifyContext = _fixture.CreateContext();
        var stored = await verifyContext.Campaigns.SingleAsync(c => c.Id == campaign.Id);
        Assert.Equal(KeeperAccountId, stored.KeeperAccountId);
    }

    [Fact]
    public async Task Given_a_configured_player_limit_When_creating_a_campaign_Then_the_limit_is_persisted()
    {
        Guid campaignId;
        using (var dbContext = _fixture.CreateContext())
        {
            var service = new CampaignService(_fixture.CreateRepository(dbContext), _timeProvider);
            campaignId = (await service.CreateCampaignAsync("The Haunting", KeeperAccountId, 3, CancellationToken.None)).Id;
        }

        using var verifyContext = _fixture.CreateContext();
        var stored = await verifyContext.Campaigns.SingleAsync(c => c.Id == campaignId);
        Assert.Equal(3, stored.PlayerLimit);
    }

    [Fact]
    public async Task Given_no_player_limit_When_creating_a_campaign_Then_the_default_of_eight_is_persisted()
    {
        Guid campaignId;
        using (var dbContext = _fixture.CreateContext())
        {
            var service = new CampaignService(_fixture.CreateRepository(dbContext), _timeProvider);
            campaignId = (await service.CreateCampaignAsync("The Haunting", KeeperAccountId, null, CancellationToken.None)).Id;
        }

        using var verifyContext = _fixture.CreateContext();
        var stored = await verifyContext.Campaigns.SingleAsync(c => c.Id == campaignId);
        Assert.Equal(8, stored.PlayerLimit);
    }

    [Fact]
    public async Task Given_a_campaign_When_its_keeper_requests_it_Then_the_campaign_is_returned()
    {
        Guid campaignId;
        using (var createContext = _fixture.CreateContext())
        {
            var createService = new CampaignService(_fixture.CreateRepository(createContext), _timeProvider);
            campaignId = (await createService.CreateCampaignAsync("The Haunting", KeeperAccountId, null, CancellationToken.None)).Id;
        }

        using var readContext = _fixture.CreateContext();
        var service = new CampaignService(_fixture.CreateRepository(readContext), _timeProvider);

        var campaign = await service.GetForKeeperAsync(campaignId, KeeperAccountId, CancellationToken.None);

        Assert.NotNull(campaign);
        Assert.Equal(campaignId, campaign!.Id);
    }

    [Fact]
    public async Task Given_a_campaign_When_an_unrelated_account_requests_it_Then_nothing_is_returned()
    {
        Guid campaignId;
        using (var createContext = _fixture.CreateContext())
        {
            var createService = new CampaignService(_fixture.CreateRepository(createContext), _timeProvider);
            campaignId = (await createService.CreateCampaignAsync("The Haunting", KeeperAccountId, null, CancellationToken.None)).Id;
        }

        using var readContext = _fixture.CreateContext();
        var service = new CampaignService(_fixture.CreateRepository(readContext), _timeProvider);
        var unrelatedAccountId = Guid.Parse("22222222-2222-2222-2222-222222222222");

        var campaign = await service.GetForKeeperAsync(campaignId, unrelatedAccountId, CancellationToken.None);

        Assert.Null(campaign);
    }

    public void Dispose() => _fixture.Dispose();
}
