namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// The Campaign roster (specs/campaign-play/spec.md, Campaign members API; ux.md section 5 order):
/// the Keeper, then the caller, then other Players by display name; memberIds, never Account ids.
/// </summary>
public class CampaignMemberServiceTests : IDisposable
{
    private static readonly Guid FourthPlayerAccountId = Guid.Parse("55555555-5555-5555-5555-555555555555");

    private readonly CampaignPlayScenario _scenario = new();
    private readonly InMemoryAccountDisplayNames _displayNames =
        new InMemoryAccountDisplayNames().With(FourthPlayerAccountId, "aaron Blake");

    private async Task<IReadOnlyList<CampaignMember>?> ListAsync(Guid campaignId, Guid callerAccountId)
    {
        using var context = _scenario.Fixture.CreateContext();
        var service = new CampaignMemberService(_scenario.Fixture.CreateRepository(context), _displayNames);
        return await service.ListAsync(campaignId, callerAccountId, CancellationToken.None);
    }

    private async Task<Campaign> LoadAsync(Guid campaignId)
    {
        using var context = _scenario.Fixture.CreateContext();
        return (await _scenario.Fixture.CreateRepository(context).FindByIdAsync(campaignId, CancellationToken.None))!;
    }

    private async Task<Guid> CreateCampaignWithThreePlayersAsync()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId);
        await _scenario.JoinAsPlayerAsync(campaignId, FourthPlayerAccountId);
        return campaignId;
    }

    [Fact]
    public async Task Given_a_campaign_with_players_When_a_player_lists_members_Then_the_keeper_comes_first_then_the_caller_then_others_by_name()
    {
        var campaignId = await CreateCampaignWithThreePlayersAsync();

        var members = await ListAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId);

        Assert.NotNull(members);
        Assert.Equal(
            [
                ("Kate Keeper", CampaignRole.Keeper, false),
                ("Harvey Walters", CampaignRole.Player, true),
                ("aaron Blake", CampaignRole.Player, false),
                ("Ada Lovelace", CampaignRole.Player, false),
            ],
            members.Select(member => (member.DisplayName, member.Role, member.IsYou)));
    }

    [Fact]
    public async Task Given_a_campaign_with_players_When_the_keeper_lists_members_Then_only_the_keeper_entry_is_marked_as_the_caller()
    {
        var campaignId = await CreateCampaignWithThreePlayersAsync();

        var members = await ListAsync(campaignId, CampaignPlayScenario.KeeperAccountId);

        Assert.NotNull(members);
        Assert.Equal(
            ["Kate Keeper", "aaron Blake", "Ada Lovelace", "Harvey Walters"],
            members.Select(member => member.DisplayName));
        Assert.Equal([true, false, false, false], members.Select(member => member.IsYou));
    }

    [Fact]
    public async Task Given_a_campaign_with_a_player_When_listing_members_Then_the_memberIds_are_the_campaign_id_and_the_campaign_player_id()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        var campaign = await LoadAsync(campaignId);

        var members = await ListAsync(campaignId, CampaignPlayScenario.PlayerAccountId);

        Assert.NotNull(members);
        Assert.Equal([campaign.Id, campaign.Players.Single().Id], members.Select(member => member.MemberId));
    }

    [Fact]
    public async Task Given_a_campaign_without_players_When_the_keeper_lists_members_Then_only_the_keeper_is_listed()
    {
        var campaignId = await _scenario.CreateCampaignAsync();

        var members = await ListAsync(campaignId, CampaignPlayScenario.KeeperAccountId);

        Assert.NotNull(members);
        Assert.Equal(["Kate Keeper"], members.Select(member => member.DisplayName));
    }

    [Fact]
    public async Task Given_a_campaign_When_a_non_member_lists_members_Then_nothing_is_returned()
    {
        var campaignId = await _scenario.CreateCampaignAsync();

        Assert.Null(await ListAsync(campaignId, CampaignPlayScenario.StrangerAccountId));
    }

    [Fact]
    public async Task Given_no_campaign_When_listing_members_Then_nothing_is_returned()
    {
        Assert.Null(await ListAsync(Guid.NewGuid(), CampaignPlayScenario.KeeperAccountId));
    }

    [Fact]
    public async Task Given_a_campaign_with_a_player_When_mapping_accounts_to_memberIds_Then_non_members_have_none()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        var campaign = await LoadAsync(campaignId);

        Assert.Equal(campaign.Id, CampaignMemberIds.Of(campaign, CampaignPlayScenario.KeeperAccountId));
        Assert.Equal(campaign.Players.Single().Id, CampaignMemberIds.Of(campaign, CampaignPlayScenario.PlayerAccountId));
        Assert.Null(CampaignMemberIds.Of(campaign, CampaignPlayScenario.StrangerAccountId));
    }

    public void Dispose() => _scenario.Dispose();
}
