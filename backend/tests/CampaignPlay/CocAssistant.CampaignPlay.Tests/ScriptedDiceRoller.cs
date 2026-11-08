namespace CocAssistant.CampaignPlay.Tests;

public sealed class ScriptedDiceRoller : IDiceRoller
{
    private readonly Queue<int> _faces;

    public ScriptedDiceRoller(IEnumerable<int> faces)
    {
        _faces = new Queue<int>(faces);
    }

    public int Roll(int sides) => _faces.Dequeue();
}
