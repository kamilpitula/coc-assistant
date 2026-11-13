namespace CocAssistant.ScenarioPreparation.Domain.RollRequests;

/// <summary>What a Roll Request can ask for (specs/roll-requests/spec.md, Roll Request): a skill, a characteristic, or Luck.</summary>
public enum RollTargetKind
{
    Skill,
    Characteristic,
    Luck,
}

/// <summary>
/// A Roll Request's target: the kind, the skill with its optional specialization, or the characteristic. Luck needs neither.
/// </summary>
public class RollTarget
{
    public RollTargetKind Kind { get; private set; }
    public string? Skill { get; private set; }
    public string? Specialization { get; private set; }
    public Characteristic? Characteristic { get; private set; }

    private RollTarget()
    {
    }

    public RollTarget(RollTargetKind kind, string? skill = null, string? specialization = null, Characteristic? characteristic = null)
    {
        Kind = kind;
        Skill = skill;
        Specialization = specialization;
        Characteristic = characteristic;
    }
}
