namespace CocAssistant.ScenePlay.Tests;

/// <summary>
/// Requesting rolls in the Active Scene and rolling them (specs/roll-requests/spec.md; PBI-DICE-005 D4, D5).
/// Only the Keeper creates: anyone else gets NotFound before any Scene, value, provider, Wall, or live port is touched.
/// </summary>
public class RollRequestServiceTests
{
    private static readonly Guid CampaignId = Guid.Parse("cccccccc-0000-0000-0000-000000000101");
    private static readonly Guid KeeperId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000101");
    private static readonly Guid HarveyPlayerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000102");
    private static readonly Guid LucyPlayerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000103");
    private static readonly Guid StrangerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000109");
    private static readonly Guid Harvey = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000101");
    private static readonly Guid Lucy = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000102");
    private static readonly Guid SceneId = Guid.Parse("dddddddd-0000-0000-0000-000000000101");
    private static readonly Guid ScenarioId = Guid.Parse("eeeeeeee-0000-0000-0000-000000000101");
    private static readonly Guid RequestId = Guid.Parse("ffffffff-0000-0000-0000-000000000101");

    private readonly FakeCampaignRoles _roles = new FakeCampaignRoles()
        .With(CampaignId, KeeperId, CampaignMemberRole.Keeper)
        .With(CampaignId, HarveyPlayerId, CampaignMemberRole.Player)
        .With(CampaignId, LucyPlayerId, CampaignMemberRole.Player);

    private readonly FakePlayableScenes _scenes = new();
    private readonly FakeApprovedInvestigators _approved = new();
    private readonly FakeRollRequests _requests = new();
    private readonly FakeInvestigatorTargetValues _values = new();
    private readonly RecordingSceneWallEntries _wall = new();
    private readonly RecordingRollRequestSignals _signals = new();
    private readonly FakeAccountNames _names = new();
    private readonly RecordingLogger<RollRequestService> _logger = new();

    public RollRequestServiceTests()
    {
        _approved.Investigators.Add(new ApprovedInvestigatorRef(Harvey, HarveyPlayerId, "Harvey Walters"));
        _approved.Investigators.Add(new ApprovedInvestigatorRef(Lucy, LucyPlayerId, "Lucy Ward"));
        _scenes.Active = new PlayableScene(SceneId, ScenarioId, "The Haunting", "The Corbitt House", "Arkham", null, [Harvey, Lucy], []);
        _values.Values[Harvey] = new InvestigatorTargetValue(Harvey, 60, false, true);
        _values.Values[Lucy] = new InvestigatorTargetValue(Lucy, 40, false, true);
    }

    private RollRequestService Service => new(_roles, _scenes, _approved, _requests, _values, _wall, _signals, _names, _logger);

    private static RollRequestTargetInput LuckTarget => new(RollRequestTargetKind.Luck, null, null, null);

    private static IReadOnlyList<RequestedRollCreateInput> BothInvestigators =>
        [new RequestedRollCreateInput(Harvey, null, null, null), new RequestedRollCreateInput(Lucy, null, null, null)];

    private Task<CreateRollRequestResult> CreateAsync(
        Guid? caller = null,
        RollRequestTargetInput? target = null,
        RollRequestVisibility visibility = RollRequestVisibility.Public,
        RollRequestDifficulty difficulty = RollRequestDifficulty.Regular,
        IReadOnlyList<RequestedRollCreateInput>? investigators = null) =>
        Service.CreateAsync(
            CampaignId,
            caller ?? KeeperId,
            target ?? LuckTarget,
            "Something moves upstairs.",
            visibility,
            difficulty,
            0,
            0,
            investigators ?? BothInvestigators,
            CancellationToken.None);

