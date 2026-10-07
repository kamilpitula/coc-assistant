namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Builds Character Sheets in domain vocabulary. Starts from a valid Point Buy sheet for a 25-year-old (no physical
/// deduction, one EDU improvement check that does not improve EDU, one Luck roll) who is a 1920s Antiquarian with every
/// skill choice made and every occupation (EDU x 4 = 200) and personal interest (INT x 2 = 120) point spent, matching
/// the valid case in specs/character-sheet/validation-fixtures.json.
/// </summary>
public sealed class CharacterSheetBuilder
{
    // Sums to the section 2.2 budget with every value inside its bounds.
    private static readonly IReadOnlyDictionary<Characteristic, int?> ValidPointBuy = new Dictionary<Characteristic, int?>
    {
        [Characteristic.Strength] = 60,
        [Characteristic.Constitution] = 60,
        [Characteristic.Dexterity] = 60,
        [Characteristic.Appearance] = 50,
        [Characteristic.Power] = 60,
        [Characteristic.Size] = 60,
        [Characteristic.Intelligence] = 60,
        [Characteristic.Education] = 50,
    };

    /// <summary>The Antiquarian's slots (section 7.2) with a pick for every open one.</summary>
    public static readonly OccupationSelection ValidAntiquarian = new(
        "antiquarian",
        null,
        [],
        [
            [],
            [new SkillReference("Art/Craft", "Painting")],
            [],
            [],
            [new SkillReference("Language (Other)", "Latin")],
            [new SkillReference("Charm")],
            [],
            [new SkillReference("Firearms", "Handgun")],
        ]);

    /// <summary>200 occupation points, with Credit Rating inside the Antiquarian's range, and 120 personal interest points.</summary>
    public static readonly IReadOnlyList<SkillAllocation> ValidAllocations =
    [
        new(SkillReference.CreditRating, 30, null),
        new(new SkillReference("Library Use"), 50, null),
        new(new SkillReference("Appraise"), 50, null),
        new(new SkillReference("History"), 50, null),
        new(new SkillReference("Spot Hidden"), 20, null),
        new(new SkillReference("Drive Auto"), null, 60),
        new(new SkillReference("Listen"), null, 60),
    ];

    private InvestigatorIdentity _identity = new("Harvey Walters", 25, null, null, null);
    private CreationMethod? _creationMethod = CreationMethod.PointBuy;
    private CharacteristicValues _assigned = CharacteristicValues.From(ValidPointBuy);
    private CharacteristicValues _deductions = CharacteristicValues.Empty;
    private IReadOnlyList<EduImprovementCheckInput> _eduChecks = [new EduImprovementCheckInput(30, null)];
    private IReadOnlyList<int?> _luckRolls = [11];
    private CharacteristicValues _characteristicRolls = CharacteristicValues.Empty;
    private OccupationSelection? _occupation = ValidAntiquarian;
    private IReadOnlyList<SkillAllocation> _skills = ValidAllocations;
    private QuickFireSkills _quickFire = QuickFireSkills.Empty;

    public CharacterSheetBuilder WithName(string? name)
    {
        _identity = _identity with { Name = name };
        return this;
    }

    public CharacterSheetBuilder WithAge(int? age)
    {
        _identity = _identity with { Age = age };
        return this;
    }

    public CharacterSheetBuilder WithCreationMethod(CreationMethod? creationMethod)
    {
        _creationMethod = creationMethod;
        return this;
    }

    public CharacterSheetBuilder WithAssigned(Characteristic characteristic, int? value)
    {
        _assigned = _assigned.With(characteristic, value);
        return this;
    }

    public CharacterSheetBuilder WithDeduction(Characteristic characteristic, int? value)
    {
        _deductions = _deductions.With(characteristic, value);
        return this;
    }

    public CharacterSheetBuilder WithEduImprovementChecks(params EduImprovementCheckInput[] checks)
    {
        _eduChecks = checks;
        return this;
    }

    public CharacterSheetBuilder WithLuckRolls(params int?[] rolls)
    {
        _luckRolls = rolls;
        return this;
    }

    /// <summary>Switches to Standard Rolling with these raw totals (section 2.1), clearing the assigned values.</summary>
    public CharacterSheetBuilder WithCharacteristicRolls(IReadOnlyDictionary<Characteristic, int?> rawTotals)
    {
        _creationMethod = CreationMethod.StandardRolling;
        _assigned = CharacteristicValues.Empty;
        _characteristicRolls = CharacteristicValues.From(rawTotals);
        return this;
    }

    /// <summary>Switches to Quick Fire with these characteristic values (section 2.3).</summary>
    public CharacterSheetBuilder WithQuickFireCharacteristics(IReadOnlyDictionary<Characteristic, int?> values)
    {
        _creationMethod = CreationMethod.QuickFire;
        _assigned = CharacteristicValues.From(values);
        return this;
    }

    public CharacterSheetBuilder WithOccupation(OccupationSelection? occupation)
    {
        _occupation = occupation;
        return this;
    }

    /// <summary>A catalog Occupation with formula choices and one list of picks per skill slot.</summary>
    public CharacterSheetBuilder WithCatalogOccupation(string id, IReadOnlyList<string?>? formulaCharacteristics = null, params SkillReference[][] skillChoices) =>
        WithOccupation(new OccupationSelection(id, null, formulaCharacteristics ?? [], skillChoices));

    public CharacterSheetBuilder WithSkills(params SkillAllocation[] skills)
    {
        _skills = skills;
        return this;
    }

    public CharacterSheetBuilder WithQuickFireSkills(QuickFireSkills quickFire)
    {
        _quickFire = quickFire;
        return this;
    }

    public CharacterSheetInputs BuildInputs() =>
        new(_identity, _creationMethod, _assigned, _deductions, _eduChecks, _luckRolls, _characteristicRolls, _occupation, _skills, _quickFire);

    public CharacterSheet Build() => BuildInputs().ToCharacterSheet(new PlayerEnteredRollSource());
}
