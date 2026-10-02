namespace CocAssistant.CampaignPlay.Domain.RuleData;

/// <summary>The kind of an occupation skill slot, as named in the Occupation catalog.</summary>
public enum OccupationSkillSlotKind
{
    Skill,
    Group,
    Any,
    Choice,
}

/// <summary>
/// One occupation skill slot. Skill slots name a skill and optional specialization; group, any, and choice
/// slots let the Player choose a number of skills from a skill group, any skill, or the listed slots.
/// </summary>
public sealed record OccupationSkillSlot(
    OccupationSkillSlotKind Kind,
    string? Skill = null,
    string? Specialization = null,
    int? Choose = null,
    string? Group = null,
    IReadOnlyList<OccupationSkillSlot>? From = null);