    [Theory]
    [InlineData("player")]
    [InlineData("stranger")]
    public async Task Given_a_Player_or_a_non_member_When_creating_a_Roll_Request_Then_it_is_NotFound_before_any_other_port_is_touched(string caller)
    {
        var accountId = caller == "player" ? HarveyPlayerId : StrangerId;

        var result = await Service.CreateAsync(
            CampaignId, accountId, LuckTarget, null, RollRequestVisibility.Public,
            RollRequestDifficulty.Regular, 0, 0, BothInvestigators, CancellationToken.None);

        Assert.Equal(CreateRollRequestOutcome.NotFound, result.Outcome);
        Assert.Null(result.Request);
        Assert.Empty(_scenes.Calls);
        Assert.Empty(_requests.Calls);
        Assert.Empty(_wall.Texts);
        Assert.Empty(_wall.RollRequests);
        Assert.Empty(_signals.Publications);
    }

    [Fact]
    public async Task Given_no_Active_Scene_When_creating_with_an_invalid_target_Then_it_is_NoActiveScene_before_any_validation()
    {
        _scenes.Active = null;

        var result = await Service.CreateAsync(
            CampaignId, KeeperId, new RollRequestTargetInput(RollRequestTargetKind.Unknown, null, null, null), null,
            RollRequestVisibility.Public, RollRequestDifficulty.Regular, 0, 0, BothInvestigators, CancellationToken.None);

        Assert.Equal(CreateRollRequestOutcome.NoActiveScene, result.Outcome);
        Assert.False(_values.Queried);
        Assert.Empty(_requests.Calls);
    }

    [Fact]
    public async Task Given_a_KeeperOnly_request_When_creating_Then_it_succeeds_with_the_Keeper_account_and_a_KeeperOnly_Wall_Entry_and_signal()
    {
        _requests.CreateResult = new RollRequestWriteResult(RollRequestWriteOutcome.Created, StoredRequest() with { Visibility = RollRequestVisibility.KeeperOnly });

        var result = await CreateAsync(visibility: RollRequestVisibility.KeeperOnly);

        Assert.Equal(CreateRollRequestOutcome.Created, result.Outcome);
        Assert.Equal(RollRequestVisibility.KeeperOnly, result.Request!.Visibility);
        Assert.Equal(KeeperId, _requests.LastKeeperAccountId);
        Assert.Equal([RequestId], _wall.RollRequests);
        var publication = Assert.Single(_signals.Publications);
        Assert.Equal(RollRequestVisibility.KeeperOnly, publication.Visibility);
        Assert.Equal([HarveyPlayerId, LucyPlayerId], publication.PlayerAccountIds.OrderBy(id => id));
    }

    [Fact]
    public async Task Given_an_unknown_visibility_When_creating_Then_it_is_InvalidVisibility_and_the_provider_is_untouched()
    {
        var result = await CreateAsync(visibility: RollRequestVisibility.Unknown);

        Assert.Equal(CreateRollRequestOutcome.InvalidVisibility, result.Outcome);
        Assert.Null(result.Request);
        Assert.Empty(_requests.Calls);
        Assert.Empty(_wall.RollRequests);
        Assert.Empty(_signals.Publications);
    }

    [Fact]
    public async Task Given_an_unknown_target_When_creating_Then_it_is_InvalidTarget_and_the_provider_is_untouched()
    {
        var result = await CreateAsync(target: new RollRequestTargetInput(RollRequestTargetKind.Unknown, null, null, null));

        Assert.Equal(CreateRollRequestOutcome.InvalidTarget, result.Outcome);
        Assert.Empty(_requests.Calls);
    }

    [Fact]
    public async Task Given_an_unknown_Difficulty_When_creating_Then_it_is_InvalidDifficulty_and_the_provider_is_untouched()
    {
        var result = await CreateAsync(difficulty: RollRequestDifficulty.Unknown);

        Assert.Equal(CreateRollRequestOutcome.InvalidDifficulty, result.Outcome);
        Assert.Empty(_requests.Calls);
    }

