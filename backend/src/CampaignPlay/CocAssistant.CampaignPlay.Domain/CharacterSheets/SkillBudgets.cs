namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// The common occupation point formulas of docs/game-rules/coc7_character_creation_and_development_rules.md section
/// 7.1, offered for custom Occupations. A formula's id is derived from its terms, for example "EDUx2+DEX|STRx2".
/// </summary>
public static class OccupationPointFormulas
{
    public static readonly IReadOnlyList<OccupationPointFormula> Common =
    [
        Formula((["EDU"], 4)),
        Formula((["EDU"], 2), (["DEX"], 2)),
        Formula((["EDU"], 2), (["STR"], 2)),
        Formula((["EDU"], 2), (["APP"], 2)),
        Formula((["EDU"], 2), (["POW"], 2)),
        Formula((["EDU"], 2), (["APP", "DEX", "STR"], 2)),
    ];

    public static string IdOf(OccupationPointFormula formula) =>
        string.Join("+", formula.Terms.Select(term => $"{string.Join("|", term.Characteristics)}x{term.Multiplier}"));

    public static OccupationPointFormula? Find(string? id) => Common.SingleOrDefault(formula => IdOf(formula) == id);

    private static OccupationPointFormula Formula(params (string[] Characteristics, int Multiplier)[] terms) =>
        new(terms.Select(term => new OccupationPointTerm(term.Characteristics, term.Multiplier)).ToList());
}

/// <summary>Occupation skill points: section 7.1.</summary>
public static class OccupationPoints
{
    /// <summary>
    /// The budget from the formula and the final characteristics (section 3.3: after age effects). A term that offers
    /// several characteristics uses the Player's pick for it. Null until every needed value and pick is known.
    /// </summary>
    public static int? Budget(OccupationPointFormula formula, IReadOnlyList<string?> chosenCharacteristics, CharacteristicValues final)
    {
        var termValues = formula.Terms
            .Select((term, index) => TermValue(term, chosenCharacteristics.ElementAtOrDefault(index), final))
            .ToList();
        return termValues.Any(value => value is null) ? null : termValues.Sum();
    }

    /// <summary>The characteristic a term uses: its only one, or the Player's pick when it offers several.</summary>
    public static string? CharacteristicFor(OccupationPointTerm term, string? chosen) =>
        term.Characteristics.Count == 1 ? term.Characteristics[0]
        : term.Characteristics.Contains(chosen) ? chosen
        : null;

    private static int? TermValue(OccupationPointTerm term, string? chosen, CharacteristicValues final) =>
        CharacteristicCodes.TryParse(CharacteristicFor(term, chosen), out var characteristic) && final[characteristic] is { } value
            ? value * term.Multiplier
            : null;
}

/// <summary>Personal interest points: section 8.</summary>
public static class PersonalInterestPoints
{
    private const int IntelligenceMultiplier = 2;

    public static int? Budget(CharacteristicValues final) => final[Characteristic.Intelligence] * IntelligenceMultiplier;
}

/// <summary>The Credit Rating a Quick Fire Investigator takes, and the pool value it frees when it takes none.</summary>
public sealed record QuickFireCreditRating(int Value, int? FreedValue);

/// <summary>
/// Quick Fire: the characteristic pool of section 2.3 and the skill values and personal interests of section 18,
/// including the project assumptions recorded there for Credit Rating and the freed value.
/// </summary>
public static class QuickFireRules
{
    public static readonly IReadOnlyList<int> CharacteristicValues = [40, 50, 50, 50, 60, 60, 70, 80];
    public static readonly IReadOnlyList<int> SkillValues = [70, 60, 60, 50, 50, 50, 40, 40, 40];
    public const int PersonalInterestBonus = 20;
    public const int PersonalInterestCount = 4;

    private static readonly IReadOnlyList<int> CreditRatingValues = [40, 50, 60, 70];

    /// <summary>Section 18 assumption: the closest pool value at least the minimum, else the minimum itself.</summary>
    public static QuickFireCreditRating CreditRatingFor(int creditRatingMinimum)
    {
        if (creditRatingMinimum < CreditRatingValues[0])
        {
            return new QuickFireCreditRating(creditRatingMinimum, CreditRatingValues[0]);
        }

        var closest = CreditRatingValues.Where(value => value >= creditRatingMinimum).Select(value => (int?)value).FirstOrDefault();
        return closest is { } value
            ? new QuickFireCreditRating(value, null)
            : new QuickFireCreditRating(creditRatingMinimum, CreditRatingValues[^1]);
    }

    /// <summary>The values the occupation skills (and an extra skill for a freed value) take, besides Credit Rating.</summary>
    public static IReadOnlyList<int> OccupationSkillValues(QuickFireCreditRating creditRating)
    {
        var values = SkillValues.ToList();
        values.Remove(creditRating.FreedValue ?? creditRating.Value);
        return values;
    }
}

/// <summary>An amount of money; <c>OrMore</c> marks a lower bound such as the published "$5M+".</summary>
public sealed record MoneyAmount(decimal Amount, bool OrMore);

/// <summary>Spending level, cash, and assets (section 11); assets are null when the band has none.</summary>
public sealed record WealthValues(string Currency, MoneyAmount SpendingLevel, MoneyAmount Cash, MoneyAmount? Assets);

/// <summary>Wealth from Credit Rating with the Era's table: section 11.</summary>
public static class Wealth
{
    public static WealthValues? For(int creditRating, WealthTable table)
    {
        var band = table.Bands.FirstOrDefault(candidate => candidate.Contains(creditRating));
        return band is null
            ? null
            : new WealthValues(table.Currency, Amount(band.SpendingLevel, creditRating)!, Amount(band.Cash, creditRating)!, Amount(band.Assets, creditRating));
    }

    private static MoneyAmount? Amount(MoneyRule rule, int creditRating) =>
        rule.Kind switch
        {
            MoneyRuleKind.Fixed => new MoneyAmount(rule.Value, rule.OrMore),
            MoneyRuleKind.PerCreditRating => new MoneyAmount(rule.Value * creditRating, false),
            _ => null,
        };
}
