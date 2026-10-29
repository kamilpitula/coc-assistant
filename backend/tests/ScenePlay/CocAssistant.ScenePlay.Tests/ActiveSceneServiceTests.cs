namespace CocAssistant.ScenePlay.Tests;

/// <summary>
/// Starting, finishing, and re-staffing the Active Scene, and reading it, for Campaign members (specs/scene-play/spec.md; ADR 0024).
/// Only the Keeper writes: anyone else gets NotFound before any Scene, Investigator, Wall, or live port is touched.
/// </summary>
public class ActiveSceneServiceTests
{
    private static readonly Guid CampaignId = Guid.Parse("cccccccc-0000-0000-0000-000000000001");
    private static readonly Guid KeeperId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid HarveyPlayerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000002");
    private static readonly Guid LucyPlayerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000003");
    private static readonly Guid StrangerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000009");
    private static readonly Guid Harvey = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001");
    private static readonly Guid Lucy = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002");
    private static readonly Guid SceneId = Guid.Parse("dddddddd-0000-0000-0000-000000000001");
    private static readonly Guid ScenarioId = Guid.Parse("eeeeeeee-0000-0000-0000-000000000001");

    private readonly FakeCampaignRoles _roles = new FakeCampaignRoles()
        .With(CampaignId, KeeperId, CampaignMemberRole.Keeper)
        .With(CampaignId, HarveyPlayerId, CampaignMemberRole.Player)
        .With(CampaignId, LucyPlayerId, CampaignMemberRole.Player);

    private readonly FakePlayableScenes _scenes = new();
    private readonly FakeApprovedInvestigators _approved = new();
    private readonly RecordingSceneWallEntries _wall = new();
    private readonly RecordingActiveSceneSignals _signals = new();
    private readonly RecordingLogger<ActiveSceneService> _logger = new();

    public ActiveSceneServiceTests()
    {
        _approved.Investigators.Add(new ApprovedInvestigatorRef(Harvey, HarveyPlayerId, "Harvey Walters"));
        _approved.Investigators.Add(new ApprovedInvestigatorRef(Lucy, LucyPlayerId, "Lucy Ward"));
    }

    private ActiveSceneService Service => new(_roles, _scenes, _approved, _wall, _signals, _logger);

    private static PlayableScene Scene(string title, params Guid[] present) =>
        new(SceneId, ScenarioId, "The Haunting", title, "Arkham", new DateTimeOffset(2026, 10, 28, 19, 40, 0, TimeSpan.Zero), present);

    private void ArrangeStart(PlayableScene started, PlayableScene? finished = null) =>
        _scenes.StartResult = new StartSceneResult(StartSceneOutcome.Started, started, finished);

    [Fact]
    public async Task Given_the_Keeper_When_starting_a_Scene_Then_it_returns_the_Keeper_view_with_names_and_the_Wall_and_signal_follow()
    {
        ArrangeStart(Scene("The Corbitt House", Lucy, Harvey));

        var result = await Service.StartAsync(CampaignId, KeeperId, SceneId, [Harvey, Lucy], false, CancellationToken.None);

        Assert.Equal(StartSceneOutcome.Started, result.Outcome);
        Assert.Equal(("The Corbitt House", "The Haunting", "Arkham"), (result.Scene!.Title, result.Scene.ScenarioTitle, result.Scene.Location));
        Assert.Equal(["Harvey Walters", "Lucy Ward"], result.Scene.InvestigatorsPresent.Select(investigator => investigator.Name));
        Assert.Equal([Harvey, Lucy], result.Scene.InvestigatorsPresent.Select(investigator => investigator.Id));
        Assert.Equal(["Scene started: The Corbitt House"], _wall.Texts);
        Assert.Equal(1, _signals.Count);
        Assert.Equal([Harvey, Lucy], _scenes.LastApproved);
    }

    [Fact]
    public async Task Given_a_finish_then_start_When_starting_Then_the_finished_entry_is_written_before_the_started_one()
    {
        ArrangeStart(Scene("The Corbitt House", Harvey), Scene("Meeting Knott", Harvey));

        await Service.StartAsync(CampaignId, KeeperId, SceneId, [Harvey], true, CancellationToken.None);

        Assert.Equal(["Scene finished: Meeting Knott", "Scene started: The Corbitt House"], _wall.Texts);
        Assert.Equal(1, _signals.Count);
    }