    [Fact]
    public async Task Given_a_skill_target_the_catalog_does_not_know_When_creating_Then_it_is_UnknownTarget_and_the_provider_is_untouched()
    {
        _values.Refusal = TargetValueRefusal.UnknownTarget;

        var result = await CreateAsync(target: new RollRequestTargetInput(RollRequestTargetKind.Skill, "Banana", null, null));

        Assert.Equal(CreateRollRequestOutcome.UnknownTarget, result.Outcome);
        Assert.Empty(_requests.Calls);
    }

    [Fact]
    public async Task Given_a_created_request_When_creating_Then_the_Keeper_view_has_names_and_no_Account_ids_and_the_Wall_and_signal_follow()
    {
        _requests.CreateResult = new RollRequestWriteResult(RollRequestWriteOutcome.Created, StoredRequest());
        _names.Names[HarveyPlayerId] = "Account harvey";
        _names.Names[KeeperId] = "Account keeper";

        var result = await CreateAsync();

        Assert.Equal(CreateRollRequestOutcome.Created, result.Outcome);
        Assert.Equal(RequestId, result.Request!.Id);
        Assert.Equal("Luck", result.Request.Target.Kind.ToString());
        Assert.Equal(["Harvey Walters", "Lucy Ward"], result.Request.RequestedRolls.Select(roll => roll.InvestigatorName));
        Assert.DoesNotContain(HarveyPlayerId.ToString(), result.Request.ToString(), StringComparison.OrdinalIgnoreCase);
        Assert.Equal([RequestId], _wall.RollRequests);
        var publication = Assert.Single(_signals.Publications);
        Assert.Equal(RollRequestVisibility.Public, publication.Visibility);
        Assert.Equal([HarveyPlayerId, LucyPlayerId], publication.PlayerAccountIds.OrderBy(id => id));
    }

    [Fact]
    public async Task Given_a_failing_Wall_or_signal_When_creating_Then_the_request_still_succeeds_and_the_failure_is_logged()
    {
        _requests.CreateResult = new RollRequestWriteResult(RollRequestWriteOutcome.Created, StoredRequest());
        _wall.FailRollRequest = true;
        _signals.Fail = true;

        var result = await CreateAsync();

        Assert.Equal(CreateRollRequestOutcome.Created, result.Outcome);
        Assert.NotNull(result.Request);
        Assert.Contains(LogLevel.Warning, _logger.Levels);
    }

    [Theory]
    [InlineData(RollRequestWriteOutcome.EmptyInvestigators, CreateRollRequestOutcome.EmptyInvestigators)]
    [InlineData(RollRequestWriteOutcome.DuplicateInvestigator, CreateRollRequestOutcome.DuplicateInvestigator)]
    [InlineData(RollRequestWriteOutcome.InvestigatorNotPresent, CreateRollRequestOutcome.InvestigatorNotPresent)]
    [InlineData(RollRequestWriteOutcome.InvalidTarget, CreateRollRequestOutcome.InvalidTarget)]
    [InlineData(RollRequestWriteOutcome.InvalidLuckTarget, CreateRollRequestOutcome.InvalidLuckTarget)]
    [InlineData(RollRequestWriteOutcome.InvalidDice, CreateRollRequestOutcome.InvalidDice)]
    [InlineData(RollRequestWriteOutcome.MessageTooLong, CreateRollRequestOutcome.MessageTooLong)]
    [InlineData(RollRequestWriteOutcome.Conflict, CreateRollRequestOutcome.Conflict)]
    public async Task Given_a_refused_provider_write_When_creating_Then_the_outcome_is_returned_and_no_Wall_Entry_or_signal_is_made(
        RollRequestWriteOutcome providerOutcome, CreateRollRequestOutcome expected)
    {
        _requests.CreateResult = new RollRequestWriteResult(providerOutcome, null);

        var result = await CreateAsync();

        Assert.Equal((expected, null), (result.Outcome, result.Request));
        Assert.Empty(_wall.RollRequests);
        Assert.Empty(_signals.Publications);
    }

