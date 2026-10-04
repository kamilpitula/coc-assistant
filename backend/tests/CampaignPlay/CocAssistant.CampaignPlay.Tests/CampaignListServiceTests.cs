namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// The caller's Campaign List (specs/campaign-list/spec.md, Sections, Item content by role, API, Projection):
/// Keeper Campaigns newest created first, then Player Campaigns newest joined first, each projected for its role.
/// </summary>
public class CampaignListServiceTests : IDisposable
{
    private static readonly Guid FourthPlayerAccountId = Guid.Parse("55555555-5555-5555-5555-555555555555");
    private static readonly Guid UnnamedKeeperAccountId = Guid.Parse("66666666-6666-6666-6666-666666666666");

    private readonly CampaignPlayScenario _scenario = new();
    private readonly InMemoryAccountDisplayNames _displayNames = new();

    private async Task<IReadOnlyList<CampaignListItem>> ListAsync(Guid callerAccountId)
    {
        using var context = _scenario.Fixture.CreateContext();
        var service = new CampaignListService(
            _scenario.Fixture.CreateRepository(context),
            _scenario.Fixture.CreateInvestigatorRepository(context),
            _displayNames);
        return await service.ListAsync(callerAccountId, CancellationToken.None);
    }

    private async Task<Guid> CreateCampaignLaterAsync(Guid? keeperAccountId = null)
    {
        _scenario.TimeProvider.Advance(TimeSpan.FromMinutes(1));
        return await _scenario.CreateCampaignAsync(keeperAccountId: keeperAccountId);
    }

    private async Task JoinLaterAsync(Guid campaignId, Guid playerAccountId, Guid? keeperAccountId = null)
    {
        _scenario.TimeProvider.Advance(TimeSpan.FromMinutes(1));
        await _scenario.JoinAsPlayerAsync(campaignId, playerAccountId, keeperAccountId);
    }

    [Fact]
    public async Task Given_an_account_without_campaigns_When_listing_Then_the_list_is_empty()
    {
        await _scenario.CreateCampaignAsync();

        var items = await ListAsync(CampaignPlayScenario.StrangerAccountId);

        Assert.Empty(items);
    }

