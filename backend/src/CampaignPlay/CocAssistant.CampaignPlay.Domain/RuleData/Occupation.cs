namespace CocAssistant.CampaignPlay.Domain.RuleData;

/// <summary>A catalog Occupation: its Credit Rating range, skill point formula, and occupation skill slots.</summary>
public sealed record Occupation(
    string Id,
    string Name,
    int CreditRatingMin,
    int CreditRatingMax,
    OccupationPointFormula OccupationPointFormula,
    IReadOnlyList<OccupationSkillSlot> SkillSlots);
