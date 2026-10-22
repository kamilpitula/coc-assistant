namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// A child of a Scene that refers to one Human NPC or one Mythos Creature of the Scene's Campaign and carries the only parts
/// a Player ever receives: the Player-facing name and the rich-text Player-facing description (specs/scenario-preparation/spec.md).
/// Exactly one of the two foreign keys is set; the entity never changes after linking (ADR 0019).
/// </summary>
public class NonPlayerEntityLink
{
    public const int PlayerFacingNameMaxLength = 200;

    public Guid Id { get; private set; }
    public Guid SceneId { get; private set; }

    /// <summary>The trimmed Player-facing name.</summary>
    public string PlayerFacingName { get; private set; }

    /// <summary>The validated Lexical JSON text exactly as received (ADR 0015), or null when the link has no description.</summary>
    public string? PlayerFacingDescription { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public NonPlayerEntityType Type => HumanNpcId.HasValue ? NonPlayerEntityType.HumanNpc : NonPlayerEntityType.MythosCreature;

    public Guid NonPlayerEntityId => HumanNpcId ?? MythosCreatureId!.Value;

    private Guid? HumanNpcId { get; set; }

    private Guid? MythosCreatureId { get; set; }

    private NonPlayerEntityLink()
    {
        PlayerFacingName = string.Empty;
    }

    private NonPlayerEntityLink(Guid sceneId, NonPlayerEntityType type, Guid nonPlayerEntityId, string name, string? description, DateTimeOffset createdAt)
    {
        Id = Guid.NewGuid();
        SceneId = sceneId;
        HumanNpcId = type == NonPlayerEntityType.HumanNpc ? nonPlayerEntityId : null;
        MythosCreatureId = type == NonPlayerEntityType.MythosCreature ? nonPlayerEntityId : null;
        PlayerFacingName = name;
        PlayerFacingDescription = description;
        CreatedAt = createdAt;
    }

    internal static NonPlayerEntityLink Create(Guid sceneId, NonPlayerEntityType type, Guid nonPlayerEntityId, string trimmedName, string? description, DateTimeOffset now) =>
        new(sceneId, type, nonPlayerEntityId, trimmedName, description, now);

    internal void Replace(string trimmedName, string? description)
    {
        PlayerFacingName = trimmedName;
        PlayerFacingDescription = description;
    }

    internal static NonPlayerEntityLinkOutcome Validate(string name, string? description, out string trimmedName)
    {
        trimmedName = name.Trim();
        if (trimmedName.Length is 0 or > PlayerFacingNameMaxLength)
        {
            return NonPlayerEntityLinkOutcome.InvalidPlayerFacingName;
        }

        return description is null || RichTextDocument.Validate(description) == RichTextOutcome.Accepted
            ? NonPlayerEntityLinkOutcome.Accepted
            : NonPlayerEntityLinkOutcome.InvalidPlayerFacingDescription;
    }
}