    [Fact]
    public async Task Given_a_Player_When_reading_a_Public_request_Then_they_see_it_with_names_and_no_Account_ids()
    {
        _requests.Found = StoredRequest();
        _names.Names[HarveyPlayerId] = "Account harvey";

        var keeper = await Service.FindAsync(CampaignId, KeeperId, RequestId, CancellationToken.None);
        var player = await Service.FindAsync(CampaignId, HarveyPlayerId, RequestId, CancellationToken.None);

        Assert.Equal(["Harvey Walters", "Lucy Ward"], keeper!.RequestedRolls.Select(roll => roll.InvestigatorName));
        Assert.Equal(keeper.Id, player!.Id);
        Assert.Equal(["Harvey Walters", "Lucy Ward"], player.RequestedRolls.Select(roll => roll.InvestigatorName));
    }

    [Fact]
    public async Task Given_a_stranger_or_a_missing_request_When_reading_Then_it_is_null_and_the_provider_is_asked_once()
    {
        _requests.Found = StoredRequest();

        Assert.Null(await Service.FindAsync(CampaignId, StrangerId, RequestId, CancellationToken.None));
        Assert.Empty(_requests.Calls);

        _requests.Found = null;
        Assert.Null(await Service.FindAsync(CampaignId, KeeperId, RequestId, CancellationToken.None));
        Assert.Equal([nameof(FakeRollRequests.FindAsync)], _requests.Calls);
    }

    [Fact]
    public async Task Given_a_KeeperOnly_request_When_a_Player_reads_Then_it_is_null()
    {
        _requests.Found = StoredRequest() with { Visibility = RollRequestVisibility.KeeperOnly };

        Assert.Null(await Service.FindAsync(CampaignId, HarveyPlayerId, RequestId, CancellationToken.None));
        Assert.NotNull(await Service.FindAsync(CampaignId, KeeperId, RequestId, CancellationToken.None));
    }

    [Fact]
    public async Task Given_a_Player_When_listing_the_Active_Scenes_requests_Then_it_is_null_and_the_provider_is_untouched()
    {
        Assert.Null(await Service.ListForActiveSceneAsync(CampaignId, HarveyPlayerId, CancellationToken.None));
        Assert.Empty(_requests.Calls);
    }

    [Fact]
    public async Task Given_the_Keeper_When_listing_Then_the_requests_come_oldest_first_with_names()
    {
        _requests.ActiveSceneRequests.Add(StoredRequest());
        _names.Names[HarveyPlayerId] = "Account harvey";

        var requests = (await Service.ListForActiveSceneAsync(CampaignId, KeeperId, CancellationToken.None))!;

        Assert.Equal([RequestId], requests.Select(request => request.Id));
        Assert.Equal(["Harvey Walters", "Lucy Ward"], requests[0].RequestedRolls.Select(roll => roll.InvestigatorName));
    }

    [Fact]
    public async Task Given_no_Active_Scene_When_listing_Then_it_is_an_empty_list()
    {
        var requests = await Service.ListForActiveSceneAsync(CampaignId, KeeperId, CancellationToken.None);

        Assert.NotNull(requests);
        Assert.Empty(requests);
    }

    [Fact]
    public async Task Given_the_Keeper_or_a_Player_without_an_Investigator_When_reading_mine_Then_it_is_null()
    {
        Assert.Null(await Service.ListMineAsync(CampaignId, KeeperId, CancellationToken.None));
        Assert.Null(await Service.ListMineAsync(CampaignId, StrangerId, CancellationToken.None));

        _roles.With(CampaignId, StrangerId, CampaignMemberRole.Player);
        Assert.Null(await Service.ListMineAsync(CampaignId, StrangerId, CancellationToken.None));
        Assert.Empty(_requests.Calls);
    }

