namespace CocAssistant.CampaignPlay.Domain.RuleData;

/// <summary>The kind of a wealth table amount.</summary>
public enum MoneyRuleKind
{
    None,
    Fixed,
    PerCreditRating,
}

/// <summary>
/// How a wealth amount follows from Credit Rating: none, a fixed amount (possibly a lower bound, the published "or
/// more"), or Credit Rating times a multiplier.
/// </summary>
public sealed record MoneyRule(MoneyRuleKind Kind, decimal Value, bool OrMore)
{
    public static readonly MoneyRule None = new(MoneyRuleKind.None, 0m, false);

    public static MoneyRule FixedAmount(decimal amount, bool orMore = false) => new(MoneyRuleKind.Fixed, amount, orMore);

    public static MoneyRule PerCreditRating(decimal multiplier) => new(MoneyRuleKind.PerCreditRating, multiplier, false);
}

/// <summary>One Credit Rating band; a null minimum means the band has no lower bound.</summary>
public sealed record WealthBand(int? CreditRatingMinimum, int CreditRatingMaximum, MoneyRule Cash, MoneyRule Assets, MoneyRule SpendingLevel)
{
    public bool Contains(int creditRating) =>
        (CreditRatingMinimum is null || creditRating >= CreditRatingMinimum) && creditRating <= CreditRatingMaximum;
}

/// <summary>
/// An Era's wealth table, mirroring docs/game-rules/catalogs/wealth.&lt;era&gt;.json
/// (docs/game-rules/coc7_character_creation_and_development_rules.md section 11).
/// </summary>
public sealed record WealthTable(Era Era, string Currency, IReadOnlyList<WealthBand> Bands);