    [Theory]
    [InlineData(StartSceneOutcome.SceneNotFound)]
    [InlineData(StartSceneOutcome.NotPrepared)]
    [InlineData(StartSceneOutcome.ActiveSceneExists)]
    [InlineData(StartSceneOutcome.NoInvestigatorPresent)]
    [InlineData(StartSceneOutcome.DuplicateInvestigator)]
    [InlineData(StartSceneOutcome.InvestigatorNotApproved)]
    [InlineData(StartSceneOutcome.Conflict)]
    public async Task Given_a_refused_start_When_starting_Then_the_outcome_is_returned_and_no_Wall_Entry_or_signal_is_made(StartSceneOutcome outcome)
    {
        _scenes.StartResult = new StartSceneResult(outcome, null, null);

        var result = await Service.StartAsync(CampaignId, KeeperId, SceneId, [Harvey], false, CancellationToken.None);

        Assert.Equal((outcome, null), (result.Outcome, result.Scene));
        Assert.Empty(_wall.Texts);
        Assert.Equal(0, _signals.Count);
    }

    [Theory]
    [InlineData("player")]
    [InlineData("stranger")]
    public async Task Given_a_Player_or_a_non_member_When_writing_Then_it_is_not_found_before_any_port_is_touched(string caller)
    {
        var accountId = caller == "player" ? HarveyPlayerId : StrangerId;
        _scenes.StartResult = new StartSceneResult(StartSceneOutcome.Started, Scene("X", Harvey), null);

        var start = await Service.StartAsync(CampaignId, accountId, SceneId, [Harvey], true, CancellationToken.None);
        var finish = await Service.FinishAsync(CampaignId, accountId, CancellationToken.None);
        var change = await Service.ChangePresentAsync(CampaignId, accountId, [Harvey], CancellationToken.None);

        Assert.Equal(StartSceneOutcome.SceneNotFound, start.Outcome);
        Assert.Equal(FinishSceneOutcome.NotFound, finish);
        Assert.Equal(ChangePresentOutcome.NotFound, change.Outcome);
        Assert.Empty(_scenes.Calls);
        Assert.Empty(_wall.Texts);
        Assert.Equal(0, _signals.Count);
    }

    [Fact]
    public async Task Given_a_Wall_or_signal_failure_When_starting_Then_the_start_still_succeeds_and_the_failures_are_logged_as_warnings()
    {
        ArrangeStart(Scene("The Corbitt House", Harvey));
        _wall.Fail = true;
        _signals.Fail = true;

        var result = await Service.StartAsync(CampaignId, KeeperId, SceneId, [Harvey], false, CancellationToken.None);

        Assert.Equal(StartSceneOutcome.Started, result.Outcome);
        Assert.Equal([LogLevel.Warning, LogLevel.Warning], _logger.Levels);
    }

    [Fact]
    public async Task Given_an_Active_Scene_When_finishing_Then_the_Wall_Entry_and_signal_follow()
    {
        _scenes.FinishResult = new FinishSceneResult(FinishSceneOutcome.Finished, Scene("Meeting Knott", Harvey));

        var outcome = await Service.FinishAsync(CampaignId, KeeperId, CancellationToken.None);

        Assert.Equal(FinishSceneOutcome.Finished, outcome);
        Assert.Equal(["Scene finished: Meeting Knott"], _wall.Texts);
        Assert.Equal(1, _signals.Count);
    }

    [Theory]
    [InlineData(FinishSceneOutcome.NoActiveScene)]
    [InlineData(FinishSceneOutcome.Conflict)]
    public async Task Given_a_refused_finish_When_finishing_Then_the_outcome_is_returned_and_nothing_is_written_or_signalled(FinishSceneOutcome refusal)
    {
        _scenes.FinishResult = new FinishSceneResult(refusal, null);

        Assert.Equal(refusal, await Service.FinishAsync(CampaignId, KeeperId, CancellationToken.None));
        Assert.Empty(_wall.Texts);
        Assert.Equal(0, _signals.Count);
    }

    [Fact]
    public async Task Given_an_Active_Scene_When_changing_who_is_present_Then_the_new_view_is_returned_and_only_the_signal_follows()
    {
        _scenes.ChangeResult = new ChangePresentResult(ChangePresentOutcome.Replaced, Scene("The Corbitt House", Lucy));

        var result = await Service.ChangePresentAsync(CampaignId, KeeperId, [Lucy], CancellationToken.None);

        Assert.Equal(ChangePresentOutcome.Replaced, result.Outcome);
        Assert.Equal(["Lucy Ward"], result.Scene!.InvestigatorsPresent.Select(investigator => investigator.Name));
        Assert.Empty(_wall.Texts);
        Assert.Equal(1, _signals.Count);
    }