    [Fact]
    public async Task Given_Waiting_rolls_When_a_Player_reads_mine_Then_each_comes_with_its_requests_target_and_message()
    {
        var stored = StoredRequest();
        _requests.WaitingForInvestigator.Add(new WaitingRequestedRollRecord(RequestId, stored.Target, stored.Message, RollRequestVisibility.Public, stored.CreatedAt, stored.RequestedRolls[0]));

        var mine = (await Service.ListMineAsync(CampaignId, HarveyPlayerId, CancellationToken.None))!;

        Assert.Equal("Harvey Walters", mine.InvestigatorName);
        var waiting = Assert.Single(mine.Rolls);
        Assert.Equal((RequestId, "Something moves upstairs.", Harvey, 60), (waiting.RollRequestId, waiting.Message, waiting.Roll.InvestigatorId, waiting.Roll.TargetValue));
        Assert.Equal(RollRequestTargetKind.Luck, waiting.Target.Kind);
        Assert.Equal(stored.CreatedAt, waiting.CreatedAt);
    }

    [Fact]
    public async Task Given_no_Active_Scene_When_a_Player_reads_mine_Then_it_is_an_empty_list()
    {
        var mine = await Service.ListMineAsync(CampaignId, HarveyPlayerId, CancellationToken.None);

        Assert.NotNull(mine);
        Assert.Empty(mine.Rolls);
    }

    [Fact]
    public async Task Given_their_own_Waiting_roll_When_a_Player_rolls_Then_it_rolls_and_only_their_account_is_signalled()
    {
        _requests.Found = StoredRequest();
        _requests.RollResult = new RequestedRollWriteResult(RequestedRollWriteOutcome.Rolled, RolledHarvey(HarveyPlayerId));
        _names.Names[HarveyPlayerId] = "Account harvey";
        _names.Names[KeeperId] = "Account keeper";

        var result = await Service.RollAsync(CampaignId, HarveyPlayerId, RequestId, Harvey, CancellationToken.None);

        Assert.Equal(RollRequestedRollOutcome.Rolled, result.Outcome);
        Assert.Equal(("Harvey Walters", "Account harvey"), (result.Roll!.InvestigatorName, result.Roll.Rolls[0].RolledByName));
        var publication = Assert.Single(_signals.Publications);
        Assert.Equal([HarveyPlayerId], publication.PlayerAccountIds);
    }

    [Fact]
    public async Task Given_a_KeeperOnly_request_When_a_Player_rolls_their_own_Then_it_is_NotFound_and_the_provider_roll_is_not_called()
    {
        _requests.Found = StoredRequest() with { Visibility = RollRequestVisibility.KeeperOnly };

        var result = await Service.RollAsync(CampaignId, HarveyPlayerId, RequestId, Harvey, CancellationToken.None);

        Assert.Equal(RollRequestedRollOutcome.NotFound, result.Outcome);
        Assert.Null(result.Roll);
        Assert.DoesNotContain(nameof(FakeRollRequests.RollAsync), _requests.Calls);
        Assert.Empty(_signals.Publications);
    }

    [Fact]
    public async Task Given_a_missing_request_When_rolling_Then_it_is_NotFound_and_the_provider_roll_is_not_called()
    {
        _requests.Found = null;

        var result = await Service.RollAsync(CampaignId, KeeperId, RequestId, Harvey, CancellationToken.None);

        Assert.Equal(RollRequestedRollOutcome.NotFound, result.Outcome);
        Assert.Null(result.Roll);
        Assert.DoesNotContain(nameof(FakeRollRequests.RollAsync), _requests.Calls);
        Assert.Empty(_signals.Publications);
    }

    [Fact]
    public async Task Given_a_KeeperOnly_request_When_the_Keeper_rolls_Then_it_reaches_the_provider()
    {
        _requests.Found = StoredRequest() with { Visibility = RollRequestVisibility.KeeperOnly };
        _requests.RollResult = new RequestedRollWriteResult(RequestedRollWriteOutcome.NotWaiting, null);

        var result = await Service.RollAsync(CampaignId, KeeperId, RequestId, Harvey, CancellationToken.None);

        Assert.Equal(RollRequestedRollOutcome.NotWaiting, result.Outcome);
        Assert.Contains(nameof(FakeRollRequests.RollAsync), _requests.Calls);
        Assert.Empty(_signals.Publications);
    }

