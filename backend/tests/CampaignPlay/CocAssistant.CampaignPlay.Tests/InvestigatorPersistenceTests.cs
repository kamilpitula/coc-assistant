namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Persisting Investigators (ADR 0005, ADR 0007): the JSON Character Sheet round-trips, the database admits one
/// Investigator per Player per Campaign, and racing changes surface as conflicts.
/// </summary>
public class InvestigatorPersistenceTests : IDisposable
{
    private readonly CampaignPlayScenario _scenario = new();
    private static readonly DateTimeOffset Now = new(2026, 10, 2, 12, 0, 0, TimeSpan.Zero);

    private async Task<Investigator> AddDraftAsync(Guid campaignId, Guid playerAccountId)
    {
        using var context = _scenario.Fixture.CreateContext();
        var repository = _scenario.Fixture.CreateInvestigatorRepository(context);
        var investigator = Investigator.Create(campaignId, playerAccountId, Now);
        repository.Add(investigator);
        await repository.SaveChangesAsync(CancellationToken.None);
        return investigator;
    }

    [Fact]
    public async Task Given_a_saved_investigator_with_a_character_sheet_When_reading_it_back_Then_everything_round_trips()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        var sheet = new CharacterSheetBuilder().Build();
        Guid investigatorId;
        using (var context = _scenario.Fixture.CreateContext())
        {
            var repository = _scenario.Fixture.CreateInvestigatorRepository(context);
            var investigator = Investigator.Create(campaignId, CampaignPlayScenario.PlayerAccountId, Now);
            investigator.ReplaceCharacterSheet(sheet, Now);
            investigator.Submit([], Now);
            repository.Add(investigator);
            await repository.SaveChangesAsync(CancellationToken.None);
            investigatorId = investigator.Id;
        }

        using var readContext = _scenario.Fixture.CreateContext();
        var stored = await _scenario.Fixture.CreateInvestigatorRepository(readContext)
            .FindByIdAsync(campaignId, investigatorId, CancellationToken.None);

        Assert.NotNull(stored);
        Assert.Equal(sheet, stored.CharacterSheet);
        Assert.Equal(InvestigatorStatus.Submitted, stored.Status);
        Assert.Equal(CampaignPlayScenario.PlayerAccountId, stored.PlayerAccountId);
    }

    // Investigators never cross Campaign boundaries.
    [Fact]
    public async Task Given_an_investigator_in_campaign_a_When_looking_it_up_through_campaign_b_Then_it_is_not_found()
    {
        var campaignA = await _scenario.CreateCampaignAsync();
        var campaignB = await _scenario.CreateCampaignAsync();
        var investigator = await AddDraftAsync(campaignA, CampaignPlayScenario.PlayerAccountId);

        using var context = _scenario.Fixture.CreateContext();
        var repository = _scenario.Fixture.CreateInvestigatorRepository(context);

        Assert.Null(await repository.FindByIdAsync(campaignB, investigator.Id, CancellationToken.None));
        Assert.Empty(await repository.ListForCampaignAsync(campaignB, CancellationToken.None));
        Assert.Single(await repository.ListForCampaignAsync(campaignA, CancellationToken.None));
    }

    [Fact]
    public async Task Given_a_player_investigator_When_finding_it_for_that_player_Then_it_is_returned_and_others_are_not()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        var investigator = await AddDraftAsync(campaignId, CampaignPlayScenario.PlayerAccountId);

        using var context = _scenario.Fixture.CreateContext();
        var repository = _scenario.Fixture.CreateInvestigatorRepository(context);

        Assert.Equal(investigator.Id, (await repository.FindForPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId, CancellationToken.None))?.Id);
        Assert.Null(await repository.FindForPlayerAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId, CancellationToken.None));
    }

    // Regression Guardrail: A Player controls at most one Investigator per Campaign.
    [Fact]
    public async Task Given_a_player_already_has_an_investigator_When_saving_a_second_one_Then_the_database_rejects_it_as_a_conflict()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await AddDraftAsync(campaignId, CampaignPlayScenario.PlayerAccountId);

        await Assert.ThrowsAsync<InvestigatorConflictException>(() => AddDraftAsync(campaignId, CampaignPlayScenario.PlayerAccountId));
    }

    [Fact]
    public async Task Given_two_requests_change_the_same_investigator_When_the_second_saves_Then_it_is_a_conflict()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        var draft = await AddDraftAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        using (var submitContext = _scenario.Fixture.CreateContext())
        {
            var submitRepository = _scenario.Fixture.CreateInvestigatorRepository(submitContext);
            var submitted = await submitRepository.FindByIdAsync(campaignId, draft.Id, CancellationToken.None);
            submitted!.Submit([], Now);
            await submitRepository.SaveChangesAsync(CancellationToken.None);
        }

        using var approveContext = _scenario.Fixture.CreateContext();
        using var requestChangesContext = _scenario.Fixture.CreateContext();
        var approveRepository = _scenario.Fixture.CreateInvestigatorRepository(approveContext);
        var requestChangesRepository = _scenario.Fixture.CreateInvestigatorRepository(requestChangesContext);
        var toApprove = await approveRepository.FindByIdAsync(campaignId, draft.Id, CancellationToken.None);
        var toReturn = await requestChangesRepository.FindByIdAsync(campaignId, draft.Id, CancellationToken.None);

        toApprove!.Approve(Now);
        await approveRepository.SaveChangesAsync(CancellationToken.None);
        toReturn!.RequestChanges("Fix the age", Now);

        await Assert.ThrowsAsync<InvestigatorConflictException>(() => requestChangesRepository.SaveChangesAsync(CancellationToken.None));
    }

    [Fact]
    public async Task Given_a_draft_When_removing_it_Then_the_player_has_no_investigator()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        var draft = await AddDraftAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        using (var context = _scenario.Fixture.CreateContext())
        {
            var repository = _scenario.Fixture.CreateInvestigatorRepository(context);
            repository.Remove((await repository.FindByIdAsync(campaignId, draft.Id, CancellationToken.None))!);
            await repository.SaveChangesAsync(CancellationToken.None);
        }

        using var readContext = _scenario.Fixture.CreateContext();
        Assert.Null(await _scenario.Fixture.CreateInvestigatorRepository(readContext)
            .FindForPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId, CancellationToken.None));
    }

    public void Dispose() => _scenario.Dispose();
}
