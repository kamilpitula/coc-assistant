namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// The Player's inputs for an Investigator's Character Sheet
/// (docs/game-rules/coc7_character_creation_and_development_rules.md section 1). Derived values are never stored;
/// they are computed from these inputs.
/// </summary>
public sealed record CharacterSheet(
    InvestigatorIdentity Identity,
    CreationMethod? CreationMethod,
    CharacteristicValues AssignedCharacteristics)
{
    /// <summary>The schema version of the stored Character Sheet (ADR 0005, ADR 0007).</summary>
    public const int CurrentSchemaVersion = 1;

    public static readonly CharacterSheet Empty = new(InvestigatorIdentity.Empty, null, CharacteristicValues.Empty);
}