    [Theory]
    [InlineData(RollRequestVisibility.Public)]
    [InlineData(RollRequestVisibility.KeeperOnly)]
    public async Task Given_a_request_When_the_Keeper_rolls_Then_the_signal_uses_the_request_visibility(RollRequestVisibility visibility)
    {
        _requests.Found = StoredRequest() with { Visibility = visibility };
        _requests.RollResult = new RequestedRollWriteResult(RequestedRollWriteOutcome.Rolled, RolledHarvey(KeeperId));

        var result = await Service.RollAsync(CampaignId, KeeperId, RequestId, Lucy, CancellationToken.None);

        Assert.Equal(RollRequestedRollOutcome.Rolled, result.Outcome);
        Assert.Equal(visibility, Assert.Single(_signals.Publications).Visibility);
    }

    [Fact]
    public async Task Given_a_KeeperOnly_wait_When_a_Player_reads_mine_Then_it_is_left_out()
    {
        var stored = StoredRequest();
        _requests.WaitingForInvestigator.Add(new WaitingRequestedRollRecord(
            RequestId, stored.Target, stored.Message, RollRequestVisibility.KeeperOnly, stored.CreatedAt, stored.RequestedRolls[0]));

        var mine = (await Service.ListMineAsync(CampaignId, HarveyPlayerId, CancellationToken.None))!;

        Assert.Equal("Harvey Walters", mine.InvestigatorName);
        Assert.Empty(mine.Rolls);
    }

    [Fact]
    public async Task Given_anothers_roll_When_a_Player_rolls_Then_it_is_NotFound_and_the_provider_roll_is_not_called()
    {
        _requests.Found = StoredRequest();

        var result = await Service.RollAsync(CampaignId, HarveyPlayerId, RequestId, Lucy, CancellationToken.None);

        Assert.Equal(RollRequestedRollOutcome.NotFound, result.Outcome);
        Assert.DoesNotContain(nameof(FakeRollRequests.RollAsync), _requests.Calls);
        Assert.Empty(_signals.Publications);
    }

    [Fact]
    public async Task Given_any_Waiting_roll_When_the_Keeper_rolls_Then_it_rolls_and_the_Investigators_Player_is_signalled()
    {
        _requests.Found = StoredRequest();
        _requests.RollResult = new RequestedRollWriteResult(RequestedRollWriteOutcome.Rolled, RolledLucy());

        var result = await Service.RollAsync(CampaignId, KeeperId, RequestId, Lucy, CancellationToken.None);

        Assert.Equal(RollRequestedRollOutcome.Rolled, result.Outcome);
        Assert.Equal("Lucy Ward", result.Roll!.InvestigatorName);
        Assert.Equal([LucyPlayerId], Assert.Single(_signals.Publications).PlayerAccountIds);
    }

    [Theory]
    [InlineData(RequestedRollWriteOutcome.NotFound, RollRequestedRollOutcome.NotFound)]
    [InlineData(RequestedRollWriteOutcome.InvestigatorNotRequested, RollRequestedRollOutcome.NotFound)]
    [InlineData(RequestedRollWriteOutcome.SceneNotActive, RollRequestedRollOutcome.SceneNotActive)]
    [InlineData(RequestedRollWriteOutcome.NotWaiting, RollRequestedRollOutcome.NotWaiting)]
    [InlineData(RequestedRollWriteOutcome.AlreadyCancelled, RollRequestedRollOutcome.AlreadyCancelled)]
    public async Task Given_a_refused_roll_When_rolling_Then_the_outcome_is_returned_and_no_signal_is_made(
        RequestedRollWriteOutcome providerOutcome, RollRequestedRollOutcome expected)
    {
        _requests.Found = StoredRequest();
        _requests.RollResult = new RequestedRollWriteResult(providerOutcome, null);

        var result = await Service.RollAsync(CampaignId, KeeperId, RequestId, Harvey, CancellationToken.None);

        Assert.Equal((expected, null), (result.Outcome, result.Roll));
        Assert.Empty(_signals.Publications);
    }

