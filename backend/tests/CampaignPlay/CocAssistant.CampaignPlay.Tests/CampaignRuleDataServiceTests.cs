namespace CocAssistant.CampaignPlay.Tests;

/// <summary>Campaign members read the rule data for their Campaign's Era; everyone else sees nothing.</summary>
public class CampaignRuleDataServiceTests : IDisposable
{
    private readonly SqliteCampaignPlayDbContextFixture _fixture = new();
    private readonly FakeTimeProvider _timeProvider = new(new DateTimeOffset(2026, 10, 2, 12, 0, 0, TimeSpan.Zero));

    private static readonly Guid KeeperAccountId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid PlayerAccountId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid StrangerAccountId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private static readonly OccupationCatalog Occupations1920s = new(
        Era.The1920s,
        new Dictionary<string, IReadOnlyList<OccupationSkillSlot>>(),
        [new Occupation("antiquarian", "Antiquarian", 30, 70, new OccupationPointFormula([]), [])]);

    private sealed class StubEraRuleData(Era era, OccupationCatalog occupations) : IEraRuleData
    {
        public Era Era { get; } = era;

        public OccupationCatalog Occupations { get; } = occupations;

        public SkillCatalog Skills { get; } = new(era, [new SkillDefinition(new SkillReference("Accounting"), SkillBase.Fixed(5))]);

        public WealthTable Wealth { get; } = new(era, "USD", []);
    }

    private async Task<Guid> CreateCampaignWithPlayerAsync()
    {
        using var context = _fixture.CreateContext();
        var campaigns = new CampaignService(_fixture.CreateRepository(context), _timeProvider);
        var campaign = await campaigns.CreateCampaignAsync("The Haunting", KeeperAccountId, null, null, null, CancellationToken.None);
        var membership = new CampaignMembershipService(_fixture.CreateRepository(context), _timeProvider);
        var invite = await membership.IssueInviteAsync(campaign.Id, KeeperAccountId, CancellationToken.None);
        await membership.JoinAsync(invite!.Token, PlayerAccountId, CancellationToken.None);
        return campaign.Id;
    }

    private async Task<OccupationCatalog?> GetOccupationsAsync(Guid campaignId, Guid accountId)
    {
        using var context = _fixture.CreateContext();
        var service = new CampaignRuleDataService(
            _fixture.CreateRepository(context),
            new CreationRuleSets(TestRules.Creation, [new StubEraRuleData(Era.The1920s, Occupations1920s)]));
        return await service.GetOccupationsAsync(campaignId, accountId, CancellationToken.None);
    }

    [Theory]
    [InlineData("11111111-1111-1111-1111-111111111111")]
    [InlineData("22222222-2222-2222-2222-222222222222")]
    public async Task Given_a_campaign_member_When_reading_occupations_Then_the_catalog_for_the_campaign_era_is_returned(string accountId)
    {
        var campaignId = await CreateCampaignWithPlayerAsync();

        var catalog = await GetOccupationsAsync(campaignId, Guid.Parse(accountId));

        Assert.Same(Occupations1920s, catalog);
    }

    [Fact]
    public async Task Given_a_non_member_When_reading_occupations_Then_nothing_is_returned()
    {
        var campaignId = await CreateCampaignWithPlayerAsync();

        Assert.Null(await GetOccupationsAsync(campaignId, StrangerAccountId));
    }

    [Fact]
    public async Task Given_an_unknown_campaign_When_reading_occupations_Then_nothing_is_returned()
    {
        Assert.Null(await GetOccupationsAsync(Guid.NewGuid(), KeeperAccountId));
    }

    [Fact]
    public async Task Given_no_rule_data_for_the_campaign_era_When_reading_occupations_Then_it_fails_loudly()
    {
        var campaignId = await CreateCampaignWithPlayerAsync();
        using var context = _fixture.CreateContext();
        var service = new CampaignRuleDataService(_fixture.CreateRepository(context), new CreationRuleSets(TestRules.Creation, []));

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.GetOccupationsAsync(campaignId, KeeperAccountId, CancellationToken.None));
    }

    public void Dispose() => _fixture.Dispose();
}
