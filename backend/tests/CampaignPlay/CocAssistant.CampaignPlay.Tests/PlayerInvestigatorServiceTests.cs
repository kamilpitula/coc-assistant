namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// The Player's Investigator use cases (specs/campaign-play/spec.md Investigator lifecycle, visibility, and API
/// Contracts; specs/character-sheet/spec.md API Contracts).
/// </summary>
public class PlayerInvestigatorServiceTests : IDisposable
{
    private static readonly Guid Player = CampaignPlayScenario.PlayerAccountId;
    private readonly CampaignPlayScenario _scenario = new();

    private async Task<Guid> CampaignWithPlayerAsync(AllowedCreationMethods? allowed = null)
    {
        var campaignId = await _scenario.CreateCampaignAsync(allowed);
        await _scenario.JoinAsPlayerAsync(campaignId, Player);
        return campaignId;
    }

    private async Task<T> AsPlayerAsync<T>(Func<PlayerInvestigatorService, Task<T>> action)
    {
        using var context = _scenario.Fixture.CreateContext();
        return await action(_scenario.PlayerService(context));
    }

    // Scenario: Player starts a Draft Investigator
    [Fact]
    public async Task Given_a_player_without_an_investigator_When_creating_one_Then_it_is_a_draft()
    {
        var campaignId = await CampaignWithPlayerAsync();

        var result = await AsPlayerAsync(service => service.CreateAsync(campaignId, Player, CancellationToken.None));

        Assert.Equal(InvestigatorCommandOutcome.Succeeded, result.Outcome);
        Assert.Equal(InvestigatorStatus.Draft, result.Investigator!.Status);
        Assert.Equal(InvestigatorStatus.Draft, (await _scenario.LoadInvestigatorAsync(campaignId, result.Investigator.Id))!.Status);
    }

    [Theory]
    [MemberData(nameof(NonPlayers))]
    public async Task Given_a_keeper_or_non_member_When_creating_an_investigator_Then_the_campaign_is_not_found(Guid caller)
    {
        var campaignId = await CampaignWithPlayerAsync();

        var result = await AsPlayerAsync(service => service.CreateAsync(campaignId, caller, CancellationToken.None));

        Assert.Equal(InvestigatorCommandOutcome.NotFound, result.Outcome);
    }

    public static TheoryData<Guid> NonPlayers() => [CampaignPlayScenario.KeeperAccountId, CampaignPlayScenario.StrangerAccountId];

    // Scenario: Player cannot create a second Investigator
    [Fact]
    public async Task Given_a_player_already_has_an_investigator_When_creating_another_Then_it_already_exists()
    {
        var campaignId = await CampaignWithPlayerAsync();
        await _scenario.CreateDraftAsync(campaignId, Player);

        var result = await AsPlayerAsync(service => service.CreateAsync(campaignId, Player, CancellationToken.None));

        Assert.Equal(InvestigatorCommandOutcome.AlreadyExists, result.Outcome);
    }

    [Fact]
    public async Task Given_a_concurrent_creation_wins_the_race_When_creating_Then_it_already_exists_and_one_investigator_remains()
    {
        var campaignId = await CampaignWithPlayerAsync();
        using var context = _scenario.Fixture.CreateContext();
        var racing = new RacingInvestigatorRepository(
            _scenario.Fixture.CreateInvestigatorRepository(context),
            () => _scenario.CreateDraftAsync(campaignId, Player));

        var result = await _scenario.PlayerService(context, racing).CreateAsync(campaignId, Player, CancellationToken.None);

        Assert.Equal(InvestigatorCommandOutcome.AlreadyExists, result.Outcome);
        using var readContext = _scenario.Fixture.CreateContext();
        Assert.Single(await _scenario.Fixture.CreateInvestigatorRepository(readContext).ListForCampaignAsync(campaignId, CancellationToken.None));
    }

