namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>
/// The Player's Character Sheet inputs (PUT .../investigators/mine/character-sheet). Derived values are never accepted.
/// Dice results are raw totals. Inputs that belong to another Creation Method are a malformed body. Shape:
/// specs/character-sheet/spec.md, API Contracts.
/// </summary>
public record CharacterSheetRequest(
    [Required] IdentityRequest Identity,
    [SupportedCreationMethodName] string? CreationMethod,
    [CharacteristicCodes] Dictionary<string, int?>? Characteristics,
    AgeEffectsRequest? AgeEffects,
    [MaxLength(2)] int?[]? LuckRolls,
    [CharacteristicCodes] Dictionary<string, int?>? CharacteristicRolls = null,
    OccupationRequest? Occupation = null,
    [MaxLength(200)] SkillAllocationRequest[]? Skills = null,
    QuickFireRequest? QuickFire = null,
    [BackstoryTexts] Dictionary<string, string?>? Backstory = null,
    [MaxLength(30)] string? KeyConnection = null,
    [MaxLength(BackstoryWireFormat.WeaponCountMax)] CustomWeaponRequest[]? Weapons = null,
    [MaxLength(BackstoryWireFormat.TextLengthMax)] string? Gear = null) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext) =>
        CharacterSheetRequestRules.Problems(this).Select(message => new ValidationResult(message));
}

public record IdentityRequest(
    [MaxLength(200)] string? Name,
    int? Age,
    [MaxLength(200)] string? Gender,
    [MaxLength(200)] string? Residence,
    [MaxLength(200)] string? Birthplace);

public record AgeEffectsRequest(
    [CharacteristicCodes] Dictionary<string, int?>? Deductions,
    [MaxLength(10)] EduImprovementCheckRequest[]? EduImprovementChecks);

public record EduImprovementCheckRequest(int? Check, int? Gain);

/// <summary>A skill, optionally with its specialization.</summary>
public record SkillReferenceRequest([Required, MaxLength(100)] string Skill, [MaxLength(100)] string? Specialization);

/// <summary>A catalog Occupation (by id) or a custom one, the formula picks, and the picks for each skill slot.</summary>
public record OccupationRequest(
    [MaxLength(100)] string? CatalogId,
    CustomOccupationRequest? Custom,
    [MaxLength(5)] string?[]? FormulaCharacteristics,
    [MaxLength(20)] SkillReferenceRequest[][]? SkillChoices);

public record CustomOccupationRequest(
    [MaxLength(200)] string? Name,
    [MaxLength(100)] string? FormulaId,
    [MaxLength(CustomOccupationRules.SkillCount)] SkillReferenceRequest?[]? Skills,
    int? CreditRatingMin,
    int? CreditRatingMax);

public record SkillAllocationRequest(
    [Required, MaxLength(100)] string Skill,
    [MaxLength(100)] string? Specialization,
    int? OccupationPoints,
    int? PersonalInterestPoints);

public record QuickFireRequest(
    [MaxLength(20)] QuickFireValueRequest[]? Values,
    [MaxLength(20)] SkillReferenceRequest[]? PersonalInterests,
    SkillReferenceRequest? ExtraSkill = null);

public record QuickFireValueRequest([Required, MaxLength(100)] string Skill, [MaxLength(100)] string? Specialization, int? Value);

/// <summary>A Custom Weapon's free-text details (docs/game-rules/project_ruleset.md section 4.2).</summary>
public record CustomWeaponRequest(
    [MaxLength(BackstoryWireFormat.WeaponTextLengthMax)] string? Name,
    [MaxLength(BackstoryWireFormat.WeaponTextLengthMax)] string? Skill,
    [MaxLength(BackstoryWireFormat.WeaponTextLengthMax)] string? Damage,
    [MaxLength(BackstoryWireFormat.WeaponTextLengthMax)] string? Attacks,
    [MaxLength(BackstoryWireFormat.WeaponTextLengthMax)] string? Range,
    [MaxLength(BackstoryWireFormat.WeaponTextLengthMax)] string? Ammo,
    [MaxLength(BackstoryWireFormat.WeaponTextLengthMax)] string? Malfunction);

