namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Starting, finishing, and re-staffing Scenes through the provider service Scene Play calls (specs/scene-play/spec.md; ADR 0024,
/// ADR 0025): the check order, finish-then-start in one save, and the races that become conflicts.
/// </summary>
public class SceneLifecycleServiceTests : IDisposable
{
    private static readonly Guid Harvey = SceneStartExtensions.Harvey;
    private static readonly Guid Lucy = SceneStartExtensions.Lucy;
    private static readonly Guid[] Approved = [SceneStartExtensions.Harvey, SceneStartExtensions.Lucy];

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid MeetingKnott, Guid CorbittHouse)> TwoScenesAsync(Guid? campaignId = null)
    {
        var campaign = campaignId ?? _builder.CampaignId;
        var scenario = await _builder.CreateScenarioAsync(campaign, "The Haunting");
        var meetingKnott = await _builder.CreateSceneAsync(campaign, scenario.Id, "Meeting Knott", "Arkham");
        var corbittHouse = await _builder.CreateSceneAsync(campaign, scenario.Id, "The Corbitt House", "Boston Road");
        return (scenario.Id, meetingKnott.Id, corbittHouse.Id);
    }

    private async Task<SceneStartResult> StartAsync(
        Guid sceneId,
        Guid[]? present = null,
        bool finishActiveScene = false,
        ISceneRepository? repository = null,
        Guid? campaignId = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateLifecycleService(context, repository)
            .StartAsync(campaignId ?? _builder.CampaignId, sceneId, present ?? [Harvey], Approved, finishActiveScene, CancellationToken.None);
    }

    private async Task<SceneFinishResult> FinishAsync(ISceneRepository? repository = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateLifecycleService(context, repository).FinishActiveAsync(_builder.CampaignId, CancellationToken.None);
    }

    private async Task<InvestigatorsPresentResult> ReplaceAsync(params Guid[] present)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateLifecycleService(context).ReplaceInvestigatorsPresentAsync(_builder.CampaignId, present, Approved, CancellationToken.None);
    }

    private async Task<IReadOnlyList<PlayableSceneView>> ListPlayedAsync(Guid? campaignId = null, IScenarioRepository? scenarios = null)
    {
        using var context = _builder.Fixture.CreateContext();
        var service = scenarios is null
            ? _builder.CreateLifecycleService(context)
            : new SceneLifecycleService(new EfSceneRepository(context), scenarios, new EfSceneRollRequestRepository(context), _builder.TimeProvider);
        return await service.ListPlayedAsync(campaignId ?? _builder.CampaignId, CancellationToken.None);
    }

    /// <summary>Counts the Scenario lookups behind a history listing; finding one Scenario by id must never be needed.</summary>
    private sealed class CountingScenarios(IScenarioRepository inner) : IScenarioRepository
    {
        public int ListedForCampaign { get; private set; }

        public void Add(Scenario scenario) => inner.Add(scenario);

        public Task<IReadOnlyList<Scenario>> ListForCampaignAsync(Guid campaignId, CancellationToken cancellationToken)
        {
            ListedForCampaign++;
            return inner.ListForCampaignAsync(campaignId, cancellationToken);
        }

        public Task<IReadOnlyList<Scenario>> ListTrackedForCampaignAsync(Guid campaignId, CancellationToken cancellationToken) =>
            inner.ListTrackedForCampaignAsync(campaignId, cancellationToken);

        public Task<Scenario?> FindByIdAsync(Guid campaignId, Guid scenarioId, CancellationToken cancellationToken) =>
            throw new InvalidOperationException("The history lists every played Scene with one Scenario lookup.");

        public Task<int> MaxPositionAsync(Guid campaignId, CancellationToken cancellationToken) => inner.MaxPositionAsync(campaignId, cancellationToken);

        public Task SaveChangesAsync(CancellationToken cancellationToken) => inner.SaveChangesAsync(cancellationToken);
    }

    [Fact]
    public async Task Given_played_scenes_of_two_scenarios_When_listing_played_Then_prepared_are_excluded_and_the_newest_started_come_first()
    {
        var haunting = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        await _builder.CreateSceneAsync(_builder.CampaignId, haunting.Id, "Meeting Knott");
        var corbittHouse = await _builder.CreateSceneAsync(_builder.CampaignId, haunting.Id, "The Corbitt House");
        var dunwich = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Dunwich Horror");
        var strangeHouse = await _builder.CreateSceneAsync(_builder.CampaignId, dunwich.Id, "The Strange High House");
        var festival = await _builder.CreateSceneAsync(_builder.CampaignId, dunwich.Id, "The Festival");
        var (_, _, otherCampaignPlayed) = await TwoScenesAsync(_builder.OtherCampaignOfSameKeeperId);
        _builder.TimeProvider.Advance(TimeSpan.FromMinutes(1));
        await StartAsync(corbittHouse.Id);
        _builder.TimeProvider.Advance(TimeSpan.FromMinutes(1));
        await FinishAsync();
        _builder.TimeProvider.Advance(TimeSpan.FromMinutes(1));
        await StartAsync(strangeHouse.Id);
        _builder.TimeProvider.Advance(TimeSpan.FromMinutes(1));
        await StartAsync(festival.Id, finishActiveScene: true);
        await StartAsync(otherCampaignPlayed, campaignId: _builder.OtherCampaignOfSameKeeperId);

        using var context = _builder.Fixture.CreateContext();
        var scenarios = new CountingScenarios(new EfScenarioRepository(context));
        var played = await ListPlayedAsync(scenarios: scenarios);

        Assert.Equal(1, scenarios.ListedForCampaign);
        Assert.Equal(
            [
                (festival.Id, "The Dunwich Horror", "The Festival", SceneStatus.Active),
                (strangeHouse.Id, "The Dunwich Horror", "The Strange High House", SceneStatus.Finished),
                (corbittHouse.Id, "The Haunting", "The Corbitt House", SceneStatus.Finished),
            ],
            played.Select(scene => (scene.SceneId, scene.ScenarioTitle, scene.Title, scene.Status)));
        Assert.All(played, scene => Assert.NotNull(scene.StartedAt));
        Assert.Null(played[0].FinishedAt);
        Assert.Equal(played[0].StartedAt, played[1].FinishedAt);
    }

    [Fact]
    public async Task Given_an_active_and_a_finished_scene_started_at_the_same_time_When_listing_played_Then_the_active_scene_comes_first()
    {
        var (_, first, second) = await TwoScenesAsync();
        await StartAsync(first);
        await FinishAsync();
        await StartAsync(second);

        var played = await ListPlayedAsync();

        Assert.Equal([second, first], played.Select(scene => scene.SceneId));
    }

    private async Task<Scene> StoredAsync(Guid sceneId, Guid? campaignId = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await new EfSceneRepository(context).FindForPlayAsync(campaignId ?? _builder.CampaignId, sceneId, CancellationToken.None)
            ?? throw new InvalidOperationException("The Scene is not stored.");
    }

    private async Task<List<(string Title, SceneStatus Status)>> StoredStatusesAsync()
    {
        using var context = _builder.Fixture.CreateContext();
        var scenes = await context.Scenes.ToListAsync();
        return scenes.OrderBy(scene => scene.Title, StringComparer.Ordinal).Select(scene => (scene.Title, scene.Status)).ToList();
    }

    [Fact]
    public async Task Given_a_prepared_scene_When_started_Then_it_is_active_with_the_present_investigators_stored()
    {
        var (_, _, corbittHouse) = await TwoScenesAsync();

        var result = await StartAsync(corbittHouse, [Lucy, Harvey]);

        Assert.Equal(SceneStartOutcome.Started, result.Outcome);
        Assert.Null(result.Finished);
        Assert.Equal(("The Haunting", "The Corbitt House", "Boston Road", SceneStatus.Active), (result.Started!.ScenarioTitle, result.Started.Title, result.Started.Location, result.Started.Status));
        var stored = await StoredAsync(corbittHouse);
        Assert.Equal((SceneStatus.Active, 1), (stored.Status, stored.Version));
        Assert.Equal(new[] { Harvey, Lucy }.Order(), stored.InvestigatorsPresent);
    }

    [Fact]
    public async Task Given_the_second_scene_of_a_scenario_When_started_Then_the_first_stays_prepared()
    {
        var (_, _, corbittHouse) = await TwoScenesAsync();

        await StartAsync(corbittHouse);

        Assert.Equal([("Meeting Knott", SceneStatus.Prepared), ("The Corbitt House", SceneStatus.Active)], await StoredStatusesAsync());
    }

    [Fact]
    public async Task Given_a_scene_of_another_campaign_or_an_unknown_id_When_started_Then_it_is_not_found_and_nothing_changes()
    {
        var (_, _, corbittHouse) = await TwoScenesAsync(_builder.OtherCampaignOfSameKeeperId);

        Assert.Equal(SceneStartOutcome.SceneNotFound, (await StartAsync(corbittHouse)).Outcome);
        Assert.Equal(SceneStartOutcome.SceneNotFound, (await StartAsync(Guid.NewGuid())).Outcome);
        Assert.Equal(SceneStatus.Prepared, (await StoredAsync(corbittHouse, _builder.OtherCampaignOfSameKeeperId)).Status);
    }

    [Fact]
    public async Task Given_a_scene_that_is_not_prepared_When_started_Then_it_is_refused_as_not_prepared_even_with_an_empty_list()
    {
        var (_, meetingKnott, _) = await TwoScenesAsync();
        await StartAsync(meetingKnott);

        var result = await StartAsync(meetingKnott, [], finishActiveScene: true);

        Assert.Equal(SceneStartOutcome.NotPrepared, result.Outcome);
        Assert.Equal(SceneStatus.Active, (await StoredAsync(meetingKnott)).Status);
    }

    [Fact]
    public async Task Given_another_scene_is_active_When_started_without_finishing_it_Then_the_start_is_refused_and_both_scenes_are_unchanged()
    {
        var (_, meetingKnott, corbittHouse) = await TwoScenesAsync();
        await StartAsync(meetingKnott);

        var result = await StartAsync(corbittHouse);

        Assert.Equal(SceneStartOutcome.ActiveSceneExists, result.Outcome);
        Assert.Equal([("Meeting Knott", SceneStatus.Active), ("The Corbitt House", SceneStatus.Prepared)], await StoredStatusesAsync());
    }

    [Fact]
    public async Task Given_another_scene_is_active_and_an_empty_list_When_started_without_finishing_Then_the_active_scene_conflict_is_reported_before_the_list()
    {
        var (_, meetingKnott, corbittHouse) = await TwoScenesAsync();
        await StartAsync(meetingKnott);

        Assert.Equal(SceneStartOutcome.ActiveSceneExists, (await StartAsync(corbittHouse, [])).Outcome);
    }

    [Fact]
    public async Task Given_another_scene_is_active_When_started_and_asked_to_finish_it_Then_it_is_finished_and_the_new_scene_is_active_in_one_save()
    {
        var (_, meetingKnott, corbittHouse) = await TwoScenesAsync();
        await StartAsync(meetingKnott);
        _builder.TimeProvider.Advance(TimeSpan.FromHours(1));
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context));

        var result = await StartAsync(corbittHouse, [Lucy], finishActiveScene: true, repository: racing);

        Assert.Equal(SceneStartOutcome.Started, result.Outcome);
        Assert.Equal("Meeting Knott", result.Finished!.Title);
        Assert.Equal("The Corbitt House", result.Started!.Title);
        Assert.Equal([nameof(ISceneRepository.FindActiveAsync), nameof(ISceneRepository.FindForPlayAsync), nameof(ISceneRepository.SaveFinishThenStartAsync)], racing.Calls);
        Assert.Equal([("Meeting Knott", SceneStatus.Finished), ("The Corbitt House", SceneStatus.Active)], await StoredStatusesAsync());
        var finished = await StoredAsync(meetingKnott);
        Assert.Equal([Harvey], finished.InvestigatorsPresent);
        Assert.Equal(result.Started.StartedAt, finished.FinishedAt);
    }

    [Fact]
    public async Task Given_no_scene_is_active_When_started_and_asked_to_finish_Then_it_is_a_plain_start()
    {
        var (_, _, corbittHouse) = await TwoScenesAsync();

        var result = await StartAsync(corbittHouse, finishActiveScene: true);

        Assert.Equal(SceneStartOutcome.Started, result.Outcome);
        Assert.Null(result.Finished);
    }

    [Theory]
    [InlineData(0, SceneStartOutcome.NoInvestigatorPresent)]
    [InlineData(1, SceneStartOutcome.DuplicateInvestigator)]
    [InlineData(2, SceneStartOutcome.InvestigatorNotApproved)]
    public async Task Given_an_unacceptable_present_list_When_started_Then_the_matching_outcome_is_returned_and_the_active_scene_is_not_finished(int case_, SceneStartOutcome expected)
    {
        var (_, meetingKnott, corbittHouse) = await TwoScenesAsync();
        await StartAsync(meetingKnott);
        Guid[][] lists = [[], [Harvey, Harvey], [Guid.NewGuid()]];

        var result = await StartAsync(corbittHouse, lists[case_], finishActiveScene: true);

        Assert.Equal(expected, result.Outcome);
        Assert.Equal([("Meeting Knott", SceneStatus.Active), ("The Corbitt House", SceneStatus.Prepared)], await StoredStatusesAsync());
    }

    [Fact]
    public async Task Given_two_different_scenes_started_at_the_same_time_When_the_second_saves_Then_it_conflicts_and_exactly_one_is_active()
    {
        var (_, meetingKnott, corbittHouse) = await TwoScenesAsync();
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context))
        {
            BeforeSave = async () => Assert.Equal(SceneStartOutcome.Started, (await StartAsync(meetingKnott)).Outcome),
        };

        var result = await StartAsync(corbittHouse, repository: racing);

        Assert.Equal(SceneStartOutcome.Conflict, result.Outcome);
        Assert.Equal([("Meeting Knott", SceneStatus.Active), ("The Corbitt House", SceneStatus.Prepared)], await StoredStatusesAsync());
    }

    [Fact]
    public async Task Given_the_same_scene_started_at_the_same_time_When_the_second_saves_Then_it_conflicts_and_the_winners_present_set_stands()
    {
        var (_, _, corbittHouse) = await TwoScenesAsync();
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context))
        {
            BeforeSave = async () => Assert.Equal(SceneStartOutcome.Started, (await StartAsync(corbittHouse, [Lucy])).Outcome),
        };

        var result = await StartAsync(corbittHouse, [Harvey], repository: racing);

        Assert.Equal(SceneStartOutcome.Conflict, result.Outcome);
        Assert.Equal([Lucy], (await StoredAsync(corbittHouse)).InvestigatorsPresent);
    }

    [Fact]
    public async Task Given_the_active_scene_finishes_during_a_finish_then_start_When_saving_Then_it_conflicts_and_nothing_is_retried()
    {
        var (_, meetingKnott, corbittHouse) = await TwoScenesAsync();
        await StartAsync(meetingKnott);
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context))
        {
            BeforeSave = async () => Assert.Equal(SceneFinishOutcome.Finished, (await FinishAsync()).Outcome),
        };

        var result = await StartAsync(corbittHouse, finishActiveScene: true, repository: racing);

        Assert.Equal(SceneStartOutcome.Conflict, result.Outcome);
        Assert.Equal([("Meeting Knott", SceneStatus.Finished), ("The Corbitt House", SceneStatus.Prepared)], await StoredStatusesAsync());
    }

    [Fact]
    public async Task Given_the_active_scene_id_sorts_before_or_after_the_new_scene_id_When_finishing_and_starting_Then_both_orders_succeed()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        var ids = new List<Guid>();
        for (var index = 0; index < 6; index++)
        {
            ids.Add((await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, $"Scene {index}")).Id);
        }

        ids.Sort();

        Assert.Equal(SceneStartOutcome.Started, (await StartAsync(ids[0])).Outcome);
        Assert.Equal(SceneStartOutcome.Started, (await StartAsync(ids[5], finishActiveScene: true)).Outcome);
        Assert.Equal(SceneStartOutcome.Started, (await StartAsync(ids[1], finishActiveScene: true)).Outcome);
        var statuses = (await StoredStatusesAsync()).Count(scene => scene.Status == SceneStatus.Active);
        Assert.Equal(1, statuses);
        Assert.Equal(SceneStatus.Finished, (await StoredAsync(ids[0])).Status);
        Assert.Equal(SceneStatus.Finished, (await StoredAsync(ids[5])).Status);
        Assert.Equal(SceneStatus.Active, (await StoredAsync(ids[1])).Status);
    }

    [Fact]
    public async Task Given_the_second_save_of_a_finish_then_start_fails_When_starting_Then_the_old_scene_is_still_active_and_the_new_one_prepared_without_present_rows()
    {
        var (scenarioId, meetingKnott, corbittHouse) = await TwoScenesAsync();
        await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "Third");
        await StartAsync(meetingKnott);
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context))
        {
            // Another Scene becomes Active inside the transaction, after the finish, so the start violates the index.
            BetweenSaves = async () =>
            {
                using var other = _builder.Fixture.CreateContext();
                await other.Database.ExecuteSqlRawAsync("UPDATE Scenes SET Status = 'Active' WHERE Title = 'Third'");
            },
        };

        var result = await StartAsync(corbittHouse, [Harvey], finishActiveScene: true, repository: racing);

        Assert.Equal(SceneStartOutcome.Conflict, result.Outcome);
        Assert.Equal([("Meeting Knott", SceneStatus.Active), ("The Corbitt House", SceneStatus.Prepared), ("Third", SceneStatus.Prepared)], await StoredStatusesAsync());
        Assert.Empty((await StoredAsync(corbittHouse)).InvestigatorsPresent);
    }

    [Fact]
    public async Task Given_the_same_scene_started_at_the_same_time_with_the_same_present_list_When_the_second_saves_Then_it_conflicts()
    {
        var (_, _, corbittHouse) = await TwoScenesAsync();
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context))
        {
            BeforeSave = async () => Assert.Equal(SceneStartOutcome.Started, (await StartAsync(corbittHouse, [Harvey, Lucy])).Outcome),
        };

        var result = await StartAsync(corbittHouse, [Harvey, Lucy], repository: racing);

        Assert.Equal(SceneStartOutcome.Conflict, result.Outcome);
        Assert.Equal(2, (await StoredAsync(corbittHouse)).InvestigatorsPresent.Count);
    }

    [Fact]
    public async Task Given_the_start_would_not_transition_When_saving_finish_then_start_Then_it_throws_and_rolls_the_finish_back()
    {
        var (_, meetingKnott, corbittHouse) = await TwoScenesAsync();
        await StartAsync(meetingKnott);
        using var context = _builder.Fixture.CreateContext();
        var repository = new EfSceneRepository(context);
        var active = await repository.FindActiveAsync(_builder.CampaignId, CancellationToken.None);
        active!.Finish(_builder.TimeProvider.GetUtcNow());

        await Assert.ThrowsAsync<InvalidOperationException>(() => repository.SaveFinishThenStartAsync(() => SceneTransitionOutcome.NotPrepared, CancellationToken.None));

        Assert.Equal([("Meeting Knott", SceneStatus.Active), ("The Corbitt House", SceneStatus.Prepared)], await StoredStatusesAsync());
        Assert.NotEqual(Guid.Empty, corbittHouse);
    }

    [Fact]
    public async Task Given_an_active_scene_When_finished_Then_it_is_finished_and_keeps_its_present_investigators()
    {
        var (_, meetingKnott, _) = await TwoScenesAsync();
        await StartAsync(meetingKnott, [Harvey, Lucy]);

        var result = await FinishAsync();

        Assert.Equal(SceneFinishOutcome.Finished, result.Outcome);
        Assert.Equal(("Meeting Knott", SceneStatus.Finished), (result.Finished!.Title, result.Finished.Status));
        var stored = await StoredAsync(meetingKnott);
        Assert.Equal(2, stored.InvestigatorsPresent.Count);
        Assert.NotNull(stored.FinishedAt);
    }

    [Fact]
    public async Task Given_no_active_scene_When_finishing_Then_there_is_no_active_scene()
    {
        await TwoScenesAsync();

        Assert.Equal(SceneFinishOutcome.NoActiveScene, (await FinishAsync()).Outcome);
    }

    [Fact]
    public async Task Given_the_active_scene_is_finished_by_a_second_tab_When_finishing_Then_it_conflicts()
    {
        var (_, meetingKnott, _) = await TwoScenesAsync();
        await StartAsync(meetingKnott);
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context))
        {
            BeforeSave = async () => Assert.Equal(SceneFinishOutcome.Finished, (await FinishAsync()).Outcome),
        };

        Assert.Equal(SceneFinishOutcome.Conflict, (await FinishAsync(racing)).Outcome);
    }

    [Fact]
    public async Task Given_an_active_scene_When_the_present_set_is_replaced_Then_the_stored_set_is_exactly_the_new_one()
    {
        var (_, meetingKnott, _) = await TwoScenesAsync();
        await StartAsync(meetingKnott, [Harvey]);

        var result = await ReplaceAsync(Lucy);

        Assert.Equal(InvestigatorsPresentOutcome.Replaced, result.Outcome);
        Assert.Equal([Lucy], result.Scene!.InvestigatorsPresent);
        Assert.Equal([Lucy], (await StoredAsync(meetingKnott)).InvestigatorsPresent);
    }

    [Fact]
    public async Task Given_an_active_scene_When_replacing_with_an_unacceptable_list_Then_the_matching_outcome_is_returned_and_the_set_is_kept()
    {
        var (_, meetingKnott, _) = await TwoScenesAsync();
        await StartAsync(meetingKnott, [Harvey]);

        Assert.Equal(InvestigatorsPresentOutcome.NoInvestigatorPresent, (await ReplaceAsync()).Outcome);
        Assert.Equal(InvestigatorsPresentOutcome.DuplicateInvestigator, (await ReplaceAsync(Lucy, Lucy)).Outcome);
        Assert.Equal(InvestigatorsPresentOutcome.InvestigatorNotApproved, (await ReplaceAsync(Guid.NewGuid())).Outcome);
        Assert.Equal([Harvey], (await StoredAsync(meetingKnott)).InvestigatorsPresent);
    }

    [Fact]
    public async Task Given_no_active_scene_When_replacing_the_present_set_Then_there_is_no_active_scene_before_the_list_is_checked()
    {
        await TwoScenesAsync();

        Assert.Equal(InvestigatorsPresentOutcome.NoActiveScene, (await ReplaceAsync()).Outcome);
    }

    [Fact]
    public async Task Given_the_scene_finishes_during_a_replace_When_saving_Then_it_conflicts_and_the_set_is_kept()
    {
        var (_, meetingKnott, _) = await TwoScenesAsync();
        await StartAsync(meetingKnott, [Harvey]);
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context))
        {
            BeforeSave = async () => await FinishAsync(),
        };

        var result = await _builder.CreateLifecycleService(context, racing).ReplaceInvestigatorsPresentAsync(_builder.CampaignId, [Lucy], Approved, CancellationToken.None);

        Assert.Equal(InvestigatorsPresentOutcome.Conflict, result.Outcome);
        Assert.Equal([Harvey], (await StoredAsync(meetingKnott)).InvestigatorsPresent);
    }

    [Fact]
    public async Task Given_a_campaign_with_an_active_scene_When_asking_for_it_Then_only_that_campaigns_active_scene_is_returned()
    {
        var (_, meetingKnott, _) = await TwoScenesAsync();
        await TwoScenesAsync(_builder.OtherCampaignOfSameKeeperId);
        await StartAsync(meetingKnott);
        using var context = _builder.Fixture.CreateContext();
        var service = _builder.CreateLifecycleService(context);

        Assert.Equal(meetingKnott, (await service.FindActiveAsync(_builder.CampaignId, CancellationToken.None))!.SceneId);
        Assert.Null(await service.FindActiveAsync(_builder.OtherCampaignOfSameKeeperId, CancellationToken.None));
        Assert.Null(await service.FindAsync(_builder.OtherCampaignOfSameKeeperId, meetingKnott, CancellationToken.None));
        Assert.Equal(SceneStatus.Active, (await service.FindAsync(_builder.CampaignId, meetingKnott, CancellationToken.None))!.Status);
    }

    [Fact]
    public async Task Given_an_active_scene_in_each_of_two_campaigns_When_started_Then_both_are_allowed()
    {
        var first = await TwoScenesAsync();
        var second = await TwoScenesAsync(_builder.OtherCampaignOfSameKeeperId);

        Assert.Equal(SceneStartOutcome.Started, (await StartAsync(first.MeetingKnott)).Outcome);
        Assert.Equal(SceneStartOutcome.Started, (await StartAsync(second.MeetingKnott, campaignId: _builder.OtherCampaignOfSameKeeperId)).Outcome);
    }

    [Fact]
    public async Task Given_a_prepared_scene_When_removed_after_another_was_played_Then_only_its_own_present_rows_are_unaffected()
    {
        var (scenarioId, meetingKnott, corbittHouse) = await TwoScenesAsync();
        await StartAsync(meetingKnott, [Harvey, Lucy]);

        using (var context = _builder.Fixture.CreateContext())
        {
            var outcome = await _builder.CreateSceneService(context).RemoveAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, scenarioId, corbittHouse, CancellationToken.None);
            Assert.Equal(SceneRemoveOutcome.Removed, outcome);
        }

        using var check = _builder.Fixture.CreateContext();
        Assert.Equal(2, await check.Set<InvestigatorPresence>().CountAsync());
    }

    private static readonly RollTarget SpotHidden = new(RollTargetKind.Skill, skill: "Spot Hidden");
    private static readonly Guid Roller = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");

    private async Task<Guid> RequestRollsAsync(params Guid[] investigators)
    {
        using var context = _builder.Fixture.CreateContext();
        var result = await new SceneRollRequestService(
            new EfSceneRepository(context),
            new EfSceneRollRequestRepository(context),
            new ScriptedRoller(2, 5),
            _builder.TimeProvider).CreateAsync(
                _builder.CampaignId,
                SpotHidden,
                null,
                RollRequestVisibility.Public,
                Difficulty.Regular,
                0,
                0,
                investigators.Select(investigator => new RequestedRollInput(investigator, 60, false, true)).ToList(),
                Roller,
                CancellationToken.None);
        Assert.Equal(RollRequestWriteOutcome.Created, result.Outcome);
        return result.Request!.Id;
    }

    private async Task<IReadOnlyList<RequestedRoll>> StoredRollsAsync(Guid requestId)
    {
        using var context = _builder.Fixture.CreateContext();
        var request = (await new EfSceneRollRequestRepository(context).FindAsync(_builder.CampaignId, requestId, CancellationToken.None))!;
        return request.RequestedRolls;
    }

    [Fact]
    public async Task Given_waiting_rolls_When_finishing_Then_every_waiting_roll_is_cancelled_in_the_same_save()
    {
        var (_, meetingKnott, _) = await TwoScenesAsync();
        await StartAsync(meetingKnott, [Harvey, Lucy]);
        var requestId = await RequestRollsAsync(Harvey, Lucy);

        var finish = await FinishAsync();

        Assert.Equal(SceneFinishOutcome.Finished, finish.Outcome);
        Assert.Equal(
            [(requestId, Harvey, RollRequestVisibility.Public), (requestId, Lucy, RollRequestVisibility.Public)],
            finish.CancelledRolls.Select(cancelled => (cancelled.RollRequestId, cancelled.InvestigatorId, cancelled.Visibility)));
        Assert.All(await StoredRollsAsync(requestId), roll => Assert.Equal(RequestedRollStatus.Cancelled, roll.Status));
    }

    [Fact]
    public async Task Given_a_rolled_and_a_waiting_roll_When_finishing_Then_only_the_waiting_roll_is_cancelled()
    {
        var (_, meetingKnott, _) = await TwoScenesAsync();
        await StartAsync(meetingKnott, [Harvey, Lucy]);
        var requestId = await RequestRollsAsync(Harvey, Lucy);
        using (var context = _builder.Fixture.CreateContext())
        {
            var rolled = await new SceneRollRequestService(
                new EfSceneRepository(context),
                new EfSceneRollRequestRepository(context),
                new ScriptedRoller(2, 5),
                _builder.TimeProvider).RollAsync(_builder.CampaignId, requestId, Harvey, Roller, CancellationToken.None);
            Assert.Equal(RequestedRollWriteOutcome.Rolled, rolled.Outcome);
        }

        var finish = await FinishAsync();

        Assert.Equal(SceneFinishOutcome.Finished, finish.Outcome);
        Assert.Equal([(requestId, Lucy)], finish.CancelledRolls.Select(cancelled => (cancelled.RollRequestId, cancelled.InvestigatorId)));
        var stored = await StoredRollsAsync(requestId);
        Assert.Equal(RequestedRollStatus.Rolled, stored.Single(roll => roll.InvestigatorId == Harvey).Status);
        Assert.Equal(RequestedRollStatus.Cancelled, stored.Single(roll => roll.InvestigatorId == Lucy).Status);
    }

    [Fact]
    public async Task Given_waiting_rolls_When_replacing_present_Then_only_the_removed_investigators_rolls_cancel()
    {
        var (_, meetingKnott, _) = await TwoScenesAsync();
        await StartAsync(meetingKnott, [Harvey, Lucy]);
        var requestId = await RequestRollsAsync(Harvey, Lucy);

        var replaced = await ReplaceAsync(Harvey);

        Assert.Equal(InvestigatorsPresentOutcome.Replaced, replaced.Outcome);
        Assert.Equal([(requestId, Lucy)], replaced.CancelledRolls.Select(cancelled => (cancelled.RollRequestId, cancelled.InvestigatorId)));
        var stored = await StoredRollsAsync(requestId);
        Assert.Equal(RequestedRollStatus.Waiting, stored.Single(roll => roll.InvestigatorId == Harvey).Status);
        Assert.Equal(RequestedRollStatus.Cancelled, stored.Single(roll => roll.InvestigatorId == Lucy).Status);
    }

    [Fact]
    public async Task Given_a_refused_present_change_When_replacing_Then_nothing_is_cancelled()
    {
        var (_, meetingKnott, _) = await TwoScenesAsync();
        await StartAsync(meetingKnott, [Harvey, Lucy]);
        var requestId = await RequestRollsAsync(Harvey, Lucy);

        var replaced = await ReplaceAsync();

        Assert.Equal(InvestigatorsPresentOutcome.NoInvestigatorPresent, replaced.Outcome);
        Assert.Empty(replaced.CancelledRolls);
        Assert.All(await StoredRollsAsync(requestId), roll => Assert.Equal(RequestedRollStatus.Waiting, roll.Status));
    }

    [Fact]
    public async Task Given_a_waiting_roll_When_starting_with_finish_Then_the_old_scenes_roll_is_cancelled()
    {
        var (_, meetingKnott, corbittHouse) = await TwoScenesAsync();
        await StartAsync(meetingKnott, [Harvey, Lucy]);
        var requestId = await RequestRollsAsync(Harvey, Lucy);

        var start = await StartAsync(corbittHouse, [Harvey], finishActiveScene: true);

        Assert.Equal(SceneStartOutcome.Started, start.Outcome);
        Assert.Equal(
            [(requestId, Harvey, RollRequestVisibility.Public), (requestId, Lucy, RollRequestVisibility.Public)],
            start.CancelledRolls.Select(cancelled => (cancelled.RollRequestId, cancelled.InvestigatorId, cancelled.Visibility)));
        Assert.All(await StoredRollsAsync(requestId), roll => Assert.Equal(RequestedRollStatus.Cancelled, roll.Status));
    }

    [Fact]
    public async Task Given_a_refused_start_When_starting_Then_nothing_is_cancelled()
    {
        var (_, meetingKnott, corbittHouse) = await TwoScenesAsync();
        await StartAsync(meetingKnott, [Harvey, Lucy]);
        var requestId = await RequestRollsAsync(Harvey, Lucy);

        var start = await StartAsync(corbittHouse, [Harvey]);

        Assert.Equal(SceneStartOutcome.ActiveSceneExists, start.Outcome);
        Assert.Empty(start.CancelledRolls);
        Assert.All(await StoredRollsAsync(requestId), roll => Assert.Equal(RequestedRollStatus.Waiting, roll.Status));
    }

    [Fact]
    public async Task Given_a_roll_committed_after_the_finish_read_When_finishing_Then_it_conflicts_and_the_scene_stays_active()
    {
        var (_, meetingKnott, _) = await TwoScenesAsync();
        await StartAsync(meetingKnott, [Harvey]);
        var requestId = await RequestRollsAsync(Harvey);

        using var stale = _builder.Fixture.CreateContext();
        var tracked = await new EfSceneRollRequestRepository(stale).ListTrackedForSceneAsync(_builder.CampaignId, meetingKnott, CancellationToken.None);
        Assert.Single(tracked);
        using (var winner = _builder.Fixture.CreateContext())
        {
            var rolled = await new SceneRollRequestService(
                new EfSceneRepository(winner),
                new EfSceneRollRequestRepository(winner),
                new ScriptedRoller(2, 5),
                _builder.TimeProvider).RollAsync(_builder.CampaignId, requestId, Harvey, Roller, CancellationToken.None);
            Assert.Equal(RequestedRollWriteOutcome.Rolled, rolled.Outcome);
        }

        var finish = await _builder.CreateLifecycleService(stale).FinishActiveAsync(_builder.CampaignId, CancellationToken.None);

        Assert.Equal(SceneFinishOutcome.Conflict, finish.Outcome);
        Assert.Empty(finish.CancelledRolls);
        using var check = _builder.Fixture.CreateContext();
        Assert.Equal(SceneStatus.Active, (await new EfSceneRepository(check).FindActiveAsync(_builder.CampaignId, CancellationToken.None))!.Status);
        Assert.Equal(RequestedRollStatus.Rolled, (await StoredRollsAsync(requestId)).Single().Status);
    }
}