    [Theory]
    [InlineData("player")]
    [InlineData("stranger")]
    public async Task Given_a_Player_or_a_non_member_When_cancelling_Then_it_is_NotFound_and_the_provider_is_untouched(string caller)
    {
        var accountId = caller == "player" ? HarveyPlayerId : StrangerId;

        var result = await Service.CancelAsync(CampaignId, accountId, RequestId, Harvey, CancellationToken.None);

        Assert.Equal(CancelRequestedRollOutcome.NotFound, result.Outcome);
        Assert.Null(result.Roll);
        Assert.DoesNotContain(nameof(FakeRollRequests.CancelAsync), _requests.Calls);
        Assert.Empty(_signals.Publications);
    }

    [Fact]
    public async Task Given_a_missing_request_When_cancelling_Then_it_is_NotFound_and_the_provider_is_untouched()
    {
        _requests.Found = null;

        var result = await Service.CancelAsync(CampaignId, KeeperId, RequestId, Harvey, CancellationToken.None);

        Assert.Equal(CancelRequestedRollOutcome.NotFound, result.Outcome);
        Assert.Null(result.Roll);
        Assert.DoesNotContain(nameof(FakeRollRequests.CancelAsync), _requests.Calls);
        Assert.Empty(_signals.Publications);
    }

    [Fact]
    public async Task Given_a_Waiting_roll_When_the_Keeper_cancels_Then_it_cancels_and_only_the_Investigators_Player_is_signalled()
    {
        _requests.Found = StoredRequest();
        _requests.CancelResult = new RequestedRollWriteResult(RequestedRollWriteOutcome.Cancelled, CancelledHarvey());

        var result = await Service.CancelAsync(CampaignId, KeeperId, RequestId, Harvey, CancellationToken.None);

        Assert.Equal(CancelRequestedRollOutcome.Cancelled, result.Outcome);
        Assert.Equal(("Harvey Walters", RequestedRollStatus.Cancelled), (result.Roll!.InvestigatorName, result.Roll.Status));
        Assert.Empty(result.Roll.Rolls);
        Assert.Equal([HarveyPlayerId], Assert.Single(_signals.Publications).PlayerAccountIds);
    }

    [Theory]
    [InlineData(RequestedRollWriteOutcome.NotFound, CancelRequestedRollOutcome.NotFound)]
    [InlineData(RequestedRollWriteOutcome.InvestigatorNotRequested, CancelRequestedRollOutcome.NotFound)]
    [InlineData(RequestedRollWriteOutcome.SceneNotActive, CancelRequestedRollOutcome.SceneNotActive)]
    [InlineData(RequestedRollWriteOutcome.NotWaiting, CancelRequestedRollOutcome.NotWaiting)]
    [InlineData(RequestedRollWriteOutcome.AlreadyCancelled, CancelRequestedRollOutcome.AlreadyCancelled)]
    public async Task Given_a_refused_cancel_When_cancelling_Then_the_outcome_is_returned_and_no_signal_is_made(
        RequestedRollWriteOutcome providerOutcome, CancelRequestedRollOutcome expected)
    {
        _requests.Found = StoredRequest();
        _requests.CancelResult = new RequestedRollWriteResult(providerOutcome, null);

        var result = await Service.CancelAsync(CampaignId, KeeperId, RequestId, Harvey, CancellationToken.None);

        Assert.Equal((expected, null), (result.Outcome, result.Roll));
        Assert.Empty(_signals.Publications);
    }

    [Fact]
    public async Task Given_a_failing_signal_When_cancelling_Then_the_cancel_still_succeeds_and_the_failure_is_logged()
    {
        _requests.Found = StoredRequest();
        _requests.CancelResult = new RequestedRollWriteResult(RequestedRollWriteOutcome.Cancelled, CancelledHarvey());
        _signals.Fail = true;

        var result = await Service.CancelAsync(CampaignId, KeeperId, RequestId, Harvey, CancellationToken.None);

        Assert.Equal(CancelRequestedRollOutcome.Cancelled, result.Outcome);
        Assert.Equal([LogLevel.Warning], _logger.Levels);
    }