/// <summary>Accepts only Backstory keys (My Story and the section 12 Background entries) with texts within the limit.</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class BackstoryTextsAttribute : ValidationAttribute
{
    public BackstoryTextsAttribute()
        : base("Every backstory key must be myStory or a Background entry, with at most 2000 characters.")
    {
    }

    public override bool IsValid(object? value) =>
        value is not IDictionary<string, string?> texts
        || texts.All(text => BackstoryWireFormat.IsKey(text.Key) && (text.Value?.Length ?? 0) <= BackstoryWireFormat.TextLengthMax);
}

/// <summary>A Keeper's Change Request: a required comment of at most 2000 characters.</summary>
public record RequestChangesRequest([Required, MaxLength(Investigator.ChangeRequestCommentMaxLength)] string Comment);

/// <summary>Accepts null or the name of a Creation Method this version supports.</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class SupportedCreationMethodNameAttribute : ValidationAttribute
{
    public SupportedCreationMethodNameAttribute()
        : base("The creation method is not supported.")
    {
    }

    public override bool IsValid(object? value) =>
        value is null
        || (value is string name
            && RulesOptionsWireFormat.IsCreationMethodName(name)
            && SupportedCreationMethods.All.Contains(Enum.Parse<CreationMethod>(name)));
}

/// <summary>Accepts only characteristic codes (STR, CON, DEX, APP, POW, SIZ, INT, EDU) as keys.</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class CharacteristicCodesAttribute : ValidationAttribute
{
    public CharacteristicCodesAttribute()
        : base("Every key must be a characteristic code.")
    {
    }

    public override bool IsValid(object? value) =>
        value is not IDictionary<string, int?> values || values.Keys.All(code => CharacteristicCodes.TryParse(code, out _));
}

/// <summary>
/// The shape rules a Character Sheet body must meet beyond its attributes: each Creation Method's inputs only
/// (section 2.3: Quick Fire's skill assignment is never mixed with occupation points), one Occupation, and each skill
/// listed once.
/// </summary>
public static class CharacterSheetRequestRules
{
    public static IEnumerable<string> Problems(CharacterSheetRequest request)
    {
        var method = request.CreationMethod is { } name && RulesOptionsWireFormat.IsCreationMethodName(name) ? Enum.Parse<CreationMethod>(name) : (CreationMethod?)null;
        var problems = new List<string>();
        AddIf(problems, method == CreationMethod.StandardRolling && HasValues(request.Characteristics), "Standard rolling takes characteristicRolls, not characteristics.");
        AddIf(problems, method != CreationMethod.StandardRolling && HasValues(request.CharacteristicRolls), "Only Standard rolling takes characteristicRolls.");
        AddIf(problems, method == CreationMethod.QuickFire && request.Skills is { Length: > 0 }, "Quick fire takes quickFire, not skills.");
        AddIf(problems, method != CreationMethod.QuickFire && HasQuickFireInputs(request.QuickFire), "Only Quick fire takes quickFire.");
        AddIf(problems, request.Occupation is { CatalogId: not null, Custom: not null }, "Choose a catalog occupation or a custom one, not both.");
        AddIf(problems, HasDuplicates((request.Skills ?? []).Select(skill => Key(skill.Skill, skill.Specialization))), "Each skill may be listed once in skills.");
        AddIf(problems, HasDuplicates((request.QuickFire?.Values ?? []).Select(value => Key(value.Skill, value.Specialization))), "Each skill may take one Quick fire value.");
        AddIf(problems, !BackstoryWireFormat.HasValidKeyConnection(request), "The Key Connection must be a filled-in Background entry.");
        return problems;
    }

    private static void AddIf(List<string> problems, bool condition, string message)
    {
        if (condition)
        {
            problems.Add(message);
        }
    }

    private static bool HasValues(Dictionary<string, int?>? values) => values?.Values.Any(value => value is not null) == true;

    private static bool HasQuickFireInputs(QuickFireRequest? quickFire) =>
        quickFire is not null && ((quickFire.Values?.Length ?? 0) > 0 || (quickFire.PersonalInterests?.Length ?? 0) > 0 || quickFire.ExtraSkill is not null);

    private static bool HasDuplicates(IEnumerable<string> keys)
    {
        var all = keys.ToList();
        return all.Distinct().Count() != all.Count;
    }

    private static string Key(string skill, string? specialization) =>
        CharacterSheetWireFormat.ToSkill(skill, specialization).DisplayName.ToUpperInvariant();
}
