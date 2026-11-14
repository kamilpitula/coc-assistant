namespace CocAssistant.ScenePlay.Tests;

/// <summary>
/// The Scene History read (PBI-SPL-004): a non-member gets nothing, the Keeper sees every played Scene with every Reveal and
/// the Investigators present, and a Player sees only the Reveals that reached their own Investigator.
/// </summary>
public class SceneHistoryServiceTests
{
    private static readonly Guid CampaignId = Guid.Parse("cccccccc-0000-0000-0000-000000000004");
    private static readonly Guid KeeperId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid HarveyPlayerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000002");
    private static readonly Guid LucyPlayerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000003");
    private static readonly Guid NoInvestigatorPlayerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000004");
    private static readonly Guid StrangerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000005");
    private static readonly Guid Harvey = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001");
    private static readonly Guid Lucy = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002");
    private static readonly Guid Stanley = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000003");
    private static readonly DateTimeOffset Now = new(2026, 10, 29, 12, 0, 0, TimeSpan.Zero);

    private readonly FakeCampaignRoles _roles = new FakeCampaignRoles()
        .With(CampaignId, KeeperId, CampaignMemberRole.Keeper)
        .With(CampaignId, HarveyPlayerId, CampaignMemberRole.Player)
        .With(CampaignId, LucyPlayerId, CampaignMemberRole.Player)
        .With(CampaignId, NoInvestigatorPlayerId, CampaignMemberRole.Player);

    private readonly FakeApprovedInvestigators _approved = new();
    private readonly FakeSceneHistory _history = new();
    private readonly FakeAccountNames _names = new();

    public SceneHistoryServiceTests()
    {
        _approved.Investigators.Add(new ApprovedInvestigatorRef(Harvey, HarveyPlayerId, "Harvey Walters"));
        _approved.Investigators.Add(new ApprovedInvestigatorRef(Lucy, LucyPlayerId, "Lucy Ward"));
        _names.Names[KeeperId] = "Eleanor Hart";
    }

    private SceneHistoryService Service => new(_roles, _approved, _history, _names);

    private static SceneRevealRecord Record(string title, int minute, params Guid[] recipients) =>
        new(Guid.NewGuid(), RevealSubjectKind.Handout, Guid.NewGuid(), Now.AddMinutes(minute), title, "Map", null, null, null, recipients);

    private static PlayedScene Played(
        string title,
        int startedMinuteAgo,
        int? finishedMinuteAgo,
        Guid[] present,
        SceneRevealRecord[] reveals,
        IReadOnlyList<RollRequestRecord>? requests = null) =>
        new(Guid.NewGuid(), Guid.NewGuid(), "The Haunting", title, Now.AddMinutes(-startedMinuteAgo), finishedMinuteAgo is null ? null : Now.AddMinutes(-finishedMinuteAgo.Value), present, reveals, requests ?? []);

    private static RequestedRollRecord HistoryRoll(Guid requestId, Guid investigator, RequestedRollStatus status = RequestedRollStatus.Waiting, Guid? rolledBy = null) =>
        new(
            requestId,
            investigator,
            60,
            false,
            false,
            RollRequestDifficulty.Regular,
            0,
            0,
            status,
            rolledBy is null
                ? []
                : [new StoredRollRecord("1D100", 25, [2, 5], rolledBy, Now, null, null)]);

    private static RollRequestRecord HistoryRequest(
        Guid sceneId,
        Guid requestId,
        string message,
        RollRequestVisibility visibility,
        int createdMinute,
        params RequestedRollRecord[] rolls) =>
        new(
            requestId,
            CampaignId,
            sceneId,
            new RollRequestTargetInput(RollRequestTargetKind.Skill, "Spot Hidden", null, null),
            message,
            visibility,
            RollRequestDifficulty.Regular,
            0,
            0,
            Now.AddMinutes(createdMinute),
            rolls);

    [Fact]
    public async Task Given_a_non_member_When_listing_history_Then_the_read_is_not_a_member_and_no_port_is_called()
    {
        var read = await Service.ListAsync(CampaignId, StrangerId, CancellationToken.None);

        Assert.IsType<NotAMemberHistoryRead>(read);
        Assert.Empty(_history.Calls);
        Assert.Empty(_names.Calls);
    }

