namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// The Investigator's Occupation as the rules see it: catalog or custom, its Credit Rating range, its point formula,
/// its skill slots, and the occupation skills the slots and the Player's picks give (section 7.2). Values are null
/// while unknown, for example for an id the Era's catalog does not have.
/// </summary>
public sealed record ResolvedOccupation(
    string? CatalogId,
    bool IsCustom,
    string? Name,
    int? CreditRatingMin,
    int? CreditRatingMax,
    OccupationPointFormula? Formula,
    IReadOnlyList<OccupationSkillSlot> Slots,
    IReadOnlyList<SkillReference> OccupationSkills)
{
    public bool IsKnown => Name is not null || IsCustom;

    public bool IsOccupationSkill(SkillReference skill) => OccupationSkills.Contains(skill);
}

/// <summary>Resolves the Player's Occupation selection against the Era's catalog: sections 7 and 7.2.</summary>
public static class OccupationResolution
{
    /// <summary>Slots naming a skill with this specialization take the Player's specialization.</summary>
    public const string AnySpecialization = "any";

    public static ResolvedOccupation? Resolve(OccupationSelection? selection, OccupationCatalog catalog)
    {
        if (selection is null)
        {
            return null;
        }

        if (selection.CatalogId is { } id)
        {
            return ResolveCatalog(id, selection, catalog);
        }

        return selection.Custom is { } custom ? ResolveCustom(custom) : null;
    }

    /// <summary>The skill a fixed skill slot gives without a pick, or null when the slot needs the Player's pick.</summary>
    public static SkillReference? FixedSkillOf(OccupationSkillSlot slot) =>
        slot.Kind == OccupationSkillSlotKind.Skill && slot.Specialization != AnySpecialization
            ? new SkillReference(slot.Skill!, slot.Specialization)
            : null;

    /// <summary>How many picks a slot needs: none for a fixed skill, one for a skill with any specialization, else its count.</summary>
    public static int PicksNeeded(OccupationSkillSlot slot) =>
        slot.Kind == OccupationSkillSlotKind.Skill ? (FixedSkillOf(slot) is null ? 1 : 0) : slot.Choose ?? 1;

    private static ResolvedOccupation ResolveCatalog(string id, OccupationSelection selection, OccupationCatalog catalog)
    {
        var occupation = catalog.Occupations.SingleOrDefault(candidate => candidate.Id == id);
        if (occupation is null)
        {
            return new ResolvedOccupation(id, false, null, null, null, null, [], []);
        }

        var skills = occupation.SkillSlots
            .SelectMany((slot, index) => SkillsOf(slot, selection.SkillChoices.ElementAtOrDefault(index) ?? []))
            .ToList();
        return new ResolvedOccupation(
            id, false, occupation.Name, occupation.CreditRatingMin, occupation.CreditRatingMax, occupation.OccupationPointFormula, occupation.SkillSlots, skills);
    }

    private static IEnumerable<SkillReference> SkillsOf(OccupationSkillSlot slot, IReadOnlyList<SkillReference> picks) =>
        FixedSkillOf(slot) is { } fixedSkill ? [fixedSkill] : picks.Take(PicksNeeded(slot));

    private static ResolvedOccupation ResolveCustom(CustomOccupation custom) =>
        new(
            null,
            true,
            custom.Name,
            custom.CreditRatingMin,
            custom.CreditRatingMax,
            OccupationPointFormulas.Find(custom.FormulaId),
            [],
            custom.Skills.OfType<SkillReference>().ToList());
}
