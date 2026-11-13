namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Storing Roll Requests beside their Scene (ADR 0032): the request with its target and rolls, the Roll Records JSON with
/// the percentile and the flag, the campaign filter, the oldest-first list, the cascade to the rolls, and the version that
/// stops a second roll.
/// </summary>
public class RollRequestPersistenceTests : IDisposable
{
    private static readonly Guid Harvey = SceneStartExtensions.Harvey;
    private static readonly Guid Lucy = SceneStartExtensions.Lucy;
    private static readonly DateTimeOffset Now = new(2026, 11, 12, 12, 0, 0, TimeSpan.Zero);
    private static readonly Guid Roller = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync(Guid? campaignId = null)
    {
        var campaign = campaignId ?? _builder.CampaignId;
        var scenario = await _builder.CreateScenarioAsync(campaign, "The Haunting");
        return (scenario.Id, (await _builder.CreateSceneAsync(campaign, scenario.Id, "The Corbitt House")).Id);
    }

    private static RollRequest UnrolledRequest(Guid campaignId, Guid sceneId, Guid[] investigators, DateTimeOffset? now = null)
    {
        var creation = RollRequest.Create(
            campaignId,
            sceneId,
            new RollTarget(RollTargetKind.Skill, skill: "Spot Hidden"),
            "Something moves upstairs.",
            RollRequestVisibility.Public,
            Difficulty.Regular,
            0,
            0,
            investigators.Select(investigator => new RequestedRollInput(investigator, 60, false, true)).ToList(),
            investigators,
            now ?? Now);
        Assert.Equal(RollRequestCreationOutcome.Created, creation.Outcome);
        return creation.Request!;
    }

    [Fact]
    public async Task Given_a_request_When_saved_and_read_back_Then_the_target_the_message_and_the_rolls_round_trip()
    {
        var (_, sceneId) = await SceneAsync();
        var request = UnrolledRequest(_builder.CampaignId, sceneId, [Harvey, Lucy]);
        using (var context = _builder.Fixture.CreateContext())
        {
            new EfSceneRollRequestRepository(context).Add(request);
            await context.SaveChangesAsync();
        }

        using var storedContext = _builder.Fixture.CreateContext();
        var stored = await new EfSceneRollRequestRepository(storedContext).FindAsync(_builder.CampaignId, request.Id, CancellationToken.None);

        Assert.Equal(
            (_builder.CampaignId, sceneId, "Spot Hidden", null, "Something moves upstairs.", RollRequestVisibility.Public, Difficulty.Regular),
            (stored!.CampaignId, stored.SceneId, stored.Target.Skill, stored.Target.Specialization, stored.Message, stored.Visibility, stored.Difficulty));
        Assert.Equal([Harvey, Lucy], stored.RequestedRolls.Select(roll => roll.InvestigatorId));
        Assert.All(stored.RequestedRolls, roll => Assert.Equal((RequestedRollStatus.Waiting, 60, 0), (roll.Status, roll.TargetValue, roll.RollRecords.Count)));
    }

    [Fact]
    public async Task Given_a_rolled_request_When_saved_and_read_back_Then_the_record_round_trips_with_the_percentile_and_the_flag()
    {
        var (_, sceneId) = await SceneAsync();
        var request = UnrolledRequest(_builder.CampaignId, sceneId, [Harvey]);
        Assert.Equal(RequestedRollOutcome.Rolled, request.RollInvestigatorRoll(new ScriptedRoller(2, 5), Harvey, Roller, Now).Outcome);
        using (var context = _builder.Fixture.CreateContext())
        {
            new EfSceneRollRequestRepository(context).Add(request);
            await context.SaveChangesAsync();
        }

        using var storedContext = _builder.Fixture.CreateContext();
        var stored = (await new EfSceneRollRequestRepository(storedContext).FindAsync(_builder.CampaignId, request.Id, CancellationToken.None))!;

        var roll = Assert.Single(stored.RequestedRolls);
        Assert.Equal(RequestedRollStatus.Rolled, roll.Status);
        var record = Assert.Single(roll.RollRecords);
        Assert.Equal($"RollRequest:{request.Id}:{Harvey}", record.Purpose);
        Assert.Equal((25, Roller, Now), (record.Result, record.RolledByAccountId, record.RolledAt));
        Assert.Equal([20, 5], record.Faces);
        Assert.Equal(new PercentileRoll(60, 60, 30, 12, Difficulty.Regular, 0, 0, 5, [20], 20, 25, SuccessLevel.Hard, true), record.Percentile);
        Assert.True(record.EarnsExperienceCheck);
    }