    // Scenario: Player cannot create an Investigator without a supported Creation Method
    [Fact]
    public async Task Given_the_campaign_allows_no_supported_creation_method_When_creating_Then_creation_methods_are_unavailable()
    {
        var campaignId = await CampaignWithPlayerAsync(AllowedCreationMethods.Create([CreationMethod.StandardRolling, CreationMethod.QuickFire]));

        var result = await AsPlayerAsync(service => service.CreateAsync(campaignId, Player, CancellationToken.None));

        Assert.Equal(InvestigatorCommandOutcome.CreationMethodsUnavailable, result.Outcome);
        Assert.Null(await AsPlayerAsync(service => service.GetMineAsync(campaignId, Player, CancellationToken.None)));
    }

    // Scenario: Player cannot read another Player's Investigator
    [Fact]
    public async Task Given_two_players_with_investigators_When_each_reads_theirs_Then_each_gets_only_their_own()
    {
        var campaignId = await CampaignWithPlayerAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId);
        var mine = await _scenario.CreateDraftAsync(campaignId, Player);
        var theirs = await _scenario.CreateDraftAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId);

        Assert.Equal(mine, (await AsPlayerAsync(service => service.GetMineAsync(campaignId, Player, CancellationToken.None)))!.Id);
        Assert.Equal(theirs, (await AsPlayerAsync(service => service.GetMineAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId, CancellationToken.None)))!.Id);
        Assert.Null(await AsPlayerAsync(service => service.GetMineAsync(campaignId, CampaignPlayScenario.KeeperAccountId, CancellationToken.None)));
    }

    [Fact]
    public async Task Given_a_draft_When_saving_the_character_sheet_Then_it_is_stored_and_returned_with_its_values_and_problems()
    {
        var campaignId = await CampaignWithPlayerAsync();
        await _scenario.CreateDraftAsync(campaignId, Player);
        var inputs = new CharacterSheetBuilder().WithLuckRolls().BuildInputs();

        var result = await _scenario.SaveCharacterSheetAsync(campaignId, Player, inputs);

        Assert.Equal(InvestigatorCommandOutcome.Succeeded, result.Outcome);
        var view = result.View!;
        Assert.Equal("Ada Lovelace", view.PlayerName);
        Assert.Equal("LuckRollRequired", Assert.Single(view.ValidationErrors).Code);
        Assert.Equal(60, view.Computation.FinalCharacteristics[Characteristic.Strength]);
        var reread = await AsPlayerAsync(service => service.GetMyCharacterSheetAsync(campaignId, Player, CancellationToken.None));
        Assert.Equal(inputs.ToCharacterSheet(new PlayerEnteredRollSource()), reread!.Investigator.CharacterSheet);
    }

    // Scenario: Player submits a valid Character Sheet
    [Fact]
    public async Task Given_a_draft_without_errors_When_submitting_Then_it_is_submitted_and_can_no_longer_be_edited()
    {
        var campaignId = await CampaignWithPlayerAsync();
        await _scenario.CreateDraftAsync(campaignId, Player);
        await _scenario.SaveCharacterSheetAsync(campaignId, Player, new CharacterSheetBuilder().BuildInputs());

        var submitted = await AsPlayerAsync(service => service.SubmitMineAsync(campaignId, Player, CancellationToken.None));
        var edit = await _scenario.SaveCharacterSheetAsync(campaignId, Player, new CharacterSheetBuilder().WithName("Changed").BuildInputs());

        Assert.Equal(InvestigatorCommandOutcome.Succeeded, submitted.Outcome);
        Assert.Equal(InvestigatorStatus.Submitted, submitted.Investigator!.Status);
        Assert.Equal(InvestigatorCommandOutcome.StatusConflict, edit.Outcome);
    }

    [Fact]
    public async Task Given_a_draft_with_errors_When_submitting_Then_it_fails_validation_with_the_errors()
    {
        var campaignId = await CampaignWithPlayerAsync();
        await _scenario.CreateDraftAsync(campaignId, Player);

        var result = await AsPlayerAsync(service => service.SubmitMineAsync(campaignId, Player, CancellationToken.None));

        Assert.Equal(InvestigatorCommandOutcome.ValidationFailed, result.Outcome);
        Assert.Contains(result.ValidationErrors!, error => error.Code == "InvestigatorNameRequired");
        Assert.Equal(InvestigatorStatus.Draft, (await AsPlayerAsync(service => service.GetMineAsync(campaignId, Player, CancellationToken.None)))!.Status);
    }

    // Scenario: Disallowed Creation Method blocks submission
    [Fact]
    public async Task Given_the_keeper_disallowed_point_buy_after_the_draft_was_made_When_submitting_Then_it_fails_with_the_disallowed_method_error()
    {
        var campaignId = await CampaignWithPlayerAsync();
        await _scenario.CreateDraftAsync(campaignId, Player);
        await _scenario.SaveCharacterSheetAsync(campaignId, Player, new CharacterSheetBuilder().BuildInputs());
        await _scenario.ChangeAllowedCreationMethodsAsync(campaignId, AllowedCreationMethods.Create([CreationMethod.QuickFire]));

        var result = await AsPlayerAsync(service => service.SubmitMineAsync(campaignId, Player, CancellationToken.None));

        Assert.Equal(InvestigatorCommandOutcome.ValidationFailed, result.Outcome);
        Assert.Equal("CreationMethodNotAllowed", Assert.Single(result.ValidationErrors!).Code);
    }

    [Fact]
    public async Task Given_a_submitted_investigator_When_submitting_again_Then_it_is_a_status_conflict()
    {
        var campaignId = await CampaignWithPlayerAsync();
        await _scenario.CreateSubmittedAsync(campaignId, Player);

        var result = await AsPlayerAsync(service => service.SubmitMineAsync(campaignId, Player, CancellationToken.None));

        Assert.Equal(InvestigatorCommandOutcome.StatusConflict, result.Outcome);
    }

    // Scenario: Player starts over from a Draft
    [Fact]
    public async Task Given_a_draft_When_starting_over_Then_the_player_has_no_investigator()
    {
        var campaignId = await CampaignWithPlayerAsync();
        await _scenario.CreateDraftAsync(campaignId, Player);

        var outcome = await AsPlayerAsync(service => service.DeleteMineAsync(campaignId, Player, CancellationToken.None));

        Assert.Equal(InvestigatorCommandOutcome.Succeeded, outcome);
        Assert.Null(await AsPlayerAsync(service => service.GetMineAsync(campaignId, Player, CancellationToken.None)));
    }

    [Fact]
    public async Task Given_a_submitted_investigator_When_starting_over_Then_it_is_a_status_conflict_and_it_remains()
    {
        var campaignId = await CampaignWithPlayerAsync();
        await _scenario.CreateSubmittedAsync(campaignId, Player);

        var outcome = await AsPlayerAsync(service => service.DeleteMineAsync(campaignId, Player, CancellationToken.None));

        Assert.Equal(InvestigatorCommandOutcome.StatusConflict, outcome);
        Assert.NotNull(await AsPlayerAsync(service => service.GetMineAsync(campaignId, Player, CancellationToken.None)));
    }

    [Fact]
    public async Task Given_no_investigator_When_reading_saving_submitting_or_deleting_Then_it_is_not_found()
    {
        var campaignId = await CampaignWithPlayerAsync();

        Assert.Null(await AsPlayerAsync(service => service.GetMyCharacterSheetAsync(campaignId, Player, CancellationToken.None)));
        Assert.Equal(InvestigatorCommandOutcome.NotFound, (await _scenario.SaveCharacterSheetAsync(campaignId, Player, new CharacterSheetBuilder().BuildInputs())).Outcome);
        Assert.Equal(InvestigatorCommandOutcome.NotFound, (await AsPlayerAsync(service => service.SubmitMineAsync(campaignId, Player, CancellationToken.None))).Outcome);
        Assert.Equal(InvestigatorCommandOutcome.NotFound, await AsPlayerAsync(service => service.DeleteMineAsync(campaignId, Player, CancellationToken.None)));
    }

    public void Dispose() => _scenario.Dispose();
}
