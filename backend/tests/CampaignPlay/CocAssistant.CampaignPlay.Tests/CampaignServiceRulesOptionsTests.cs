namespace CocAssistant.CampaignPlay.Tests;

/// <summary>Creating Campaigns with rules options and the Keeper-only change of allowed Creation Methods.</summary>
public class CampaignServiceRulesOptionsTests : IDisposable
{
    private readonly SqliteCampaignPlayDbContextFixture _fixture = new();
    private readonly FakeTimeProvider _timeProvider = new(new DateTimeOffset(2026, 10, 2, 12, 0, 0, TimeSpan.Zero));

    private static readonly Guid KeeperAccountId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid PlayerAccountId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static readonly AllowedCreationMethods PointBuyOnly = AllowedCreationMethods.Create([CreationMethod.PointBuy]);

    private async Task<Guid> CreateCampaignAsync(AllowedCreationMethods? allowedCreationMethods = null)
    {
        using var context = _fixture.CreateContext();
        var service = new CampaignService(_fixture.CreateRepository(context), _timeProvider);
        var campaign = await service.CreateCampaignAsync(
            "The Haunting", KeeperAccountId, null, null, allowedCreationMethods, CancellationToken.None);
        return campaign.Id;
    }

    private async Task<Campaign> LoadAsync(Guid campaignId)
    {
        using var context = _fixture.CreateContext();
        return await context.Campaigns.SingleAsync(campaign => campaign.Id == campaignId);
    }

    private async Task JoinAsPlayerInOwnContextAsync(Guid campaignId, Guid accountId)
    {
        using var context = _fixture.CreateContext();
        var membership = new CampaignMembershipService(_fixture.CreateRepository(context), _timeProvider);
        var invite = await membership.IssueInviteAsync(campaignId, KeeperAccountId, CancellationToken.None);
        await membership.JoinAsync(invite!.Token, accountId, CancellationToken.None);
    }

    [Fact]
    public async Task Given_no_rules_options_When_creating_a_campaign_Then_the_1920s_and_all_creation_methods_are_persisted()
    {
        var campaignId = await CreateCampaignAsync();

        var stored = await LoadAsync(campaignId);
        Assert.Equal(Era.The1920s, stored.Era);
        Assert.Equal(AllowedCreationMethods.All, stored.AllowedCreationMethods);
    }

    [Fact]
    public async Task Given_chosen_creation_methods_When_creating_a_campaign_Then_they_are_persisted()
    {
        var campaignId = await CreateCampaignAsync(PointBuyOnly);

        Assert.Equal(PointBuyOnly, (await LoadAsync(campaignId)).AllowedCreationMethods);
    }

    [Fact]
    public async Task Given_a_campaign_When_its_keeper_changes_the_allowed_creation_methods_Then_the_change_is_persisted()
    {
        var campaignId = await CreateCampaignAsync();
        using var context = _fixture.CreateContext();
        var service = new CampaignService(_fixture.CreateRepository(context), _timeProvider);

        var campaign = await service.ChangeAllowedCreationMethodsAsync(campaignId, KeeperAccountId, PointBuyOnly, CancellationToken.None);

        Assert.Equal(PointBuyOnly, campaign!.AllowedCreationMethods);
        Assert.Equal(PointBuyOnly, (await LoadAsync(campaignId)).AllowedCreationMethods);
    }

    [Fact]
    public async Task Given_a_player_When_changing_the_allowed_creation_methods_Then_nothing_is_returned_and_nothing_changes()
    {
        var campaignId = await CreateCampaignAsync();
        await JoinAsPlayerInOwnContextAsync(campaignId, PlayerAccountId);
        using var context = _fixture.CreateContext();
        var service = new CampaignService(_fixture.CreateRepository(context), _timeProvider);

        var campaign = await service.ChangeAllowedCreationMethodsAsync(campaignId, PlayerAccountId, PointBuyOnly, CancellationToken.None);

        Assert.Null(campaign);
        Assert.Equal(AllowedCreationMethods.All, (await LoadAsync(campaignId)).AllowedCreationMethods);
    }

    [Fact]
    public async Task Given_an_unknown_campaign_When_changing_the_allowed_creation_methods_Then_nothing_is_returned()
    {
        using var context = _fixture.CreateContext();
        var service = new CampaignService(_fixture.CreateRepository(context), _timeProvider);

        var campaign = await service.ChangeAllowedCreationMethodsAsync(Guid.NewGuid(), KeeperAccountId, PointBuyOnly, CancellationToken.None);

        Assert.Null(campaign);
    }

    [Fact]
    public async Task Given_a_player_joins_concurrently_When_the_keeper_changes_the_allowed_creation_methods_Then_both_changes_are_kept()
    {
        var campaignId = await CreateCampaignAsync();
        using var context = _fixture.CreateContext();
        var repository = new RacingCampaignRepository(
            _fixture.CreateRepository(context),
            () => JoinAsPlayerInOwnContextAsync(campaignId, PlayerAccountId));
        var service = new CampaignService(repository, _timeProvider);

        var campaign = await service.ChangeAllowedCreationMethodsAsync(campaignId, KeeperAccountId, PointBuyOnly, CancellationToken.None);

        Assert.Equal(PointBuyOnly, campaign!.AllowedCreationMethods);
        Assert.Equal(2, repository.SaveAttempts);
        using var verifyContext = _fixture.CreateContext();
        var stored = await verifyContext.Campaigns.Include(c => c.Players).SingleAsync(c => c.Id == campaignId);
        Assert.Equal(PointBuyOnly, stored.AllowedCreationMethods);
        Assert.Single(stored.Players);
    }

    public void Dispose() => _fixture.Dispose();
}