    [Fact]
    public async Task Given_the_Keeper_When_listing_history_Then_every_scene_is_listed_with_every_reveal_and_present_names()
    {
        _history.Played.Add(Played("Meeting Knott", 60, 30, [Lucy, Harvey, Stanley], [Record("For both", 3, Harvey, Lucy), Record("For Stanley", 1, Stanley)]));

        var read = Assert.IsType<KeeperSceneHistoryRead>(await Service.ListAsync(CampaignId, KeeperId, CancellationToken.None));

        var scene = Assert.Single(read.Scenes);
        Assert.Equal(("Meeting Knott", "The Haunting"), (scene.Title, scene.ScenarioTitle));
        Assert.Equal([new InvestigatorPresentView(Stanley, null), new InvestigatorPresentView(Harvey, "Harvey Walters"), new InvestigatorPresentView(Lucy, "Lucy Ward")], scene.InvestigatorsPresent);
        Assert.Equal(["For both", "For Stanley"], scene.Reveals.Select(reveal => reveal.Reveal.Title).ToList());
        Assert.Equal(["Harvey Walters", "Lucy Ward"], scene.Reveals.First().Recipients.Select(recipient => recipient.Name).ToList());
        Assert.NotEqual(Guid.Empty, scene.Reveals.First().SubjectId);
    }

    [Fact]
    public async Task Given_a_player_When_listing_history_Then_only_their_reveals_are_listed_and_scenes_without_them_stay()
    {
        _history.Played.Add(Played("Meeting Knott", 60, 30, [Harvey, Lucy], [Record("For both", 3, Harvey, Lucy), Record("For Lucy", 2, Lucy)]));
        _history.Played.Add(Played("The Corbitt House", 10, null, [Lucy], [Record("For Lucy only", 1, Lucy)]));

        var read = Assert.IsType<PlayerSceneHistoryRead>(await Service.ListAsync(CampaignId, HarveyPlayerId, CancellationToken.None));

        Assert.Equal("Harvey Walters", read.InvestigatorName);
        Assert.Equal(["Meeting Knott", "The Corbitt House"], read.Scenes.Select(scene => scene.Title).ToList());
        Assert.Equal(["For both"], read.Scenes[0].Reveals.Select(reveal => reveal.Title).ToList());
        Assert.Empty(read.Scenes[1].Reveals);
    }

    [Fact]
    public async Task Given_a_player_without_an_approved_investigator_When_listing_history_Then_every_scene_is_listed_with_no_reveals()
    {
        _history.Played.Add(Played("Meeting Knott", 60, 30, [Harvey], [Record("For Harvey", 1, Harvey)]));

        var read = Assert.IsType<PlayerSceneHistoryRead>(await Service.ListAsync(CampaignId, NoInvestigatorPlayerId, CancellationToken.None));

        Assert.Null(read.InvestigatorName);
        var scene = Assert.Single(read.Scenes);
        Assert.Equal("Meeting Knott", scene.Title);
        Assert.Empty(scene.Reveals);
    }

    [Fact]
    public async Task Given_played_scenes_When_listing_history_Then_the_port_order_is_kept_and_reveals_are_newest_first()
    {
        _history.Played.Add(Played("Older started", 60, 30, [Harvey], [Record("Older reveal", 1, Harvey), Record("Newer reveal", 2, Harvey)]));
        _history.Played.Add(Played("Newer started", 10, null, [Harvey], []));

        var read = Assert.IsType<KeeperSceneHistoryRead>(await Service.ListAsync(CampaignId, KeeperId, CancellationToken.None));

        Assert.Equal(["Older started", "Newer started"], read.Scenes.Select(scene => scene.Title).ToList());
        Assert.Equal(["Newer reveal", "Older reveal"], read.Scenes[0].Reveals.Select(reveal => reveal.Reveal.Title).ToList());
    }

    [Fact]
    public void Given_the_player_history_shape_When_inspected_Then_it_carries_no_present_list_or_hidden_ids()
    {
        var members = typeof(PlayerHistorySceneView).GetProperties().Select(property => property.Name).ToList();

        Assert.DoesNotContain("ScenarioId", members);
        Assert.DoesNotContain("Location", members);
        Assert.DoesNotContain("InvestigatorsPresent", members);
        Assert.DoesNotContain("SubjectId", members);
        Assert.DoesNotContain("Recipients", members);
        Assert.DoesNotContain("RecipientIds", members);
    }

    [Fact]
    public async Task Given_requests_in_a_scene_When_the_Keeper_lists_history_Then_every_request_is_listed_newest_first_with_roller_names()
    {
        var sceneId = Guid.NewGuid();
        var olderId = Guid.Parse("ffffffff-0000-0000-0000-000000000011");
        var newerId = Guid.Parse("ffffffff-0000-0000-0000-000000000012");
        var older = HistoryRequest(sceneId, olderId, "Something moves upstairs.", RollRequestVisibility.Public, 3, HistoryRoll(olderId, Harvey, RequestedRollStatus.Rolled, KeeperId));
        var newer = HistoryRequest(sceneId, newerId, "A whisper.", RollRequestVisibility.KeeperOnly, 5, HistoryRoll(newerId, Lucy));
        _history.Played.Add(Played("The Corbitt House", 60, 30, [Harvey, Lucy], [], [older, newer]));

        var read = Assert.IsType<KeeperSceneHistoryRead>(await Service.ListAsync(CampaignId, KeeperId, CancellationToken.None));

        var scene = Assert.Single(read.Scenes);
        Assert.Equal([newerId, olderId], scene.RollRequests.Select(request => request.Id).ToList());
        Assert.Equal(RollRequestVisibility.KeeperOnly, scene.RollRequests[0].Visibility);
        Assert.Equal("Eleanor Hart", Assert.Single(scene.RollRequests[1].RequestedRolls).Rolls.Single().RolledByName);
    }

