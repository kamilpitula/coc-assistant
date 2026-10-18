namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The result of <see cref="HumanNpc.Create"/>: the Human NPC when there are no problems, otherwise null.</summary>
public sealed record HumanNpcCreation(IReadOnlyList<NpcProfileProblem> Problems, HumanNpc? HumanNpc);

/// <summary>
/// A Keeper-only Human NPC of one Campaign (CONTEXT.md, Human NPC) with its NPC Profile. It stores its Campaign id and
/// never becomes a Mythos Creature: the type is its own table (ADR 0013; spec.md Regression Guardrails). Create and Edit
/// enforce the profile rules; a refused write changes nothing.
/// </summary>
public class HumanNpc
{
    public Guid Id { get; private set; }
    public Guid CampaignId { get; private set; }
    public string Name { get; private set; }
    public NpcProfile Profile { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private HumanNpc()
    {
        Name = string.Empty;
        Profile = NpcProfile.Narrative(null);
    }

    private HumanNpc(Guid campaignId, string name, NpcProfile profile, DateTimeOffset createdAt)
    {
        Id = Guid.NewGuid();
        CampaignId = campaignId;
        Name = name;
        Profile = profile;
        CreatedAt = createdAt;
    }

    /// <summary>Creates a Human NPC with a narrative-only profile, or reports what is wrong with its name and age.</summary>
    public static HumanNpcCreation Create(Guid campaignId, string? name, int? age, DateTimeOffset now)
    {
        var problems = NpcProfileValidation.Identity(name, age);
        return problems.Count > 0
            ? new HumanNpcCreation(problems, null)
            : new HumanNpcCreation(problems, new HumanNpc(campaignId, name!.Trim(), NpcProfile.Narrative(age), now));
    }

    /// <summary>
    /// Replaces the name and the whole profile, or returns the problems and changes nothing. A null section removes it.
    /// </summary>
    public IReadOnlyList<NpcProfileProblem> Edit(string? name, NpcProfile profile, CombatSkillSpecializations specializations)
    {
        var problems = NpcProfileValidation.Validate(name, profile, specializations);
        if (problems.Count == 0)
        {
            Name = name!.Trim();
            Profile = NpcProfileNormalizer.Normalize(profile);
        }

        return problems;
    }
}
