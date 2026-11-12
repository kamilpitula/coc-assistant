namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// The provider service Scene Play calls for Roll Requests (PBI-DICE-005 design record, step 6): creating on the Active Scene,
/// finding, listing the Active Scene's requests oldest first, listing one Investigator's Waiting rolls, and rolling with the
/// server's dice. Every call is scoped to the Campaign.
/// </summary>
public class SceneRollRequestServiceTests : IDisposable
{
    private static readonly Guid Harvey = SceneStartExtensions.Harvey;
    private static readonly Guid Lucy = SceneStartExtensions.Lucy;
    private static readonly Guid[] Present = [Harvey, Lucy];
    private static readonly Guid[] Approved = [Harvey, Lucy];
    private static readonly Guid Roller = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly RollTarget SpotHidden = new(RollTargetKind.Skill, skill: "Spot Hidden");

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private static RequestedRollInput Input(Guid investigator, int target = 60) =>
        new(investigator, target, UsesBaseValue: false, CanEarnExperienceCheck: true);

    private SceneRollRequestService Service(
        ScenarioPreparationDbContext context,
        ISceneRepository? scenes = null,
        ISceneRollRequestRepository? requests = null,
        IDiceRoller? roller = null) =>
        new(
            scenes ?? new EfSceneRepository(context),
            requests ?? new EfSceneRollRequestRepository(context),
            roller ?? new ScriptedRoller(2, 5),
            _builder.TimeProvider);

    private async Task<(Guid ScenarioId, Guid SceneId)> ActiveSceneAsync(Guid[]? present = null, Guid? campaignId = null)
    {
        var campaign = campaignId ?? _builder.CampaignId;
        var scenario = await _builder.CreateScenarioAsync(campaign, "The Haunting");
        var scene = await _builder.CreateSceneAsync(campaign, scenario.Id, "The Corbitt House");
        using var context = _builder.Fixture.CreateContext();
        var start = await _builder.CreateLifecycleService(context)
            .StartAsync(campaign, scene.Id, present ?? Present, Approved, false, CancellationToken.None);
        Assert.Equal(SceneStartOutcome.Started, start.Outcome);
        return (scenario.Id, scene.Id);
    }

    private async Task<RollRequestWriteResult> CreateAsync(
        Guid sceneId,
        IReadOnlyList<RequestedRollInput>? investigators = null,
        RollTarget? target = null,
        Guid? campaignId = null,
        ISceneRollRequestRepository? requests = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await Service(context, requests: requests).CreateAsync(
            campaignId ?? _builder.CampaignId,
            target ?? SpotHidden,
            "Something moves upstairs.",
            RollRequestVisibility.Public,
            Difficulty.Regular,
            0,
            0,
            investigators ?? [Input(Harvey)],
            CancellationToken.None);
    }

    private async Task<RequestedRollWriteResult> RollAsync(Guid requestId, Guid investigator, Guid? campaignId = null, IDiceRoller? roller = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await Service(context, roller: roller).RollAsync(
            campaignId ?? _builder.CampaignId, requestId, investigator, Roller, CancellationToken.None);
    }

    private async Task<int> StoredRequestCountAsync()
    {
        using var context = _builder.Fixture.CreateContext();
        return await context.Set<RollRequest>().CountAsync();
    }

    /// <summary>An <see cref="ISceneRollRequestRepository"/> whose save always loses the race.</summary>
    private sealed class ConflictingRequests(ISceneRollRequestRepository inner) : ISceneRollRequestRepository
    {
        public void Add(RollRequest request) => inner.Add(request);

        public Task<RollRequest?> FindAsync(Guid campaignId, Guid requestId, CancellationToken cancellationToken) =>
            inner.FindAsync(campaignId, requestId, cancellationToken);

        public Task<IReadOnlyList<RollRequest>> ListForSceneAsync(Guid campaignId, Guid sceneId, CancellationToken cancellationToken) =>
            inner.ListForSceneAsync(campaignId, sceneId, cancellationToken);

        public Task SaveChangesAsync(CancellationToken cancellationToken) =>
            throw new RollRequestConcurrencyException(new InvalidOperationException("Lost the race."));
    }

    [Fact]
    public async Task Given_no_active_scene_When_creating_Then_it_is_refused_and_nothing_is_stored()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House");

        var result = await CreateAsync(Guid.NewGuid());

