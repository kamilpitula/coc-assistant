namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Test seed: starts a Scene with one Approved Investigator present, for tests that are not about who is present.</summary>
public static class SceneStartExtensions
{
    public static readonly Guid Harvey = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001");
    public static readonly Guid Lucy = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002");

    public static SceneTransitionOutcome StartWithOneInvestigator(this Scene scene, DateTimeOffset now) =>
        scene.Start(now, [Harvey], [Harvey, Lucy]);
}
