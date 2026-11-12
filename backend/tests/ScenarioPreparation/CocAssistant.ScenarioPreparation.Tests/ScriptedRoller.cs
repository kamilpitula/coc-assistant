namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Scripted dice for tests: faces come out in the queued order. Local to this test project because test projects
/// reference only production projects, so the GameRules.Tests roller is unreachable here.
/// </summary>
internal sealed class ScriptedRoller : IDiceRoller
{
    private readonly Queue<int> _faces;

    public ScriptedRoller(params int[] faces) => _faces = new Queue<int>(faces);

    public int Roll(int sides) => _faces.Dequeue();
}