        Assert.Equal(RollRequestWriteOutcome.NoActiveScene, result.Outcome);
        Assert.Null(result.Request);
        Assert.Equal(0, await StoredRequestCountAsync());
    }

    [Fact]
    public async Task Given_an_active_scene_When_creating_Then_it_is_created_and_stored_with_the_snapshot_values()
    {
        var (_, sceneId) = await ActiveSceneAsync();

        var result = await CreateAsync(sceneId, [Input(Harvey, 60), Input(Lucy, 30)]);

        Assert.Equal(RollRequestWriteOutcome.Created, result.Outcome);
        var request = result.Request!;
        Assert.Equal((_builder.CampaignId, sceneId, "Something moves upstairs.", RollRequestVisibility.Public), (request.CampaignId, request.SceneId, request.Message, request.Visibility));
        Assert.Equal(SpotHidden.Skill, request.Target.Skill);
        Assert.Equal([Harvey, Lucy], request.RequestedRolls.Select(roll => roll.InvestigatorId));
        Assert.All(request.RequestedRolls, roll => Assert.Equal(RequestedRollStatus.Waiting, roll.Status));
        Assert.Equal((60, 30), (request.RequestedRolls[0].TargetValue, request.RequestedRolls[1].TargetValue));
        Assert.Equal(1, await StoredRequestCountAsync());
    }

    [Theory]
    [InlineData(RollRequestWriteOutcome.EmptyInvestigators, 0)]
    [InlineData(RollRequestWriteOutcome.DuplicateInvestigator, 1)]
    [InlineData(RollRequestWriteOutcome.InvestigatorNotPresent, 2)]
    [InlineData(RollRequestWriteOutcome.InvalidDice, 3)]
    [InlineData(RollRequestWriteOutcome.MessageTooLong, 4)]
    public async Task Given_a_bad_request_When_creating_Then_the_domain_refusal_is_reported_and_nothing_is_stored(
        RollRequestWriteOutcome outcome, int kind)
    {
        var (_, sceneId) = await ActiveSceneAsync();
        IReadOnlyList<RequestedRollInput> investigators = kind switch
        {
            0 => [],
            1 => [Input(Harvey), Input(Harvey)],
            2 => [Input(Guid.NewGuid())],
            3 => [new RequestedRollInput(Harvey, 60, false, true, BonusDice: 3)],
            _ => [Input(Harvey)],
        };

        RollRequestWriteResult result;
        using (var context = _builder.Fixture.CreateContext())
        {
            result = await Service(context).CreateAsync(
                _builder.CampaignId,
                SpotHidden,
                kind == 4 ? new string('a', RollRequest.MessageMaxLength + 1) : null,
                RollRequestVisibility.Public,
                Difficulty.Regular,
                0,
                0,
                investigators,
                CancellationToken.None);
        }

        Assert.Equal(outcome, result.Outcome);
        Assert.Null(result.Request);
        Assert.Equal(0, await StoredRequestCountAsync());
    }

    [Fact]
    public async Task Given_a_lost_save_race_When_creating_Then_it_is_a_conflict()
    {
        var (_, sceneId) = await ActiveSceneAsync();
        using var context = _builder.Fixture.CreateContext();
        var result = await Service(context, requests: new ConflictingRequests(new EfSceneRollRequestRepository(context))).CreateAsync(
            _builder.CampaignId, SpotHidden, null, RollRequestVisibility.Public, Difficulty.Regular, 0, 0, [Input(Harvey)], CancellationToken.None);

        Assert.Equal(RollRequestWriteOutcome.Conflict, result.Outcome);
    }

    [Fact]
    public async Task Given_a_request_of_another_campaign_When_finding_Then_it_is_not_found()
    {
        var (_, sceneId) = await ActiveSceneAsync();
        var created = await CreateAsync(sceneId);

        using var context = _builder.Fixture.CreateContext();
        var service = Service(context);

        Assert.Null(await service.FindAsync(_builder.OtherCampaignOfSameKeeperId, created.Request!.Id, CancellationToken.None));
        Assert.NotNull(await service.FindAsync(_builder.CampaignId, created.Request.Id, CancellationToken.None));
    }

    [Fact]
    public async Task Given_two_requests_When_listing_for_the_active_scene_Then_the_oldest_comes_first()
    {
        var (_, sceneId) = await ActiveSceneAsync();
        var first = await CreateAsync(sceneId);
        _builder.TimeProvider.Advance(TimeSpan.FromMinutes(1));
        var second = await CreateAsync(sceneId);

        using var context = _builder.Fixture.CreateContext();
        var listed = await Service(context).ListForActiveSceneAsync(_builder.CampaignId, CancellationToken.None);

        Assert.Equal([first.Request!.Id, second.Request!.Id], listed.Select(request => request.Id));
    }

    [Fact]
    public async Task Given_no_active_scene_When_listing_Then_the_lists_are_empty()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House");

        using var context = _builder.Fixture.CreateContext();
        var service = Service(context);

        Assert.Empty(await service.ListForActiveSceneAsync(_builder.CampaignId, CancellationToken.None));
        Assert.Empty(await service.ListWaitingForInvestigatorAsync(_builder.CampaignId, Harvey, CancellationToken.None));
    }

    [Fact]
    public async Task Given_waiting_and_rolled_rolls_When_listing_mine_Then_only_my_waiting_come_oldest_first_with_their_request()
    {
        var (_, sceneId) = await ActiveSceneAsync();
        var first = await CreateAsync(sceneId, [Input(Harvey), Input(Lucy)]);
        _builder.TimeProvider.Advance(TimeSpan.FromMinutes(1));
        var second = await CreateAsync(sceneId, [Input(Lucy, 70)]);
        _builder.TimeProvider.Advance(TimeSpan.FromMinutes(1));
        var third = await CreateAsync(sceneId, [Input(Harvey, 45)]);
        Assert.Equal(RequestedRollWriteOutcome.Rolled, (await RollAsync(first.Request!.Id, Harvey)).Outcome);

        using var context = _builder.Fixture.CreateContext();
        var service = Service(context);
        var harvey = await service.ListWaitingForInvestigatorAsync(_builder.CampaignId, Harvey, CancellationToken.None);
        var lucy = await service.ListWaitingForInvestigatorAsync(_builder.CampaignId, Lucy, CancellationToken.None);

        var waiting = Assert.Single(harvey);
        Assert.Equal((third.Request!.Id, SpotHidden.Skill, "Something moves upstairs.", 45), (waiting.RollRequestId, waiting.Target.Skill, waiting.Message, waiting.Roll.TargetValue));
        Assert.Equal(third.Request.CreatedAt, waiting.CreatedAt);
        Assert.Equal([first.Request.Id, second.Request!.Id], lucy.Select(roll => roll.RollRequestId));
    }

    [Fact]
    public async Task Given_a_waiting_roll_When_rolling_Then_it_is_rolled_with_one_record_naming_the_roller_and_the_time()
    {
        var (_, sceneId) = await ActiveSceneAsync();
        var created = await CreateAsync(sceneId);
        var before = _builder.TimeProvider.GetUtcNow();

        var result = await RollAsync(created.Request!.Id, Harvey);

        Assert.Equal(RequestedRollWriteOutcome.Rolled, result.Outcome);
        var roll = result.Roll!;
        Assert.Equal(RequestedRollStatus.Rolled, roll.Status);
        var record = Assert.Single(roll.RollRecords);
        Assert.Equal($"RollRequest:{created.Request.Id}:{Harvey}", record.Purpose);
        Assert.Equal(25, record.Result);
        Assert.Equal(Roller, record.RolledByAccountId);
        Assert.True(record.RolledAt >= before);
        Assert.True(record.EarnsExperienceCheck);
    }

    [Fact]
    public async Task Given_a_finished_scene_When_rolling_Then_it_is_refused_and_the_roll_stays_waiting()
    {
        var (_, sceneId) = await ActiveSceneAsync();
        var created = await CreateAsync(sceneId);
        using (var context = _builder.Fixture.CreateContext())
        {
            Assert.Equal(SceneFinishOutcome.Finished, (await _builder.CreateLifecycleService(context).FinishActiveAsync(_builder.CampaignId, CancellationToken.None)).Outcome);
        }

        var result = await RollAsync(created.Request!.Id, Harvey);

        Assert.Equal(RequestedRollWriteOutcome.SceneNotActive, result.Outcome);
        Assert.Null(result.Roll);
        using var stored = _builder.Fixture.CreateContext();
        var storedRequest = await Service(stored).FindAsync(_builder.CampaignId, created.Request.Id, CancellationToken.None);
        Assert.Equal(RequestedRollStatus.Waiting, storedRequest!.RequestedRolls.Single().Status);
    }

    [Fact]
    public async Task Given_an_unknown_request_or_investigator_When_rolling_Then_it_is_not_found_or_not_requested()
    {
        var (_, sceneId) = await ActiveSceneAsync();
        var created = await CreateAsync(sceneId);

        Assert.Equal(RequestedRollWriteOutcome.NotFound, (await RollAsync(Guid.NewGuid(), Harvey)).Outcome);
        var result = await RollAsync(created.Request!.Id, Guid.NewGuid());

        Assert.Equal(RequestedRollWriteOutcome.InvestigatorNotRequested, result.Outcome);
        Assert.Null(result.Roll);
    }

    [Fact]
    public async Task Given_a_rolled_roll_When_rolling_Then_it_is_not_waiting()
    {
        var (_, sceneId) = await ActiveSceneAsync();
        var created = await CreateAsync(sceneId);
        Assert.Equal(RequestedRollWriteOutcome.Rolled, (await RollAsync(created.Request!.Id, Harvey)).Outcome);

        var second = await RollAsync(created.Request!.Id, Harvey, roller: new ScriptedRoller(3, 6));

        Assert.Equal(RequestedRollWriteOutcome.NotWaiting, second.Outcome);
        Assert.Null(second.Roll);
    }

    [Fact]
    public async Task Given_a_lost_save_race_When_rolling_Then_it_is_not_waiting()
    {
        var (_, sceneId) = await ActiveSceneAsync();
        var created = await CreateAsync(sceneId);
        using var context = _builder.Fixture.CreateContext();
        var service = Service(context, requests: new ConflictingRequests(new EfSceneRollRequestRepository(context)));

        var result = await service.RollAsync(_builder.CampaignId, created.Request!.Id, Harvey, Roller, CancellationToken.None);

        Assert.Equal(RequestedRollWriteOutcome.NotWaiting, result.Outcome);
        Assert.Null(result.Roll);
    }
}
