namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>The checks <c>Scene.Reveal</c> runs before it records anything, in their order (PBI-SPL-002 D1).</summary>
public class SceneRevealChecksTests
{
    private static readonly Guid Harvey = SceneStartExtensions.Harvey;
    private static readonly Guid Lucy = SceneStartExtensions.Lucy;
    private static readonly Guid Outsider = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000009");
    private static readonly DateTimeOffset Now = new(2026, 10, 29, 12, 0, 0, TimeSpan.Zero);
    private static readonly Scenario TheHaunting = Scenario.Create(Guid.NewGuid(), "The Haunting", null, 1, Now).Scenario!;

    private const string Text = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The door creaks open\"}]}]}}";

    private static Scene SceneWith(out Handout playerFacing, out Handout keeperFacing, out NonPlayerEntityLink link)
    {
        var scene = Scene.Create(TheHaunting, "The Corbitt House", null, null, 1, Now).Scene!;
        playerFacing = scene.AddHandout(HandoutKind.ReadAloud, HandoutVisibility.PlayerFacing, "Door", Text, Now).Handout!;
        keeperFacing = scene.AddHandout(HandoutKind.Text, HandoutVisibility.KeeperFacing, "Secret", Text, Now).Handout!;
        link = scene.LinkNonPlayerEntity(NonPlayerEntityType.HumanNpc, Guid.NewGuid(), true, "A clerk", null, Now).Link!;
        return scene;
    }

    private static SubjectCheck Check(Scene scene, SceneStatus status, RevealSubject subject) =>
        SceneRevealChecks.CheckSubject(status, subject, scene.Handouts, scene.NonPlayerEntityLinks);

    [Theory]
    [InlineData(SceneStatus.Prepared)]
    [InlineData(SceneStatus.Finished)]
    public void Given_a_scene_that_is_not_active_When_checking_the_subject_Then_not_active_wins_over_every_other_refusal(SceneStatus status)
    {
        var scene = SceneWith(out _, out _, out _);

        var check = Check(scene, status, new RevealSubject(RevealSubjectType.Item, Guid.NewGuid()));

        Assert.Equal((RevealOutcome.NotActive, null, null), (check.Outcome, check.Handout, check.Link));
    }

    [Fact]
    public void Given_an_unlinked_Item_When_checking_the_subject_Then_the_subject_is_not_found()
    {
        var scene = SceneWith(out _, out _, out _);

        Assert.Equal(RevealOutcome.SubjectNotFound, Check(scene, SceneStatus.Active, new RevealSubject(RevealSubjectType.Item, Guid.NewGuid())).Outcome);
    }

    [Fact]
    public void Given_an_unknown_id_When_checking_the_subject_Then_it_is_not_found_for_a_handout_and_for_a_link()
    {
        var scene = SceneWith(out _, out _, out _);

        Assert.Equal(RevealOutcome.SubjectNotFound, Check(scene, SceneStatus.Active, new RevealSubject(RevealSubjectType.Handout, Guid.NewGuid())).Outcome);
        Assert.Equal(RevealOutcome.SubjectNotFound, Check(scene, SceneStatus.Active, new RevealSubject(RevealSubjectType.NonPlayerEntity, Guid.NewGuid())).Outcome);
    }

    [Fact]
    public void Given_a_handout_id_used_as_a_link_When_checking_the_subject_Then_the_type_decides_where_it_is_looked_for()
    {
        var scene = SceneWith(out var playerFacing, out _, out _);

        Assert.Equal(RevealOutcome.SubjectNotFound, Check(scene, SceneStatus.Active, new RevealSubject(RevealSubjectType.NonPlayerEntity, playerFacing.Id)).Outcome);
    }

    [Fact]
    public void Given_a_keeper_facing_handout_When_checking_the_subject_Then_it_is_refused_and_a_player_facing_one_is_found()
    {
        var scene = SceneWith(out var playerFacing, out var keeperFacing, out _);

        var refused = Check(scene, SceneStatus.Active, new RevealSubject(RevealSubjectType.Handout, keeperFacing.Id));
        var found = Check(scene, SceneStatus.Active, new RevealSubject(RevealSubjectType.Handout, playerFacing.Id));

        Assert.Equal(RevealOutcome.SubjectKeeperFacing, refused.Outcome);
        Assert.Equal((RevealOutcome.Revealed, playerFacing, null), (found.Outcome, found.Handout, found.Link));
    }

    [Fact]
    public void Given_a_link_When_checking_the_subject_Then_it_is_found_and_never_keeper_facing()
    {
        var scene = SceneWith(out _, out _, out var link);

        var check = Check(scene, SceneStatus.Active, new RevealSubject(RevealSubjectType.NonPlayerEntity, link.Id));

        Assert.Equal((RevealOutcome.Revealed, null, link), (check.Outcome, check.Handout, check.Link));
    }

    [Theory]
    [MemberData(nameof(Recipients))]
    public void Given_recipients_When_checking_them_Then_each_refusal_follows_the_start_rules(Guid[] recipients, RevealOutcome expected)
    {
        Assert.Equal(expected, SceneRevealChecks.CheckRecipients(recipients, [Harvey, Lucy]));
    }

    public static TheoryData<Guid[], RevealOutcome> Recipients() => new()
    {
        { [], RevealOutcome.NoRecipient },
        { [Harvey, Harvey], RevealOutcome.DuplicateRecipient },
        { [Harvey, Outsider], RevealOutcome.RecipientNotPresent },
        { [Lucy], RevealOutcome.Revealed },
        { [Harvey, Lucy], RevealOutcome.Revealed },
    };

    [Fact]
    public void Given_an_empty_recipient_list_that_also_repeats_nobody_When_checking_Then_empty_is_checked_before_present()
    {
        Assert.Equal(RevealOutcome.NoRecipient, SceneRevealChecks.CheckRecipients([], []));
    }
}
