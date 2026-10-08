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
    IReadOnlyDictionary<string, int?> CharacteristicRolls,
    AgeEffectsResponse AgeEffects,
    IReadOnlyList<int?> LuckRolls,
    OccupationViewResponse? Occupation,
    IReadOnlyList<SkillRowResponse> Skills,
    QuickFireResponse QuickFire,
    DerivedResponse Derived,
    IReadOnlyList<RollRecordResponse> RollRecords);

public record SkillReferenceResponse(string Skill, string? Specialization);

public record CustomOccupationResponse(
    string? Name,
    string? FormulaId,
    IReadOnlyList<SkillReferenceResponse?> Skills,
    int? CreditRatingMin,
    int? CreditRatingMax);

/// <summary>The Occupation inputs plus what they resolve to; resolved values are null while unknown.</summary>
public record OccupationViewResponse(
    string? CatalogId,
    CustomOccupationResponse? Custom,
    IReadOnlyList<string?> FormulaCharacteristics,
    IReadOnlyList<IReadOnlyList<SkillReferenceResponse>> SkillChoices,
    string? Name,
    int? CreditRatingMin,
    int? CreditRatingMax,
    bool IsCustom,
    string? FormulaId,
    QuickFireCreditRatingResponse? QuickFireCreditRating);

/** The Credit Rating a Quick Fire Investigator takes for this occupation and the value it frees (section 18 assumption). */
public record QuickFireCreditRatingResponse(int Value, int? FreedValue);

/// <summary>One skill on the sheet (section 9).</summary>
public record SkillRowResponse(
    string Skill,
    string? Specialization,
    int? Base,
    int? OccupationPoints,
    int? PersonalInterestPoints,
    int? Value,
    int? Hard,
    int? Extreme,
    bool IsOccupationSkill);

public record QuickFireValueResponse(string Skill, string? Specialization, int? Value);

public record QuickFireResponse(
    IReadOnlyList<QuickFireValueResponse> Values,
    IReadOnlyList<SkillReferenceResponse> PersonalInterests,
    SkillReferenceResponse? ExtraSkill);

public record PointBudgetResponse(int Budget, int Spent, int Left);

public record MoneyResponse(decimal Amount, bool OrMore);

public record WealthResponse(string Currency, MoneyResponse SpendingLevel, MoneyResponse Cash, MoneyResponse? Assets);

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
    int? Build,
    PointBudgetResponse? OccupationPoints,
    PointBudgetResponse? PersonalInterestPoints,
    int? CreditRating,
    WealthResponse? Wealth);

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
    string EduImprovementGainDice,
    int EduMaximum,
    int LuckMultiplier,
    IReadOnlyDictionary<string, CharacteristicRollFormulaResponse> StandardRolling,
    IReadOnlyList<int> QuickFireCharacteristicValues,
    IReadOnlyList<int> QuickFireSkillValues,
    int QuickFirePersonalInterestBonus,
    int QuickFirePersonalInterestCount,
    IReadOnlyList<OccupationPointFormulaOptionResponse> OccupationPointFormulas,
    int CustomOccupationSkillCount,
    int CreditRatingMinimum,
    int CreditRatingMaximum,
    int SkillValueWarningThreshold,
    string CreditRatingSkill,
    string CthulhuMythosSkill);

public record CharacteristicRollFormulaResponse(string Dice, int Bonus, int Multiplier);

/// <summary>A section 7.1 formula a custom Occupation can use, with its id.</summary>
public record OccupationPointFormulaOptionResponse(string Id, IReadOnlyList<OccupationPointTermResponse> Terms);

public record ValidationErrorResponse(string Code, string Field, string Message, string? Expected, string? Actual, string Severity);