    [Fact]
    public async Task Given_requests_with_the_same_time_When_the_Keeper_lists_history_Then_the_lower_request_id_comes_first()
    {
        var sceneId = Guid.NewGuid();
        var lowerId = Guid.Parse("ffffffff-0000-0000-0000-000000000021");
        var higherId = Guid.Parse("ffffffff-0000-0000-0000-000000000022");
        _history.Played.Add(Played("The Corbitt House", 60, 30, [Harvey], [],
            [HistoryRequest(sceneId, higherId, "Second.", RollRequestVisibility.Public, 3, HistoryRoll(higherId, Harvey)),
             HistoryRequest(sceneId, lowerId, "First.", RollRequestVisibility.Public, 3, HistoryRoll(lowerId, Harvey))]));

        var read = Assert.IsType<KeeperSceneHistoryRead>(await Service.ListAsync(CampaignId, KeeperId, CancellationToken.None));

        Assert.Equal([lowerId, higherId], Assert.Single(read.Scenes).RollRequests.Select(request => request.Id).ToList());
    }

    [Fact]
    public async Task Given_public_KeeperOnly_and_unknown_requests_When_a_Player_lists_history_Then_only_the_Public_ones_are_listed()
    {
        var sceneId = Guid.NewGuid();
        var lucysId = Guid.Parse("ffffffff-0000-0000-0000-000000000031");
        var hiddenId = Guid.Parse("ffffffff-0000-0000-0000-000000000032");
        var unknownId = Guid.Parse("ffffffff-0000-0000-0000-000000000033");
        // Lucy's Public request does not involve Harvey, yet Harvey's Player still sees it.
        var lucys = HistoryRequest(sceneId, lucysId, "For Lucy.", RollRequestVisibility.Public, 4, HistoryRoll(lucysId, Lucy));
        var hidden = HistoryRequest(sceneId, hiddenId, "A whisper.", RollRequestVisibility.KeeperOnly, 5, HistoryRoll(hiddenId, Harvey));
        var unknown = HistoryRequest(sceneId, unknownId, "A murmur.", RollRequestVisibility.Unknown, 6, HistoryRoll(unknownId, Harvey));
        _history.Played.Add(Played("The Corbitt House", 60, 30, [Harvey, Lucy], [], [lucys, hidden, unknown]));

        var read = Assert.IsType<PlayerSceneHistoryRead>(await Service.ListAsync(CampaignId, HarveyPlayerId, CancellationToken.None));

        var single = Assert.Single(Assert.Single(read.Scenes).RollRequests);
        Assert.Equal(lucysId, single.Id);
        Assert.Equal(RollRequestVisibility.Public, single.Visibility);
    }

    [Fact]
    public async Task Given_a_Player_without_an_approved_investigator_When_listing_history_Then_Public_requests_are_listed_with_no_reveals()
    {
        var sceneId = Guid.NewGuid();
        var requestId = Guid.Parse("ffffffff-0000-0000-0000-000000000041");
        _history.Played.Add(Played("The Corbitt House", 60, 30, [Harvey], [Record("For Harvey", 1, Harvey)],
            [HistoryRequest(sceneId, requestId, "Something moves.", RollRequestVisibility.Public, 3, HistoryRoll(requestId, Harvey))]));

        var read = Assert.IsType<PlayerSceneHistoryRead>(await Service.ListAsync(CampaignId, NoInvestigatorPlayerId, CancellationToken.None));

        var scene = Assert.Single(read.Scenes);
        Assert.Empty(scene.Reveals);
        Assert.Equal(requestId, Assert.Single(scene.RollRequests).Id);
    }

    [Fact]
    public void Given_the_roll_request_views_When_inspected_Then_no_Account_id_reaches_them()
    {
        var names = new[] { typeof(RollRequestView), typeof(RequestedRollView), typeof(CompletedRollView) }
            .SelectMany(type => type.GetProperties().Select(property => property.Name))
            .ToList();

        Assert.DoesNotContain(names, name => name.Contains("Account", StringComparison.Ordinal));
    }
}
