namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The result of <see cref="MythosCreature.Create"/>: the Mythos Creature when there are no problems, otherwise null.</summary>
public sealed record MythosCreatureCreation(IReadOnlyList<MonsterProfileProblem> Problems, MythosCreature? MythosCreature);

/// <summary>
/// A Keeper-only Mythos Creature of one Campaign (CONTEXT.md, Mythos Creature) with its Monster Profile. It stores its
/// Campaign id and never becomes a Human NPC: the type is its own table (ADR 0013; spec.md Regression Guardrails). Create
/// and Edit enforce the profile rules; a refused write changes nothing.
/// </summary>
public class MythosCreature
{
    public Guid Id { get; private set; }
    public Guid CampaignId { get; private set; }
    public string Name { get; private set; }
    public MonsterProfile Profile { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private MythosCreature()
    {
        Name = string.Empty;
        Profile = MonsterProfile.Empty;
    }

    private MythosCreature(Guid campaignId, string name, MonsterProfile profile, DateTimeOffset createdAt)
    {
        Id = Guid.NewGuid();
        CampaignId = campaignId;
        Name = name;
        Profile = profile;
        CreatedAt = createdAt;
    }

    /// <summary>Creates a Mythos Creature with an empty profile, or reports what is wrong with its name.</summary>
    public static MythosCreatureCreation Create(Guid campaignId, string? name, DateTimeOffset now)
    {
        var problems = MonsterProfileValidation.Name(name);
        return problems.Count > 0
            ? new MythosCreatureCreation(problems, null)
            : new MythosCreatureCreation(problems, new MythosCreature(campaignId, name!.Trim(), MonsterProfile.Empty, now));
    }

    /// <summary>
    /// A new Mythos Creature of the same Campaign with the stored profile as it is and the name from <see cref="ProfileCopyName"/>.
    /// It never re-validates and copies nothing else (spec.md, Constraints, Duplicate).
    /// </summary>
    public MythosCreature Duplicate(DateTimeOffset now) => new(CampaignId, ProfileCopyName.For(Name), Profile, now);

    /// <summary>
    /// Replaces the name and the whole profile, or returns the problems and changes nothing. A null section removes it.
    /// </summary>
    public IReadOnlyList<MonsterProfileProblem> Edit(string? name, MonsterProfile profile)
    {
        var problems = MonsterProfileValidation.Validate(name, profile);
        if (problems.Count == 0)
        {
            Name = name!.Trim();
            Profile = MonsterProfileNormalizer.Normalize(profile);
        }

        return problems;
    }
}
