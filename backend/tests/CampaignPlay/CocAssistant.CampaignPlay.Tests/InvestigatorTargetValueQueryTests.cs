namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// The provider query Scene Play uses to snapshot target values at Roll Request creation (specs/roll-requests/spec.md,
/// Roll Request; PBI-DICE-005 design record, step 5): per-Investigator values from Approved Character Sheets, with the
/// catalog base when the sheet lacks the skill (character rules section 6.1) and no authorization of its own (ADR 0024).
/// </summary>
public class InvestigatorTargetValueQueryTests : IDisposable
{
    private static readonly Guid Player = CampaignPlayScenario.PlayerAccountId;
    private static readonly Guid OtherPlayer = CampaignPlayScenario.OtherPlayerAccountId;

    private readonly CampaignPlayScenario _scenario = new();

    public void Dispose() => _scenario.Dispose();

    private InvestigatorTargetValueQuery CreateQuery(CampaignPlayDbContext context) =>
        new(
            _scenario.Fixture.CreateInvestigatorRepository(context),
            new CreationRuleSets(CampaignPlayScenario.RuleData, [EmbeddedResourceEraRuleData.For1920s()]));

    private async Task<Campaign> LoadCampaignAsync(Guid campaignId)
    {
        using var context = _scenario.Fixture.CreateContext();
        return (await _scenario.Fixture.CreateRepository(context).FindByIdAsync(campaignId, CancellationToken.None))!;
    }

    private async Task<TargetValueResult> QueryAsync(Campaign campaign, RollRequestTarget target, params Guid[] investigatorIds)
    {
        using var context = _scenario.Fixture.CreateContext();
        return await CreateQuery(context).QueryAsync(campaign, target, investigatorIds, CancellationToken.None);
    }