    [Fact]
    public void Given_the_outcome_enums_When_mapping_Then_every_member_maps()
    {
        Assert.All(Enum.GetValues<RollRequestWriteOutcome>(), outcome => Enum.Parse<CreateRollRequestOutcome>(outcome.ToString()));
        Assert.All(Enum.GetValues<TargetValueRefusal>(), refusal => Enum.Parse<CreateRollRequestOutcome>(refusal.ToString()));
        Assert.All(
            Enum.GetValues<RequestedRollWriteOutcome>(),
            outcome => Assert.Contains(
                outcome switch
                {
                    RequestedRollWriteOutcome.Rolled => RollRequestedRollOutcome.Rolled,
                    RequestedRollWriteOutcome.SceneNotActive => RollRequestedRollOutcome.SceneNotActive,
                    RequestedRollWriteOutcome.NotWaiting => RollRequestedRollOutcome.NotWaiting,
                    RequestedRollWriteOutcome.AlreadyCancelled => RollRequestedRollOutcome.AlreadyCancelled,
                    _ => RollRequestedRollOutcome.NotFound,
                },
                Enum.GetValues<RollRequestedRollOutcome>()));
        Assert.All(
            Enum.GetValues<RequestedRollWriteOutcome>(),
            outcome => Assert.Contains(
                outcome switch
                {
                    RequestedRollWriteOutcome.Cancelled => CancelRequestedRollOutcome.Cancelled,
                    RequestedRollWriteOutcome.SceneNotActive => CancelRequestedRollOutcome.SceneNotActive,
                    RequestedRollWriteOutcome.NotWaiting => CancelRequestedRollOutcome.NotWaiting,
                    RequestedRollWriteOutcome.AlreadyCancelled => CancelRequestedRollOutcome.AlreadyCancelled,
                    _ => CancelRequestedRollOutcome.NotFound,
                },
                Enum.GetValues<CancelRequestedRollOutcome>()));
    }

    private static RequestedRollRecord RolledHarvey(Guid rollerAccountId) =>
        new(
            RequestId,
            Harvey,
            60,
            false,
            false,
            RollRequestDifficulty.Regular,
            0,
            0,
            RequestedRollStatus.Rolled,
            [
                new StoredRollRecord(
                    "1D100",
                    25,
                    [2, 5],
                    rollerAccountId,
                    new DateTimeOffset(2026, 11, 12, 19, 45, 0, TimeSpan.Zero),
                    new PercentileOutcomeData(5, [2], 2, 25, RollSuccessLevel.Hard, true),
                    true),
            ]);

    private static RequestedRollRecord RolledLucy() =>
        RolledHarvey(KeeperId) with { InvestigatorId = Lucy, TargetValue = 40 };

    private static RequestedRollRecord CancelledHarvey() =>
        new(
            RequestId,
            Harvey,
            60,
            false,
            false,
            RollRequestDifficulty.Regular,
            0,
            0,
            RequestedRollStatus.Cancelled,
            []);

    private static RollRequestRecord StoredRequest() =>
        new(
            RequestId,
            CampaignId,
            SceneId,
            new RollRequestTargetInput(RollRequestTargetKind.Luck, null, null, null),
            "Something moves upstairs.",
            RollRequestVisibility.Public,
            RollRequestDifficulty.Regular,
            0,
            0,
            new DateTimeOffset(2026, 11, 12, 19, 40, 0, TimeSpan.Zero),
            [
                new RequestedRollRecord(RequestId, Harvey, 60, false, false, RollRequestDifficulty.Regular, 0, 0, RequestedRollStatus.Waiting, []),
                new RequestedRollRecord(RequestId, Lucy, 40, false, false, RollRequestDifficulty.Regular, 0, 0, RequestedRollStatus.Waiting, []),
            ]);
}
