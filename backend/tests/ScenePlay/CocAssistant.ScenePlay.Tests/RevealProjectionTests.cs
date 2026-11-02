namespace CocAssistant.ScenePlay.Tests;

/// <summary>
/// The Active Scene projections with Reveals (PBI-SPL-002 D5): a Player sees only what reached their Investigator and never a
/// subject id or recipients; the Keeper sees every Reveal with both; an absent Player's shape is unchanged.
/// </summary>
public class RevealProjectionTests
{
    private static readonly Guid CampaignId = Guid.Parse("cccccccc-0000-0000-0000-000000000001");
    private static readonly Guid KeeperId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid HarveyPlayerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000002");
    private static readonly Guid LucyPlayerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000003");
    private static readonly Guid Harvey = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001");
    private static readonly Guid Lucy = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002");
    private static readonly Guid Stanley = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000003");
    private static readonly DateTimeOffset Now = new(2026, 10, 29, 12, 0, 0, TimeSpan.Zero);

    private readonly FakeCampaignRoles _roles = new FakeCampaignRoles()
        .With(CampaignId, KeeperId, CampaignMemberRole.Keeper)
        .With(CampaignId, HarveyPlayerId, CampaignMemberRole.Player)
        .With(CampaignId, LucyPlayerId, CampaignMemberRole.Player);

    private readonly FakePlayableScenes _scenes = new();
    private readonly FakeApprovedInvestigators _approved = new();

    public RevealProjectionTests()
    {
        _approved.Investigators.Add(new ApprovedInvestigatorRef(Harvey, HarveyPlayerId, "Harvey Walters"));
        _approved.Investigators.Add(new ApprovedInvestigatorRef(Lucy, LucyPlayerId, "Lucy Ward"));
    }

    private ActiveSceneService Service => new(_roles, _scenes, _approved, new RecordingSceneWallEntries(), new RecordingActiveSceneSignals(), new RecordingLogger<ActiveSceneService>());

    private static SceneRevealRecord Record(string title, int minute, params Guid[] recipients) =>
        new(Guid.NewGuid(), RevealSubjectKind.Handout, Guid.NewGuid(), Now.AddMinutes(minute), title, "Map", null, new RevealedFileDetails("cellar.png", "image/png", 68), "A cellar plan", recipients);

    private void ArrangeScene(params Guid[] present) =>
        _scenes.Active = new PlayableScene(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "The Haunting",
            "The Corbitt House",
            "Arkham",
            Now,
            present,
            [Record("For Harvey", 1, Harvey), Record("For both", 3, Harvey, Lucy), Record("For Lucy", 2, Lucy)]);

    [Fact]
    public async Task Given_reveals_to_different_investigators_When_a_present_player_reads_Then_only_their_reveals_are_listed_newest_first()
    {
        ArrangeScene(Harvey, Lucy);

        var read = Assert.IsType<PresentPlayerActiveSceneRead>(await Service.GetAsync(CampaignId, HarveyPlayerId, CancellationToken.None));

        Assert.Equal(["For both", "For Harvey"], read.Scene.Reveals.Select(reveal => reveal.Title).ToList());
    }

    [Fact]
    public async Task Given_a_present_player_When_reading_Then_the_reveal_view_carries_the_snapshot_and_no_subject_id_or_recipients()
    {
        ArrangeScene(Harvey, Lucy);

        var read = Assert.IsType<PresentPlayerActiveSceneRead>(await Service.GetAsync(CampaignId, LucyPlayerId, CancellationToken.None));

        var reveal = read.Scene.Reveals.First();
        Assert.Equal(("Map", "A cellar plan", "cellar.png"), (reveal.HandoutKind, reveal.ImageDescription, reveal.File!.Name));
        var members = typeof(PlayerRevealView).GetProperties().Select(property => property.Name).ToList();
        Assert.DoesNotContain("SubjectId", members);
        Assert.DoesNotContain("Recipients", members);
        Assert.DoesNotContain("RecipientIds", members);
    }

    [Fact]
    public async Task Given_a_player_whose_investigator_is_not_present_When_reading_Then_the_absent_shape_is_unchanged()
    {
        ArrangeScene(Harvey);

        var read = Assert.IsType<AbsentPlayerActiveSceneRead>(await Service.GetAsync(CampaignId, LucyPlayerId, CancellationToken.None));

        Assert.Equal("The Corbitt House", read.Title);
    }

    [Fact]
    public async Task Given_the_Keeper_When_reading_Then_every_reveal_is_listed_newest_first_with_subject_and_recipient_names()
    {
        ArrangeScene(Harvey, Lucy);

        var read = Assert.IsType<KeeperActiveSceneRead>(await Service.GetAsync(CampaignId, KeeperId, CancellationToken.None));

        Assert.Equal(["For both", "For Lucy", "For Harvey"], read.Scene.Reveals.Select(reveal => reveal.Reveal.Title).ToList());
        Assert.Equal(["Harvey Walters", "Lucy Ward"], read.Scene.Reveals.First().Recipients.Select(recipient => recipient.Name).ToList());
        Assert.NotEqual(Guid.Empty, read.Scene.Reveals.First().SubjectId);
    }

    [Fact]
    public async Task Given_a_recipient_who_is_not_approved_any_more_When_the_Keeper_reads_Then_the_recipient_has_a_null_name()
    {
        _scenes.Active = new PlayableScene(Guid.NewGuid(), Guid.NewGuid(), "The Haunting", "The Corbitt House", "Arkham", Now, [Harvey], [Record("For Stanley", 1, Stanley)]);

        var read = Assert.IsType<KeeperActiveSceneRead>(await Service.GetAsync(CampaignId, KeeperId, CancellationToken.None));

        Assert.Equal([new RevealRecipientView(Stanley, null)], read.Scene.Reveals.Single().Recipients);
    }
}
