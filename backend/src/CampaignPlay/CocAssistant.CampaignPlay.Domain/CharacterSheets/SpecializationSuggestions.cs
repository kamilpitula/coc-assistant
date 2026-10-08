namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// Specializations offered as suggestions (docs/game-rules/project_ruleset.md section 4.2): a closed family's listed
/// specializations (section 6.2), and for an open family the specializations the Era's Occupation catalog names.
/// </summary>
public static class SpecializationSuggestions
{
    public static IReadOnlyDictionary<string, IReadOnlyList<string>> From(CreationRuleSet rules)
    {
        var named = NamedSpecializations(rules.Occupations).ToList();
        var closed = rules.Specializations.ClosedFamilies.Select(family =>
            KeyValuePair.Create(family.Key, (IReadOnlyList<string>)family.Value.Keys.ToList()));
        var open = rules.Specializations.OpenFamilies.Select(family =>
            KeyValuePair.Create(family, (IReadOnlyList<string>)named
                .Where(skill => skill.IsSkill(family))
                .Select(skill => skill.Specialization!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Order(StringComparer.Ordinal)
                .ToList()));

        return closed.Concat(open).ToDictionary(StringComparer.OrdinalIgnoreCase);
    }

    private static IEnumerable<SkillReference> NamedSpecializations(OccupationCatalog catalog) =>
        catalog.Occupations.SelectMany(occupation => occupation.SkillSlots)
            .Concat(catalog.SkillGroups.Values.SelectMany(group => group))
            .SelectMany(slot => slot.From is null ? [slot] : slot.From.Prepend(slot))
            .Where(slot => slot.Skill is not null && slot.Specialization is not null && slot.Specialization != OccupationResolution.AnySpecialization)
            .Select(slot => new SkillReference(slot.Skill!, slot.Specialization));
}
