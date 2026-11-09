namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// Everything the Player enters for a Character Sheet (specs/character-sheet/spec.md, API Contracts). Dice results
/// are never an input: every creation dice result is rolled by the server (specs/character-sheet/spec.md, Creation
/// rolling) and stored as a Roll Record the PUT keeps.
/// </summary>
public sealed record CharacterSheetInputs(
    InvestigatorIdentity Identity,
    CreationMethod? CreationMethod,
    CharacteristicValues AssignedCharacteristics,
    CharacteristicValues AgeDeductions,
    OccupationSelection? Occupation = null,
    IReadOnlyList<SkillAllocation>? SkillAllocations = null,
    QuickFireSkills? QuickFire = null,
    BackstoryAndPossessions? BackstoryAndPossessions = null)
{
    public CharacterSheet ToCharacterSheet() =>
        new(
            Identity,
            CreationMethod,
            AssignedCharacteristics,
            AgeDeductions,
            [],
            Occupation,
            SkillAllocations ?? [],
            QuickFire ?? QuickFireSkills.Empty,
            BackstoryAndPossessions ?? BackstoryAndPossessions.Empty);
}
