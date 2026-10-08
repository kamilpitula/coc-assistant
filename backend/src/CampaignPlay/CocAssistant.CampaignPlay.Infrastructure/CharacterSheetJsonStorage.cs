namespace CocAssistant.CampaignPlay.Infrastructure;

/// <summary>
/// Stored JSON form of the Character Sheet with an explicit schema version (ADR 0005, ADR 0007). Only the Player's
/// inputs are stored; a future schema version adds an upgrade step in <see cref="FromStorage"/>. Version 2 adds the
/// Occupation, the skill allocations, and the Quick Fire skills; version 3 the Quick Fire extra skill. Earlier
/// documents are upgraded on read with the missing fields empty.
/// </summary>
public static class CharacterSheetJsonStorage
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(allowIntegerValues: false) },
    };

    public static string ToStorage(CharacterSheet sheet) =>
        JsonSerializer.Serialize(CharacterSheetDocument.From(sheet), SerializerOptions);

    private const int FirstSchemaVersion = 1;

    public static CharacterSheet FromStorage(string stored)
    {
        var document = JsonSerializer.Deserialize<CharacterSheetDocument>(stored, SerializerOptions)
            ?? throw new InvalidOperationException("The stored Character Sheet is empty.");

        if (document.SchemaVersion is < FirstSchemaVersion or > CharacterSheet.CurrentSchemaVersion)
        {
            throw new InvalidOperationException(
                $"Unsupported Character Sheet schema version {document.SchemaVersion}; expected {CharacterSheet.CurrentSchemaVersion}.");
        }

        // Upgrades: version 1 lacks the version 2 fields and version 2 the Quick Fire extra skill; absent fields read as empty.
        return document.ToCharacterSheet();
    }

    private sealed record CharacterSheetDocument(
        int SchemaVersion,
        IdentityDocument Identity,
        CreationMethod? CreationMethod,
        Dictionary<string, int> AssignedCharacteristics,
        Dictionary<string, int>? AgeDeductions,
        IReadOnlyList<RollRecordDocument>? RollRecords,
        OccupationDocument? Occupation,
        IReadOnlyList<SkillAllocationDocument>? SkillAllocations,
        QuickFireDocument? QuickFire)
    {
        public static CharacterSheetDocument From(CharacterSheet sheet) =>
            new(
                CharacterSheet.CurrentSchemaVersion,
                IdentityDocument.From(sheet.Identity),
                sheet.CreationMethod,
                ToCodes(sheet.AssignedCharacteristics),
                ToCodes(sheet.AgeDeductions),
                sheet.RollRecords.Select(RollRecordDocument.From).ToList(),
                sheet.Occupation is null ? null : OccupationDocument.From(sheet.Occupation),
                sheet.SkillAllocations.Select(SkillAllocationDocument.From).ToList(),
                QuickFireDocument.From(sheet.QuickFire));

        public CharacterSheet ToCharacterSheet() =>
            new(
                Identity.ToIdentity(),
                CreationMethod,
                FromCodes(AssignedCharacteristics),
                FromCodes(AgeDeductions),
                (RollRecords ?? []).Select(record => record.ToRollRecord()).ToList(),
                Occupation?.ToSelection(),
                (SkillAllocations ?? []).Select(allocation => allocation.ToAllocation()).ToList(),
                QuickFire?.ToQuickFire() ?? QuickFireSkills.Empty);
    }

    private sealed record RollRecordDocument(string Purpose, string Dice, int Result, RollSource Source)
    {
        public static RollRecordDocument From(RollRecord record) => new(record.Purpose, record.Dice, record.Result, record.Source);

        public RollRecord ToRollRecord() => new(Purpose, Dice, Result, Source);
    }

    private sealed record SkillDocument(string Skill, string? Specialization)
    {
        public static SkillDocument From(SkillReference skill) => new(skill.Skill, skill.Specialization);

        public SkillReference ToReference() => new(Skill, Specialization);
    }

    private sealed record OccupationDocument(
        string? CatalogId,
        CustomOccupationDocument? Custom,
        IReadOnlyList<string?>? FormulaCharacteristics,
        IReadOnlyList<IReadOnlyList<SkillDocument>>? SkillChoices)
    {
        public static OccupationDocument From(OccupationSelection occupation) =>
            new(
                occupation.CatalogId,
                occupation.Custom is null ? null : CustomOccupationDocument.From(occupation.Custom),
                occupation.FormulaCharacteristics,
                occupation.SkillChoices.Select(picks => (IReadOnlyList<SkillDocument>)picks.Select(SkillDocument.From).ToList()).ToList());

        public OccupationSelection ToSelection() =>
            new(
                CatalogId,
                Custom?.ToCustom(),
                FormulaCharacteristics ?? [],
                (SkillChoices ?? []).Select(picks => (IReadOnlyList<SkillReference>)picks.Select(pick => pick.ToReference()).ToList()).ToList());
    }

    private sealed record CustomOccupationDocument(
        string? Name,
        string? FormulaId,
        IReadOnlyList<SkillDocument?>? Skills,
        int? CreditRatingMin,
        int? CreditRatingMax)
    {
        public static CustomOccupationDocument From(CustomOccupation custom) =>
            new(
                custom.Name,
                custom.FormulaId,
                custom.Skills.Select(skill => skill is null ? null : SkillDocument.From(skill)).ToList(),
                custom.CreditRatingMin,
                custom.CreditRatingMax);

        public CustomOccupation ToCustom() =>
            new(Name, FormulaId, (Skills ?? []).Select(skill => skill?.ToReference()).ToList(), CreditRatingMin, CreditRatingMax);
    }

    private sealed record SkillAllocationDocument(string Skill, string? Specialization, int? OccupationPoints, int? PersonalInterestPoints)
    {
        public static SkillAllocationDocument From(SkillAllocation allocation) =>
            new(allocation.Skill.Skill, allocation.Skill.Specialization, allocation.OccupationPoints, allocation.PersonalInterestPoints);

        public SkillAllocation ToAllocation() => new(new SkillReference(Skill, Specialization), OccupationPoints, PersonalInterestPoints);
    }

    private sealed record QuickFireValueDocument(string Skill, string? Specialization, int? Value);

    private sealed record QuickFireDocument(
        IReadOnlyList<QuickFireValueDocument>? Values,
        IReadOnlyList<SkillDocument>? PersonalInterests,
        SkillDocument? ExtraSkill)
    {
        public static QuickFireDocument From(QuickFireSkills quickFire) =>
            new(
                quickFire.Values.Select(value => new QuickFireValueDocument(value.Skill.Skill, value.Skill.Specialization, value.Value)).ToList(),
                quickFire.PersonalInterests.Select(SkillDocument.From).ToList(),
                quickFire.ExtraSkill is null ? null : SkillDocument.From(quickFire.ExtraSkill));

        public QuickFireSkills ToQuickFire() =>
            new(
                (Values ?? []).Select(value => new QuickFireSkillValue(new SkillReference(value.Skill, value.Specialization), value.Value)).ToList(),
                (PersonalInterests ?? []).Select(skill => skill.ToReference()).ToList(),
                ExtraSkill?.ToReference());
    }

    private sealed record IdentityDocument(string? Name, int? Age, string? Gender, string? Residence, string? Birthplace)
    {
        public static IdentityDocument From(InvestigatorIdentity identity) =>
            new(identity.Name, identity.Age, identity.Gender, identity.Residence, identity.Birthplace);

        public InvestigatorIdentity ToIdentity() => new(Name, Age, Gender, Residence, Birthplace);
    }

    private static Dictionary<string, int> ToCodes(CharacteristicValues values) =>
        values.Present.ToDictionary(characteristic => characteristic.ToCode(), characteristic => values[characteristic]!.Value);

    private static CharacteristicValues FromCodes(Dictionary<string, int>? values) =>
        CharacteristicValues.From((values ?? []).Select(entry =>
            CharacteristicCodes.TryParse(entry.Key, out var characteristic)
                ? KeyValuePair.Create(characteristic, (int?)entry.Value)
                : throw new InvalidOperationException($"Unknown stored characteristic '{entry.Key}'.")));
}