    private async Task<(Guid CampaignId, Guid InvestigatorId)> ApprovedInvestigatorAsync(Guid player)
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, player);
        var investigatorId = await _scenario.CreateSubmittedAsync(campaignId, player);
        await _scenario.ApproveAsync(campaignId, investigatorId);
        return (campaignId, investigatorId);
    }

    private static RollRequestTarget SkillTarget(string skill, string? specialization = null) =>
        new(RollTargetKind.Skill, Skill: new SkillReference(skill, specialization));

    [Fact]
    public async Task Given_an_approved_investigator_When_querying_a_skill_on_the_sheet_Then_the_sheet_value_is_used_and_it_can_earn()
    {
        var (campaignId, investigatorId) = await ApprovedInvestigatorAsync(Player);
        var campaign = await LoadCampaignAsync(campaignId);

        var spotHidden = await QueryAsync(campaign, SkillTarget("Spot Hidden"), investigatorId);
        var libraryUse = await QueryAsync(campaign, SkillTarget("Library Use"), investigatorId);

        Assert.Null(spotHidden.Refusal);
        Assert.Equal(new InvestigatorTargetValue(investigatorId, 45, UsesBaseValue: false, CanEarnExperienceCheck: true), spotHidden.Values.Single());
        Assert.Equal(new InvestigatorTargetValue(investigatorId, 70, UsesBaseValue: false, CanEarnExperienceCheck: true), libraryUse.Values.Single());
    }

    [Fact]
    public async Task Given_an_approved_investigator_When_querying_a_skill_missing_from_the_sheet_Then_the_catalog_base_is_used()
    {
        var (campaignId, investigatorId) = await ApprovedInvestigatorAsync(Player);
        var campaign = await LoadCampaignAsync(campaignId);

        var result = await QueryAsync(campaign, SkillTarget("Psychology"), investigatorId);

        Assert.Null(result.Refusal);
        Assert.Equal(new InvestigatorTargetValue(investigatorId, 10, UsesBaseValue: true, CanEarnExperienceCheck: true), result.Values.Single());
    }

    [Fact]
    public async Task Given_an_approved_investigator_When_querying_cthulhu_mythos_Then_the_base_is_used_and_it_never_earns()
    {
        var (campaignId, investigatorId) = await ApprovedInvestigatorAsync(Player);
        var campaign = await LoadCampaignAsync(campaignId);

        var result = await QueryAsync(campaign, SkillTarget("Cthulhu Mythos"), investigatorId);

        Assert.Null(result.Refusal);
        Assert.Equal(new InvestigatorTargetValue(investigatorId, 0, UsesBaseValue: true, CanEarnExperienceCheck: false), result.Values.Single());
    }

    [Fact]
    public async Task Given_an_approved_investigator_When_querying_credit_rating_Then_the_sheet_value_is_used_and_it_never_earns()
    {
        var (campaignId, investigatorId) = await ApprovedInvestigatorAsync(Player);
        var campaign = await LoadCampaignAsync(campaignId);

        var result = await QueryAsync(campaign, SkillTarget("Credit Rating"), investigatorId);

        Assert.Null(result.Refusal);
        Assert.Equal(new InvestigatorTargetValue(investigatorId, 30, UsesBaseValue: false, CanEarnExperienceCheck: false), result.Values.Single());
    }

    [Fact]
    public async Task Given_an_approved_investigator_When_querying_a_characteristic_Then_the_final_value_is_used_and_it_never_earns()
    {
        var (campaignId, investigatorId) = await ApprovedInvestigatorAsync(Player);
        var campaign = await LoadCampaignAsync(campaignId);

        var result = await QueryAsync(campaign, new RollRequestTarget(RollTargetKind.Characteristic, Characteristic: Characteristic.Strength), investigatorId);

        Assert.Null(result.Refusal);
        Assert.Equal(new InvestigatorTargetValue(investigatorId, 60, UsesBaseValue: false, CanEarnExperienceCheck: false), result.Values.Single());
    }

    [Fact]
    public async Task Given_an_approved_investigator_When_querying_luck_Then_the_sheet_luck_is_used_and_it_never_earns()
    {
        var (campaignId, investigatorId) = await ApprovedInvestigatorAsync(Player);
        var campaign = await LoadCampaignAsync(campaignId);

        var result = await QueryAsync(campaign, new RollRequestTarget(RollTargetKind.Luck), investigatorId);

        Assert.Null(result.Refusal);
        Assert.Equal(new InvestigatorTargetValue(investigatorId, 75, UsesBaseValue: false, CanEarnExperienceCheck: false), result.Values.Single());
    }

    [Fact]
    public async Task Given_two_approved_investigators_When_querying_Then_each_value_is_returned_in_the_requested_order()
    {
        var (campaignId, firstId) = await ApprovedInvestigatorAsync(Player);
        await _scenario.JoinAsPlayerAsync(campaignId, OtherPlayer);
        var secondId = await _scenario.CreateSubmittedAsync(campaignId, OtherPlayer);
        await _scenario.ApproveAsync(campaignId, secondId);
        var campaign = await LoadCampaignAsync(campaignId);

        var result = await QueryAsync(campaign, SkillTarget("Spot Hidden"), secondId, firstId);

        Assert.Null(result.Refusal);
        Assert.Equal([secondId, firstId], result.Values.Select(value => value.InvestigatorId));
        Assert.All(result.Values, value => Assert.Equal(45, value.Value));
    }

    [Fact]
    public async Task Given_an_unknown_skill_When_querying_Then_it_is_refused_and_no_value_is_returned()
    {
        var (campaignId, investigatorId) = await ApprovedInvestigatorAsync(Player);
        var campaign = await LoadCampaignAsync(campaignId);

        var result = await QueryAsync(campaign, SkillTarget("Fictional Skill"), investigatorId);

        Assert.Equal(TargetValueRefusal.UnknownTarget, result.Refusal);
        Assert.Empty(result.Values);
    }

    [Fact]
    public async Task Given_a_skill_needing_a_specialization_When_querying_without_one_Then_it_is_refused()
    {
        var (campaignId, investigatorId) = await ApprovedInvestigatorAsync(Player);
        var campaign = await LoadCampaignAsync(campaignId);

        var result = await QueryAsync(campaign, SkillTarget("Art/Craft"), investigatorId);

        Assert.Equal(TargetValueRefusal.SpecializationRequired, result.Refusal);
        Assert.Empty(result.Values);
    }

    [Fact]
    public async Task Given_a_skill_with_a_disallowed_specialization_When_querying_Then_it_is_refused()
    {
        var (campaignId, investigatorId) = await ApprovedInvestigatorAsync(Player);
        var campaign = await LoadCampaignAsync(campaignId);

        var result = await QueryAsync(campaign, SkillTarget("Firearms", "Laser"), investigatorId);

        Assert.Equal(TargetValueRefusal.SpecializationNotAllowed, result.Refusal);
        Assert.Empty(result.Values);
    }

    [Fact]
    public async Task Given_a_draft_investigator_or_an_unknown_id_When_querying_Then_it_is_refused_as_not_approved()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, Player);
        var draftId = await _scenario.CreateDraftAsync(campaignId, Player);
        var campaign = await LoadCampaignAsync(campaignId);

        var draft = await QueryAsync(campaign, SkillTarget("Spot Hidden"), draftId);
        var unknown = await QueryAsync(campaign, SkillTarget("Spot Hidden"), Guid.NewGuid());

        Assert.Equal(TargetValueRefusal.InvestigatorNotApproved, draft.Refusal);
        Assert.Equal(TargetValueRefusal.InvestigatorNotApproved, unknown.Refusal);
    }
}
