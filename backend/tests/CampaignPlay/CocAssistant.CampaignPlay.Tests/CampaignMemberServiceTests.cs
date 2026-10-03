namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// The Campaign roster (specs/campaign-play/spec.md, Campaign members API; ux.md section 5 order):
/// the Keeper, then the caller, then other Players by display name; memberIds, never Account ids. Each entry carries
/// the Investigator projected for the caller (specs/campaign-overview/spec.md, Roster with Investigators).
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
        var service = new CampaignMemberService(
            _scenario.Fixture.CreateRepository(context),
            _scenario.Fixture.CreateInvestigatorRepository(context),
            _displayNames);
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

    private const string SheetName = "Harvey Walters";

    /// <summary>Gives the Player an Investigator in the status: a Draft without a sheet, the others with a valid sheet.</summary>
    private async Task<Guid?> CreateInvestigatorInStatusAsync(Guid campaignId, Guid playerAccountId, string status)
    {
        if (status == "None")
        {
            return null;
        }

        if (status == "Draft")
        {
            return await _scenario.CreateDraftAsync(campaignId, playerAccountId);
        }

        var investigatorId = await _scenario.CreateSubmittedAsync(campaignId, playerAccountId);
        if (status == "Approved")
        {
            await _scenario.ApproveAsync(campaignId, investigatorId);
        }
        else if (status == "ChangesRequested")
        {
            await _scenario.RequestChangesAsync(campaignId, investigatorId, "Lower the STR.");
        }

        return investigatorId;
    }

    private async Task<RosterInvestigator?> InvestigatorOfAsync(Guid campaignId, Guid callerAccountId, Guid playerAccountId)
    {
        var campaign = await LoadAsync(campaignId);
        var memberId = CampaignMemberIds.Of(campaign, playerAccountId);
        var members = await ListAsync(campaignId, callerAccountId);
        return members!.Single(member => member.MemberId == memberId).Investigator;
    }

    [Fact]
    public async Task Given_a_player_with_an_investigator_When_anyone_lists_members_Then_the_keeper_entry_has_no_investigator()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.CreateSubmittedAsync(campaignId, CampaignPlayScenario.PlayerAccountId);

        Assert.Null((await ListAsync(campaignId, CampaignPlayScenario.KeeperAccountId))![0].Investigator);
        Assert.Null((await ListAsync(campaignId, CampaignPlayScenario.PlayerAccountId))![0].Investigator);
    }

    [Theory]
    [MemberData(nameof(KeeperAndPlayerCallers))]
    public async Task Given_a_player_without_an_investigator_When_the_keeper_or_that_player_lists_members_Then_the_entry_has_no_investigator(
        Guid callerAccountId)
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);

        Assert.Null(await InvestigatorOfAsync(campaignId, callerAccountId, CampaignPlayScenario.PlayerAccountId));
    }

    public static TheoryData<Guid> KeeperAndPlayerCallers =>
        new() { CampaignPlayScenario.KeeperAccountId, CampaignPlayScenario.PlayerAccountId };

    [Fact]
    public async Task Given_a_named_draft_When_the_keeper_lists_members_Then_it_is_in_progress_without_a_name_or_id()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.CreateDraftAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.SaveCharacterSheetAsync(
            campaignId, CampaignPlayScenario.PlayerAccountId, new CharacterSheetBuilder().WithName("Secret Name").BuildInputs());

        var investigator = await InvestigatorOfAsync(
            campaignId, CampaignPlayScenario.KeeperAccountId, CampaignPlayScenario.PlayerAccountId);

        Assert.Equal(new RosterInvestigator(InvestigatorVisibility.InProgress, null, null, null), investigator);
    }

    [Theory]
    [InlineData("Submitted", InvestigatorStatus.Submitted)]
    [InlineData("ChangesRequested", InvestigatorStatus.ChangesRequested)]
    [InlineData("Approved", InvestigatorStatus.Approved)]
    public async Task Given_a_non_draft_investigator_When_the_keeper_lists_members_Then_it_is_visible_with_id_name_and_status(
        string status,
        InvestigatorStatus expectedStatus)
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        var investigatorId = await CreateInvestigatorInStatusAsync(campaignId, CampaignPlayScenario.PlayerAccountId, status);

        var investigator = await InvestigatorOfAsync(
            campaignId, CampaignPlayScenario.KeeperAccountId, CampaignPlayScenario.PlayerAccountId);

        Assert.Equal(new RosterInvestigator(InvestigatorVisibility.Visible, investigatorId, SheetName, expectedStatus), investigator);
    }

    [Theory]
    [InlineData("Submitted", InvestigatorStatus.Submitted)]
    [InlineData("ChangesRequested", InvestigatorStatus.ChangesRequested)]
    [InlineData("Approved", InvestigatorStatus.Approved)]
    public async Task Given_a_player_with_an_investigator_When_that_player_lists_members_Then_it_is_visible_without_an_id(
        string status,
        InvestigatorStatus expectedStatus)
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await CreateInvestigatorInStatusAsync(campaignId, CampaignPlayScenario.PlayerAccountId, status);

        var investigator = await InvestigatorOfAsync(
            campaignId, CampaignPlayScenario.PlayerAccountId, CampaignPlayScenario.PlayerAccountId);

        Assert.Equal(new RosterInvestigator(InvestigatorVisibility.Visible, null, SheetName, expectedStatus), investigator);
    }

    [Fact]
    public async Task Given_an_unnamed_draft_When_its_player_lists_members_Then_it_is_visible_as_a_draft_with_no_name()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.CreateDraftAsync(campaignId, CampaignPlayScenario.PlayerAccountId);

        var investigator = await InvestigatorOfAsync(
            campaignId, CampaignPlayScenario.PlayerAccountId, CampaignPlayScenario.PlayerAccountId);

        Assert.Equal(new RosterInvestigator(InvestigatorVisibility.Visible, null, null, InvestigatorStatus.Draft), investigator);
    }

    [Fact]
    public async Task Given_another_players_approved_investigator_When_a_player_lists_members_Then_only_its_name_and_approved_status_are_visible()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId);
        await CreateInvestigatorInStatusAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId, "Approved");

        var investigator = await InvestigatorOfAsync(
            campaignId, CampaignPlayScenario.PlayerAccountId, CampaignPlayScenario.OtherPlayerAccountId);

        Assert.Equal(new RosterInvestigator(InvestigatorVisibility.Visible, null, SheetName, InvestigatorStatus.Approved), investigator);
    }

    [Theory]
    [InlineData("None")]
    [InlineData("Draft")]
    [InlineData("Submitted")]
    [InlineData("ChangesRequested")]
    public async Task Given_another_players_investigator_that_is_not_approved_When_a_player_lists_members_Then_it_is_not_ready(string status)
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId);
        await CreateInvestigatorInStatusAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId, status);

        var investigator = await InvestigatorOfAsync(
            campaignId, CampaignPlayScenario.PlayerAccountId, CampaignPlayScenario.OtherPlayerAccountId);

        Assert.Equal(new RosterInvestigator(InvestigatorVisibility.NotReady, null, null, null), investigator);
    }

    public void Dispose() => _scenario.Dispose();
}
