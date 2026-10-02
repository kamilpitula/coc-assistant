namespace CocAssistant.CampaignPlay.Domain.RuleData;

/// <summary>Occupation skill points as a sum of terms (section 7.1 of the character rules).</summary>
public sealed record OccupationPointFormula(IReadOnlyList<OccupationPointTerm> Terms);

/// <summary>One term of the formula; several characteristics mean the Player picks one of them.</summary>
public sealed record OccupationPointTerm(IReadOnlyList<string> Characteristics, int Multiplier);
