namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// The Keeper's Investigator use cases: the list, the review read, Character Approval, and Change Requests
/// (specs/campaign-play/spec.md Investigator lifecycle, visibility, Constraints, and Regression Guardrails).
/// </summary>
public class KeeperInvestigatorServiceTests : IDisposable
{
    private static readonly Guid Keeper = CampaignPlayScenario.KeeperAccountId;
    private static readonly Guid Player = CampaignPlayScenario.PlayerAccountId;
    private readonly CampaignPlayScenario _scenario = new();

    private async Task<Guid> CampaignWithPlayerAsync()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, Player);
        return campaignId;
    }

    private async Task<T> AsKeeperServiceAsync<T>(Func<KeeperInvestigatorService, Task<T>> action)
    {
        using var context = _scenario.Fixture.CreateContext();
        return await action(_scenario.KeeperService(context));
    }

    // Scenario: Player starts a Draft Investigator (the Keeper sees it only as "In progress")
    [Fact]
    public async Task Given_a_draft_and_a_submitted_investigator_When_the_keeper_lists_them_Then_each_carries_its_status_and_player_name()
    {
        var campaignId = await CampaignWithPlayerAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId);
        await _scenario.CreateDraftAsync(campaignId, Player);
        await _scenario.CreateSubmittedAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId);

        var items = await AsKeeperServiceAsync(service => service.ListAsync(campaignId, Keeper, CancellationToken.None));

        Assert.NotNull(items);
        Assert.Equal(
            [("Ada Lovelace", InvestigatorStatus.Draft), ("Harvey Walters", InvestigatorStatus.Submitted)],
            items.Select(item => (item.PlayerName, item.Investigator.Status)).OrderBy(item => item.PlayerName));
    }

    [Theory]
    [MemberData(nameof(NonKeepers))]
    public async Task Given_a_player_or_non_member_When_listing_investigators_Then_nothing_is_returned(Guid caller)
    {
        var campaignId = await CampaignWithPlayerAsync();
        await _scenario.CreateDraftAsync(campaignId, Player);

        Assert.Null(await AsKeeperServiceAsync(service => service.ListAsync(campaignId, caller, CancellationToken.None)));
    }

    public static TheoryData<Guid> NonKeepers() => [Player, CampaignPlayScenario.StrangerAccountId];

    [Fact]
    public async Task Given_a_submitted_investigator_When_the_keeper_opens_it_Then_the_sheet_values_and_player_name_are_returned()
    {
        var campaignId = await CampaignWithPlayerAsync();
        var investigatorId = await _scenario.CreateSubmittedAsync(campaignId, Player);

        var view = await AsKeeperServiceAsync(service => service.GetAsync(campaignId, investigatorId, Keeper, CancellationToken.None));

        Assert.NotNull(view);
        Assert.Equal("Ada Lovelace", view.PlayerName);
        Assert.Equal(55, view.Computation.Derived.Luck);
        Assert.Single(view.Investigator.CharacterSheet.RollRecords, record => record.Purpose == RollPurposes.Luck);
    }

    // Scenario: Keeper cannot open a Draft Investigator
    [Fact]
    public async Task Given_a_draft_When_the_keeper_opens_it_Then_it_is_not_found()
    {
        var campaignId = await CampaignWithPlayerAsync();
        var investigatorId = await _scenario.CreateDraftAsync(campaignId, Player);

        Assert.Null(await AsKeeperServiceAsync(service => service.GetAsync(campaignId, investigatorId, Keeper, CancellationToken.None)));
    }

    // Scenario: Investigator is not reachable from another Campaign
    [Fact]
    public async Task Given_an_investigator_in_campaign_a_When_the_keeper_of_campaign_b_requests_it_through_campaign_b_Then_it_is_not_found()
    {
        var campaignA = await CampaignWithPlayerAsync();
        var investigatorId = await _scenario.CreateSubmittedAsync(campaignA, Player);
        var otherKeeper = Guid.NewGuid();
        var campaignB = await _scenario.CreateCampaignAsync(keeperAccountId: otherKeeper);

        Assert.Null(await AsKeeperServiceAsync(service => service.GetAsync(campaignB, investigatorId, otherKeeper, CancellationToken.None)));
        Assert.Equal(
            InvestigatorCommandOutcome.NotFound,
            (await AsKeeperServiceAsync(service => service.ApproveAsync(campaignB, investigatorId, otherKeeper, CancellationToken.None))).Outcome);
    }

    // Scenario: Keeper approves an Investigator
    [Fact]
    public async Task Given_a_submitted_investigator_When_the_keeper_approves_it_Then_it_is_approved()
    {
        var campaignId = await CampaignWithPlayerAsync();
        var investigatorId = await _scenario.CreateSubmittedAsync(campaignId, Player);

        var result = await AsKeeperServiceAsync(service => service.ApproveAsync(campaignId, investigatorId, Keeper, CancellationToken.None));

        Assert.Equal(InvestigatorCommandOutcome.Succeeded, result.Outcome);
        Assert.Equal(InvestigatorStatus.Approved, (await _scenario.LoadInvestigatorAsync(campaignId, investigatorId))!.Status);
    }

    // Scenario: Player cannot approve their own Investigator
    [Fact]
    public async Task Given_a_submitted_investigator_When_its_player_attempts_to_approve_or_request_changes_Then_it_is_not_found_and_remains_submitted()
    {
        var campaignId = await CampaignWithPlayerAsync();
        var investigatorId = await _scenario.CreateSubmittedAsync(campaignId, Player);

        var approve = await AsKeeperServiceAsync(service => service.ApproveAsync(campaignId, investigatorId, Player, CancellationToken.None));
        var requestChanges = await AsKeeperServiceAsync(service => service.RequestChangesAsync(campaignId, investigatorId, Player, "Mine", CancellationToken.None));

        Assert.Equal(InvestigatorCommandOutcome.NotFound, approve.Outcome);
        Assert.Equal(InvestigatorCommandOutcome.NotFound, requestChanges.Outcome);
        Assert.Equal(InvestigatorStatus.Submitted, (await _scenario.LoadInvestigatorAsync(campaignId, investigatorId))!.Status);
    }

    [Fact]
    public async Task Given_an_approved_investigator_When_the_keeper_approves_again_Then_it_is_a_status_conflict()
    {
        var campaignId = await CampaignWithPlayerAsync();
        var investigatorId = await _scenario.CreateSubmittedAsync(campaignId, Player);
        await AsKeeperServiceAsync(service => service.ApproveAsync(campaignId, investigatorId, Keeper, CancellationToken.None));

        var result = await AsKeeperServiceAsync(service => service.ApproveAsync(campaignId, investigatorId, Keeper, CancellationToken.None));

        Assert.Equal(InvestigatorCommandOutcome.StatusConflict, result.Outcome);
    }

    // Scenario: Keeper requests changes
    [Fact]
    public async Task Given_a_submitted_investigator_When_the_keeper_requests_changes_Then_the_player_sees_the_comment_and_can_edit_and_resubmit()
    {
        var campaignId = await CampaignWithPlayerAsync();
        var investigatorId = await _scenario.CreateSubmittedAsync(campaignId, Player);

        var result = await AsKeeperServiceAsync(service => service.RequestChangesAsync(
            campaignId, investigatorId, Keeper, "Credit Rating seems high for this Occupation", CancellationToken.None));

        Assert.Equal(InvestigatorCommandOutcome.Succeeded, result.Outcome);
        using var context = _scenario.Fixture.CreateContext();
        var player = _scenario.PlayerService(context);
        var mine = await player.GetMineAsync(campaignId, Player, CancellationToken.None);
        Assert.Equal(InvestigatorStatus.ChangesRequested, mine!.Status);
        Assert.Equal("Credit Rating seems high for this Occupation", mine.ChangeRequestComment);
        var edit = await _scenario.SaveCharacterSheetAsync(campaignId, Player, new CharacterSheetBuilder().WithName("Harvey W.").BuildInputs());
        Assert.Equal(InvestigatorCommandOutcome.Succeeded, edit.Outcome);
        using var submitContext = _scenario.Fixture.CreateContext();
        var resubmitted = await _scenario.PlayerService(submitContext).SubmitMineAsync(campaignId, Player, CancellationToken.None);
        Assert.Equal(InvestigatorStatus.Submitted, resubmitted.Investigator!.Status);
    }

    // Scenario: Request changes requires a comment
    [Fact]
    public async Task Given_a_submitted_investigator_When_the_keeper_requests_changes_without_a_comment_Then_it_is_rejected_and_remains_submitted()
    {
        var campaignId = await CampaignWithPlayerAsync();
        var investigatorId = await _scenario.CreateSubmittedAsync(campaignId, Player);

        var result = await AsKeeperServiceAsync(service => service.RequestChangesAsync(campaignId, investigatorId, Keeper, "  ", CancellationToken.None));

        Assert.Equal(InvestigatorCommandOutcome.InvalidChangeRequestComment, result.Outcome);
        Assert.Equal(InvestigatorStatus.Submitted, (await _scenario.LoadInvestigatorAsync(campaignId, investigatorId))!.Status);
    }

    public void Dispose() => _scenario.Dispose();
}
