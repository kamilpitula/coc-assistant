namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Starting, finishing, and re-staffing a Scene, and the Version it bumps (specs/scene-play/spec.md, ADR 0024, ADR 0025).</summary>
public class SceneLifecycleTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset Now = new(2026, 10, 17, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Later = Now.AddHours(1);
    private static readonly Scenario TheHaunting = Scenario.Create(CampaignId, "The Haunting", null, 1, Now).Scenario!;
    private static readonly Guid Harvey = SceneStartExtensions.Harvey;
    private static readonly Guid Lucy = SceneStartExtensions.Lucy;
    private static readonly Guid Submitted = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000009");
    private static readonly Guid[] Approved = [Harvey, Lucy];

    private static Scene PreparedScene() => Scene.Create(TheHaunting, "The Corbitt House", "Arkham", null, 1, Now).Scene!;

    private static Scene ActiveScene()
    {
        var scene = PreparedScene();
        scene.Start(Now, [Harvey], Approved);
        return scene;
    }

    [Fact]
    public void Given_a_prepared_scene_When_started_with_approved_investigators_Then_it_is_active_with_them_present_and_a_new_version()
    {
        var scene = PreparedScene();

        Assert.Equal(SceneTransitionOutcome.Transitioned, scene.Start(Now, [Lucy, Harvey], Approved));

        Assert.Equal((SceneStatus.Active, (DateTimeOffset?)Now, (DateTimeOffset?)null, 1), (scene.Status, scene.StartedAt, scene.FinishedAt, scene.Version));
        Assert.Equal(new[] { Harvey, Lucy }.Order(), scene.InvestigatorsPresent);
    }

    [Fact]
    public void Given_a_scene_that_is_not_prepared_When_started_Then_it_is_refused_as_not_prepared_before_the_list_is_checked()
    {
        var active = ActiveScene();
        Assert.Equal(SceneTransitionOutcome.NotPrepared, active.Start(Later, [], Approved));
        Assert.Equal((SceneStatus.Active, (DateTimeOffset?)Now, 1), (active.Status, active.StartedAt, active.Version));

        var finished = ActiveScene();
        finished.Finish(Later);
        Assert.Equal(SceneTransitionOutcome.NotPrepared, finished.Start(Later, [Submitted], Approved));
        Assert.Equal((SceneStatus.Finished, 2), (finished.Status, finished.Version));
    }

    [Fact]
    public void Given_an_unacceptable_present_list_When_started_Then_it_is_refused_and_nothing_changes()
    {
        var scene = PreparedScene();

        Assert.Equal(SceneTransitionOutcome.NoInvestigatorPresent, scene.Start(Now, [], Approved));
        Assert.Equal(SceneTransitionOutcome.DuplicateInvestigator, scene.Start(Now, [Harvey, Harvey], Approved));
        Assert.Equal(SceneTransitionOutcome.InvestigatorNotApproved, scene.Start(Now, [Harvey, Submitted], Approved));

        Assert.Equal((SceneStatus.Prepared, (DateTimeOffset?)null, 0), (scene.Status, scene.StartedAt, scene.Version));
        Assert.Empty(scene.InvestigatorsPresent);
    }

    [Fact]
    public void Given_an_active_scene_When_finished_Then_it_is_finished_keeps_the_present_set_and_has_a_new_version()
    {
        var scene = ActiveScene();

        Assert.Equal(SceneTransitionOutcome.Transitioned, scene.Finish(Later));

        Assert.Equal((SceneStatus.Finished, (DateTimeOffset?)Now, (DateTimeOffset?)Later, 2), (scene.Status, scene.StartedAt, scene.FinishedAt, scene.Version));
        Assert.Equal([Harvey], scene.InvestigatorsPresent);
    }

    [Fact]
    public void Given_a_scene_that_is_not_active_When_finished_Then_it_is_refused_and_nothing_changes()
    {
        var prepared = PreparedScene();
        Assert.Equal(SceneTransitionOutcome.NotActive, prepared.Finish(Later));
        Assert.Equal((SceneStatus.Prepared, (DateTimeOffset?)null, 0), (prepared.Status, prepared.FinishedAt, prepared.Version));

        var finished = ActiveScene();
        finished.Finish(Later);
        Assert.Equal(SceneTransitionOutcome.NotActive, finished.Finish(Later.AddHours(1)));
        Assert.Equal((DateTimeOffset?)Later, finished.FinishedAt);
    }

    [Fact]
    public void Given_an_active_scene_When_the_present_set_is_replaced_Then_it_holds_exactly_the_new_set_and_has_a_new_version()
    {
        var scene = ActiveScene();

        Assert.Equal(SceneTransitionOutcome.Transitioned, scene.ReplaceInvestigatorsPresent([Lucy], Approved));

        Assert.Equal([Lucy], scene.InvestigatorsPresent);
        Assert.Equal(2, scene.Version);
    }

    [Fact]
    public void Given_an_active_scene_When_the_replacement_is_unacceptable_Then_it_is_refused_and_the_set_is_kept()
    {
        var scene = ActiveScene();

        Assert.Equal(SceneTransitionOutcome.NoInvestigatorPresent, scene.ReplaceInvestigatorsPresent([], Approved));
        Assert.Equal(SceneTransitionOutcome.DuplicateInvestigator, scene.ReplaceInvestigatorsPresent([Lucy, Lucy], Approved));
        Assert.Equal(SceneTransitionOutcome.InvestigatorNotApproved, scene.ReplaceInvestigatorsPresent([Submitted], Approved));

        Assert.Equal([Harvey], scene.InvestigatorsPresent);
        Assert.Equal(1, scene.Version);
    }

    [Fact]
    public void Given_a_scene_that_is_not_active_When_the_present_set_is_replaced_Then_it_is_refused_as_not_active()
    {
        var prepared = PreparedScene();
        Assert.Equal(SceneTransitionOutcome.NotActive, prepared.ReplaceInvestigatorsPresent([Harvey], Approved));
        Assert.Empty(prepared.InvestigatorsPresent);

        var finished = ActiveScene();
        finished.Finish(Later);
        Assert.Equal(SceneTransitionOutcome.NotActive, finished.ReplaceInvestigatorsPresent([Lucy], Approved));
        Assert.Equal([Harvey], finished.InvestigatorsPresent);
    }

    [Fact]
    public void Given_a_prepared_scene_When_guarding_linked_material_removal_Then_it_returns_true_and_bumps_the_version()
    {
        var scene = PreparedScene();

        Assert.True(scene.GuardLinkedMaterialRemoval());
        Assert.Equal(1, scene.Version);
    }

    [Fact]
    public void Given_a_scene_that_is_not_prepared_When_guarding_linked_material_removal_Then_it_returns_false_and_keeps_the_version()
    {
        var active = ActiveScene();
        Assert.False(active.GuardLinkedMaterialRemoval());
        Assert.Equal(1, active.Version);

        active.Finish(Later);
        Assert.False(active.GuardLinkedMaterialRemoval());
        Assert.Equal(2, active.Version);
    }

    [Fact]
    public void Given_a_prepared_scene_with_a_handout_When_the_handout_is_removed_Then_the_version_changes_only_on_removal()
    {
        var scene = PreparedScene();
        var handout = scene.AddHandout(HandoutKind.Text, HandoutVisibility.PlayerFacing, "Diary", ScenarioPreparationTestBuilder.RichText("Dear diary"), Now).Handout!;

        Assert.Equal(HandoutRemovalOutcome.HandoutNotFound, scene.RemoveHandout(Guid.NewGuid()));
        Assert.Equal(0, scene.Version);

        Assert.Equal(HandoutRemovalOutcome.Removed, scene.RemoveHandout(handout.Id));
        Assert.Equal(1, scene.Version);
    }
}
