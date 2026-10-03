namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Builds Character Sheets in domain vocabulary. Starts from a valid Point Buy sheet for a 25-year-old (no physical
/// deduction, one EDU improvement check that does not improve EDU, one Luck roll), matching the valid case in
/// specs/character-sheet/validation-fixtures.json.
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

    private InvestigatorIdentity _identity = new("Harvey Walters", 25, null, null, null);
    private CreationMethod? _creationMethod = CreationMethod.PointBuy;
    private CharacteristicValues _assigned = CharacteristicValues.From(ValidPointBuy);
    private CharacteristicValues _deductions = CharacteristicValues.Empty;
    private IReadOnlyList<EduImprovementCheckInput> _eduChecks = [new EduImprovementCheckInput(30, null)];
    private IReadOnlyList<int?> _luckRolls = [11];

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

    public CharacterSheetInputs BuildInputs() =>
        new(_identity, _creationMethod, _assigned, _deductions, _eduChecks, _luckRolls);

    public CharacterSheet Build() => BuildInputs().ToCharacterSheet(new PlayerEnteredRollSource());
}
