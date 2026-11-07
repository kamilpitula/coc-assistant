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

    public SceneHistoryServiceTests()
    {
        _approved.Investigators.Add(new ApprovedInvestigatorRef(Harvey, HarveyPlayerId, "Harvey Walters"));
        _approved.Investigators.Add(new ApprovedInvestigatorRef(Lucy, LucyPlayerId, "Lucy Ward"));
    }

    private SceneHistoryService Service => new(_roles, _approved, _history);

    private static SceneRevealRecord Record(string title, int minute, params Guid[] recipients) =>
        new(Guid.NewGuid(), RevealSubjectKind.Handout, Guid.NewGuid(), Now.AddMinutes(minute), title, "Map", null, null, null, recipients);

    private static PlayedScene Played(string title, int startedMinuteAgo, int? finishedMinuteAgo, Guid[] present, params SceneRevealRecord[] reveals) =>
        new(Guid.NewGuid(), Guid.NewGuid(), "The Haunting", title, Now.AddMinutes(-startedMinuteAgo), finishedMinuteAgo is null ? null : Now.AddMinutes(-finishedMinuteAgo.Value), present, reveals);

    [Fact]
    public async Task Given_a_non_member_When_listing_history_Then_the_read_is_not_a_member_and_no_port_is_called()
    {
        var read = await Service.ListAsync(CampaignId, StrangerId, CancellationToken.None);

        Assert.IsType<NotAMemberHistoryRead>(read);
        Assert.Empty(_history.Calls);
    }

    [Fact]
    public async Task Given_the_Keeper_When_listing_history_Then_every_scene_is_listed_with_every_reveal_and_present_names()
    {
        _history.Played.Add(Played("Meeting Knott", 60, 30, [Lucy, Harvey, Stanley], Record("For both", 3, Harvey, Lucy), Record("For Stanley", 1, Stanley)));

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
        _history.Played.Add(Played("Meeting Knott", 60, 30, [Harvey, Lucy], Record("For both", 3, Harvey, Lucy), Record("For Lucy", 2, Lucy)));
        _history.Played.Add(Played("The Corbitt House", 10, null, [Lucy], Record("For Lucy only", 1, Lucy)));

        var read = Assert.IsType<PlayerSceneHistoryRead>(await Service.ListAsync(CampaignId, HarveyPlayerId, CancellationToken.None));

        Assert.Equal("Harvey Walters", read.InvestigatorName);
        Assert.Equal(["Meeting Knott", "The Corbitt House"], read.Scenes.Select(scene => scene.Title).ToList());
        Assert.Equal(["For both"], read.Scenes[0].Reveals.Select(reveal => reveal.Title).ToList());
        Assert.Empty(read.Scenes[1].Reveals);
    }

    [Fact]
    public async Task Given_a_player_without_an_approved_investigator_When_listing_history_Then_every_scene_is_listed_with_no_reveals()
    {
        _history.Played.Add(Played("Meeting Knott", 60, 30, [Harvey], Record("For Harvey", 1, Harvey)));

        var read = Assert.IsType<PlayerSceneHistoryRead>(await Service.ListAsync(CampaignId, NoInvestigatorPlayerId, CancellationToken.None));

        Assert.Null(read.InvestigatorName);
        var scene = Assert.Single(read.Scenes);
        Assert.Equal("Meeting Knott", scene.Title);
        Assert.Empty(scene.Reveals);
    }

    [Fact]
    public async Task Given_played_scenes_When_listing_history_Then_the_port_order_is_kept_and_reveals_are_newest_first()
    {
        _history.Played.Add(Played("Older started", 60, 30, [Harvey], Record("Older reveal", 1, Harvey), Record("Newer reveal", 2, Harvey)));
        _history.Played.Add(Played("Newer started", 10, null, [Harvey]));

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
}
