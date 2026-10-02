namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>
/// The Player's Character Sheet inputs (PUT .../investigators/mine/character-sheet). Derived values are never accepted.
/// Dice results are raw totals. Shape: specs/character-sheet/spec.md, API Contracts.
/// </summary>
public record CharacterSheetRequest(
    [Required] IdentityRequest Identity,
    [SupportedCreationMethodName] string? CreationMethod,
    [CharacteristicCodes] Dictionary<string, int?>? Characteristics,
    AgeEffectsRequest? AgeEffects,
    [MaxLength(2)] int?[]? LuckRolls);

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

/// <summary>A Keeper's Change Request: a required comment of at most 2000 characters.</summary>
public record RequestChangesRequest([Required, MaxLength(Investigator.ChangeRequestCommentMaxLength)] string Comment);

/// <summary>Accepts null or the name of a Creation Method this version supports (PBI-CP-003: "PointBuy").</summary>
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
