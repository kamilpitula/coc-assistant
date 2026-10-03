namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// The identity fields the Player enters
/// (docs/game-rules/coc7_character_creation_and_development_rules.md section 1.1). The Player name is read from the
/// Account and never stored here.
/// </summary>
public sealed record InvestigatorIdentity(
    string? Name,
    int? Age,
    string? Gender,
    string? Residence,
    string? Birthplace)
{
    public static readonly InvestigatorIdentity Empty = new(null, null, null, null, null);
}