    [Theory]
    [InlineData(ChangePresentOutcome.NoActiveScene)]
    [InlineData(ChangePresentOutcome.NoInvestigatorPresent)]
    [InlineData(ChangePresentOutcome.DuplicateInvestigator)]
    [InlineData(ChangePresentOutcome.InvestigatorNotApproved)]
    [InlineData(ChangePresentOutcome.Conflict)]
    public async Task Given_a_refused_change_When_changing_who_is_present_Then_the_outcome_is_returned_and_nothing_is_signalled(ChangePresentOutcome refusal)
    {
        _scenes.ChangeResult = new ChangePresentResult(refusal, null);

        var result = await Service.ChangePresentAsync(CampaignId, KeeperId, [Lucy], CancellationToken.None);

        Assert.Equal((refusal, null), (result.Outcome, result.Scene));
        Assert.Equal(0, _signals.Count);
    }

    [Fact]
    public async Task Given_no_Active_Scene_When_a_member_reads_it_Then_nothing_is_active()
    {
        Assert.IsType<NothingActive>(await Service.GetAsync(CampaignId, KeeperId, CancellationToken.None));
        Assert.IsType<NothingActive>(await Service.GetAsync(CampaignId, HarveyPlayerId, CancellationToken.None));
    }

    [Fact]
    public async Task Given_a_non_member_When_reading_Then_it_is_not_a_member_and_no_Scene_is_read()
    {
        _scenes.Active = Scene("The Corbitt House", Harvey);

        Assert.IsType<NotAMemberRead>(await Service.GetAsync(CampaignId, StrangerId, CancellationToken.None));
        Assert.Empty(_scenes.Calls);
    }

    [Fact]
    public async Task Given_an_Active_Scene_When_the_Keeper_reads_it_Then_the_full_view_is_returned()
    {
        _scenes.Active = Scene("The Corbitt House", Harvey, Lucy);

        var read = Assert.IsType<KeeperActiveSceneRead>(await Service.GetAsync(CampaignId, KeeperId, CancellationToken.None));

        Assert.Equal((SceneId, ScenarioId, "The Haunting", "The Corbitt House", "Arkham"), (read.Scene.SceneId, read.Scene.ScenarioId, read.Scene.ScenarioTitle, read.Scene.Title, read.Scene.Location));
        Assert.Equal(["Harvey Walters", "Lucy Ward"], read.Scene.InvestigatorsPresent.Select(investigator => investigator.Name));
    }

    [Fact]
    public async Task Given_an_Active_Scene_When_a_present_Player_reads_it_Then_names_and_isYours_are_returned_without_ids()
    {
        _scenes.Active = Scene("The Corbitt House", Harvey, Lucy);

        var read = Assert.IsType<PresentPlayerActiveSceneRead>(await Service.GetAsync(CampaignId, LucyPlayerId, CancellationToken.None));

        Assert.Equal(("The Corbitt House", "Arkham"), (read.Scene.Title, read.Scene.Location));
        Assert.Equal([("Harvey Walters", false), ("Lucy Ward", true)], read.Scene.InvestigatorsPresent.Select(investigator => (investigator.Name, investigator.IsYours)));
    }

    [Fact]
    public async Task Given_an_Active_Scene_When_a_Player_whose_Investigator_is_not_present_reads_it_Then_only_the_title_is_returned()
    {
        _scenes.Active = Scene("The Corbitt House", Harvey);

        var read = Assert.IsType<AbsentPlayerActiveSceneRead>(await Service.GetAsync(CampaignId, LucyPlayerId, CancellationToken.None));

        Assert.Equal("The Corbitt House", read.Title);
    }

    [Fact]
    public async Task Given_an_Active_Scene_When_a_Player_without_an_Approved_Investigator_reads_it_Then_only_the_title_is_returned()
    {
        _roles.With(CampaignId, StrangerId, CampaignMemberRole.Player);
        _scenes.Active = Scene("The Corbitt House", Harvey);

        Assert.IsType<AbsentPlayerActiveSceneRead>(await Service.GetAsync(CampaignId, StrangerId, CancellationToken.None));
    }

    [Fact]
    public async Task Given_a_present_id_without_an_approved_record_When_the_Keeper_reads_it_Then_the_name_is_null()
    {
        _approved.Investigators.Clear();
        _scenes.Active = Scene("The Corbitt House", Harvey);

        var read = Assert.IsType<KeeperActiveSceneRead>(await Service.GetAsync(CampaignId, KeeperId, CancellationToken.None));

        Assert.Null(Assert.Single(read.Scene.InvestigatorsPresent).Name);
    }
}