    [Fact]
    public async Task Given_a_keeper_campaign_with_approved_submitted_and_draft_investigators_When_the_keeper_lists_Then_the_item_counts_players_approved_and_awaiting_review()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId);
        await _scenario.JoinAsPlayerAsync(campaignId, FourthPlayerAccountId);
        var approvedId = await _scenario.CreateSubmittedAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.ApproveAsync(campaignId, approvedId);
        await _scenario.CreateSubmittedAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId);
        await _scenario.CreateDraftAsync(campaignId, FourthPlayerAccountId);

        var items = await ListAsync(CampaignPlayScenario.KeeperAccountId);

        var item = Assert.IsType<KeeperCampaignListItem>(Assert.Single(items));
        Assert.Equal(new KeeperCampaignListItem(campaignId, "The Haunting", Era.The1920s, 3, 8, 1, 1), item);
    }

    [Fact]
    public async Task Given_a_player_with_changes_requested_When_the_player_lists_Then_the_item_shows_the_keeper_name_and_own_investigator()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        var investigatorId = await _scenario.CreateSubmittedAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.RequestChangesAsync(campaignId, investigatorId, "Check your skills.");

        var items = await ListAsync(CampaignPlayScenario.PlayerAccountId);

        var item = Assert.IsType<PlayerCampaignListItem>(Assert.Single(items));
        Assert.Equal(
            new PlayerCampaignListItem(
                campaignId,
                "The Haunting",
                Era.The1920s,
                "Kate Keeper",
                1,
                0,
                new OwnInvestigator(InvestigatorStatus.ChangesRequested, "Harvey Walters")),
            item);
    }

    [Fact]
    public async Task Given_another_player_with_a_submitted_investigator_and_none_approved_When_a_player_lists_Then_no_count_reveals_it()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId);
        await _scenario.CreateSubmittedAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId);

        var items = await ListAsync(CampaignPlayScenario.PlayerAccountId);

        var item = Assert.IsType<PlayerCampaignListItem>(Assert.Single(items));
        Assert.Equal(2, item.PlayerCount);
        Assert.Equal(0, item.ApprovedInvestigatorCount);
        Assert.Null(item.MyInvestigator);
    }

    [Fact]
    public async Task Given_approved_investigators_of_other_players_When_a_player_lists_Then_they_are_counted()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId);
        await _scenario.ApproveAsync(campaignId, await _scenario.CreateSubmittedAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId));

        var items = await ListAsync(CampaignPlayScenario.PlayerAccountId);

        Assert.Equal(1, Assert.IsType<PlayerCampaignListItem>(Assert.Single(items)).ApprovedInvestigatorCount);
    }

    [Fact]
    public async Task Given_a_player_with_an_unnamed_draft_When_the_player_lists_Then_the_own_investigator_has_no_name()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.CreateDraftAsync(campaignId, CampaignPlayScenario.PlayerAccountId);

        var items = await ListAsync(CampaignPlayScenario.PlayerAccountId);

        var item = Assert.IsType<PlayerCampaignListItem>(Assert.Single(items));
        Assert.Equal(new OwnInvestigator(InvestigatorStatus.Draft, null), item.MyInvestigator);
    }

    [Fact]
    public async Task Given_campaigns_the_account_is_not_a_member_of_When_listing_Then_they_are_not_listed()
    {
        var ownCampaignId = await _scenario.CreateCampaignAsync();
        var otherCampaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(otherCampaignId, CampaignPlayScenario.OtherPlayerAccountId);
        await _scenario.JoinAsPlayerAsync(ownCampaignId, CampaignPlayScenario.PlayerAccountId);

        var items = await ListAsync(CampaignPlayScenario.PlayerAccountId);

        Assert.Equal([ownCampaignId], items.Select(item => item.Id));
    }

    [Fact]
    public async Task Given_kept_and_joined_campaigns_When_listing_Then_kept_come_first_newest_created_then_joined_newest_joined()
    {
        var caller = CampaignPlayScenario.PlayerAccountId;
        var joinedEarlierCreatedLater = await CreateCampaignLaterAsync();
        var joinedLaterCreatedEarlier = await CreateCampaignLaterAsync(CampaignPlayScenario.OtherPlayerAccountId);
        var keptOlder = await CreateCampaignLaterAsync(caller);
        var keptNewer = await CreateCampaignLaterAsync(caller);
        await JoinLaterAsync(joinedEarlierCreatedLater, caller);
        await JoinLaterAsync(joinedLaterCreatedEarlier, caller, CampaignPlayScenario.OtherPlayerAccountId);

        var items = await ListAsync(caller);

        Assert.Equal([keptNewer, keptOlder, joinedLaterCreatedEarlier, joinedEarlierCreatedLater], items.Select(item => item.Id));
    }

    [Fact]
    public async Task Given_kept_campaigns_created_at_the_same_moment_When_listing_Then_they_are_ordered_by_id()
    {
        var first = await _scenario.CreateCampaignAsync();
        var second = await _scenario.CreateCampaignAsync();

        var items = await ListAsync(CampaignPlayScenario.KeeperAccountId);

        Assert.Equal(new[] { first, second }.Order(), items.Select(item => item.Id));
    }

    [Fact]
    public async Task Given_a_keeper_without_a_display_name_When_a_player_lists_Then_the_keeper_name_is_empty()
    {
        var campaignId = await _scenario.CreateCampaignAsync(keeperAccountId: UnnamedKeeperAccountId);
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId, UnnamedKeeperAccountId);

        var items = await ListAsync(CampaignPlayScenario.PlayerAccountId);

        Assert.Equal(string.Empty, Assert.IsType<PlayerCampaignListItem>(Assert.Single(items)).KeeperName);
    }

    public void Dispose() => _scenario.Dispose();
}