    [Fact]
    public async Task Given_a_request_of_another_campaign_When_finding_it_Then_it_is_not_found()
    {
        var (_, sceneId) = await SceneAsync();
        var request = UnrolledRequest(_builder.CampaignId, sceneId, [Harvey]);
        using (var context = _builder.Fixture.CreateContext())
        {
            new EfSceneRollRequestRepository(context).Add(request);
            await context.SaveChangesAsync();
        }

        using var storedContext = _builder.Fixture.CreateContext();
        var repository = new EfSceneRollRequestRepository(storedContext);

        Assert.Null(await repository.FindAsync(_builder.OtherCampaignOfSameKeeperId, request.Id, CancellationToken.None));
        Assert.Empty(await repository.ListForSceneAsync(_builder.OtherCampaignOfSameKeeperId, sceneId, CancellationToken.None));
    }

    [Fact]
    public async Task Given_two_requests_When_listing_for_the_scene_Then_the_oldest_comes_first()
    {
        var (_, sceneId) = await SceneAsync();
        var first = UnrolledRequest(_builder.CampaignId, sceneId, [Harvey], Now);
        var second = UnrolledRequest(_builder.CampaignId, sceneId, [Lucy], Now.AddMinutes(1));
        using (var context = _builder.Fixture.CreateContext())
        {
            var repository = new EfSceneRollRequestRepository(context);
            repository.Add(first);
            repository.Add(second);
            await context.SaveChangesAsync();
        }

        using var storedContext = _builder.Fixture.CreateContext();
        var listed = await new EfSceneRollRequestRepository(storedContext).ListForSceneAsync(_builder.CampaignId, sceneId, CancellationToken.None);

        Assert.Equal([first.Id, second.Id], listed.Select(request => request.Id));
    }

    [Fact]
    public async Task Given_a_request_When_it_is_deleted_Then_its_rolls_go_with_it()
    {
        var (_, sceneId) = await SceneAsync();
        var request = UnrolledRequest(_builder.CampaignId, sceneId, [Harvey, Lucy]);
        using (var context = _builder.Fixture.CreateContext())
        {
            var repository = new EfSceneRollRequestRepository(context);
            repository.Add(request);
            await context.SaveChangesAsync();
        }

        using (var context = _builder.Fixture.CreateContext())
        {
            context.Set<RollRequest>().Remove(await context.Set<RollRequest>().SingleAsync(candidate => candidate.Id == request.Id));
            await context.SaveChangesAsync();
        }

        using var storedContext = _builder.Fixture.CreateContext();
        Assert.Equal(
            (0, 0),
            (await storedContext.Set<RollRequest>().CountAsync(), await storedContext.Set<RequestedRoll>().CountAsync()));
    }

    [Fact]
    public async Task Given_a_stale_roll_When_saving_after_another_roll_Then_the_second_save_fails()
    {
        var (_, sceneId) = await SceneAsync();
        var request = UnrolledRequest(_builder.CampaignId, sceneId, [Harvey]);
        using (var context = _builder.Fixture.CreateContext())
        {
            new EfSceneRollRequestRepository(context).Add(request);
            await context.SaveChangesAsync();
        }

        using var stale = _builder.Fixture.CreateContext();
        var staleRequest = (await new EfSceneRollRequestRepository(stale).FindAsync(_builder.CampaignId, request.Id, CancellationToken.None))!;
        using (var winner = _builder.Fixture.CreateContext())
        {
            var winning = (await new EfSceneRollRequestRepository(winner).FindAsync(_builder.CampaignId, request.Id, CancellationToken.None))!;
            Assert.Equal(RequestedRollOutcome.Rolled, winning.RollInvestigatorRoll(new ScriptedRoller(2, 5), Harvey, Roller, Now).Outcome);
            await new EfSceneRollRequestRepository(winner).SaveChangesAsync(CancellationToken.None);
        }

        Assert.Equal(RequestedRollOutcome.Rolled, staleRequest.RollInvestigatorRoll(new ScriptedRoller(3, 6), Harvey, Roller, Now.AddMinutes(1)).Outcome);

        await Assert.ThrowsAsync<RollRequestConcurrencyException>(
            () => new EfSceneRollRequestRepository(stale).SaveChangesAsync(CancellationToken.None));
    }
}
