namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>Investigator summary (specs/campaign-play/spec.md, Investigator API shapes).</summary>
public record InvestigatorSummaryResponse(Guid Id, string Status, string? Name, string? ChangeRequestComment, DateTimeOffset UpdatedAt);

/// <summary>A row of the Keeper's list; a Draft hides its id and name.</summary>
public record InvestigatorListItemResponse(
    Guid PlayerAccountId,
    string? PlayerName,
    string Status,
    Guid? InvestigatorId,
    string? InvestigatorName,
    DateTimeOffset UpdatedAt);

/// <summary>The Keeper's review read of a non-Draft Investigator.</summary>
public record KeeperInvestigatorResponse(
    Guid Id,
    string Status,
    string? PlayerName,
    string? ChangeRequestComment,
    DateTimeOffset UpdatedAt,
    CharacterSheetViewResponse CharacterSheet,
    IReadOnlyList<ValidationErrorResponse> Warnings);

/// <summary>The owning Player's Character Sheet read (specs/character-sheet/spec.md, API Contracts).</summary>
public record CharacterSheetResponse(
    Guid InvestigatorId,
    string Status,
    string? PlayerName,
    string? ChangeRequestComment,
    CharacterSheetViewResponse CharacterSheet,
    RulesResponse Rules,
    IReadOnlyList<ValidationErrorResponse> ValidationErrors);

public record CharacterSheetViewResponse(
    int SchemaVersion,
    IdentityResponse Identity,
    string? CreationMethod,
    IReadOnlyDictionary<string, CharacteristicResponse> Characteristics,
    AgeEffectsResponse AgeEffects,
    IReadOnlyList<int?> LuckRolls,
    DerivedResponse Derived,
    IReadOnlyList<RollRecordResponse> RollRecords);

public record IdentityResponse(string? Name, int? Age, string? Gender, string? Residence, string? Birthplace);

public record CharacteristicResponse(int? Assigned, int? Value, int? Hard, int? Extreme);

public record AgeEffectsResponse(
    AgeBracketResponse? Bracket,
    IReadOnlyDictionary<string, int?> Deductions,
    IReadOnlyList<EduImprovementCheckResponse> EduImprovementChecks);

public record AgeBracketResponse(
    int MinimumAge,
    int MaximumAge,
    int PhysicalDeductionTotal,
    IReadOnlyList<string> PhysicalDeductionCharacteristics,
    int AppearanceModifier,
    int EduImprovementChecks,
    int LuckRolls);

public record EduImprovementCheckResponse(int? Check, int? Gain, int? EduBefore, int? EduAfter);

public record DerivedResponse(
    int? Luck,
    int? HitPoints,
    int? MagicPoints,
    SanityResponse Sanity,
    int? Dodge,
    int? MovementRate,
    string? DamageBonus,
    int? Build);

public record SanityResponse(int? Current, int? Maximum);

public record RollRecordResponse(string Purpose, string Dice, int Result, string Source);

/// <summary>Rule parameters the frontend needs, so it never hard-codes a rule value.</summary>
public record RulesResponse(
    int PointBuyBudget,
    int PointBuyMinimum,
    int PointBuyMaximum,
    int PointBuyRecommendedMinimum,
    int MinimumAge,
    int MaximumAge,
    int CharacteristicFloor,
    string LuckDice,
    string EduImprovementCheckDice,
    string EduImprovementGainDice);

public record ValidationErrorResponse(string Code, string Field, string Message, string? Expected, string? Actual, string Severity);
