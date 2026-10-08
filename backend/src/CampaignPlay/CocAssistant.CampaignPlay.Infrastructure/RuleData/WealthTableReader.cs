namespace CocAssistant.CampaignPlay.Infrastructure.RuleData;

/// <summary>
/// Reads an Era's wealth table (section 11 data) with the section 20 provenance envelope
/// (docs/game-rules/coc7_character_creation_and_development_rules.md section 20).
/// </summary>
public static class WealthTableReader
{
    private const string CatalogName = "WealthTable";
    private const int SupportedSchemaVersion = 1;

    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    public static WealthTable Read(Stream stream, Era expectedEra)
    {
        var file = JsonSerializer.Deserialize<WealthTableFile>(stream, SerializerOptions)
            ?? throw new InvalidOperationException("The wealth table is empty.");

        if (file.Catalog != CatalogName || file.SchemaVersion != SupportedSchemaVersion || file.Era != expectedEra.Code)
        {
            throw new InvalidOperationException(
                $"Expected a {CatalogName} v{SupportedSchemaVersion} for the {expectedEra} Era, "
                + $"found {file.Catalog} v{file.SchemaVersion} for '{file.Era}'.");
        }

        return new WealthTable(expectedEra, file.Currency, file.Entries.Select(entry => ToBand(entry.Id, entry.Data)).ToList());
    }

    private static WealthBand ToBand(string id, WealthBandData data) =>
        new(
            data.CreditRatingMinimum,
            data.CreditRatingMaximum,
            ToRule(id, data.Cash),
            ToRule(id, data.Assets),
            ToRule(id, data.SpendingLevel));

    private static MoneyRule ToRule(string id, MoneyData data) =>
        data.Kind switch
        {
            "none" => MoneyRule.None,
            "fixed" => MoneyRule.FixedAmount(data.Amount ?? throw Missing(id, "amount"), data.OrMore),
            "perCreditRating" => MoneyRule.PerCreditRating(data.Multiplier ?? throw Missing(id, "multiplier")),
            _ => throw new InvalidOperationException($"The wealth band '{id}' has an unknown amount kind '{data.Kind}'."),
        };

    private static InvalidOperationException Missing(string id, string field) => new($"The wealth band '{id}' has no {field}.");

    private sealed record WealthTableFile(string Catalog, string Era, int SchemaVersion, string Currency, IReadOnlyList<WealthEntry> Entries);

    private sealed record WealthEntry(string Id, WealthBandData Data);

    private sealed record WealthBandData(int? CreditRatingMinimum, int CreditRatingMaximum, MoneyData Cash, MoneyData Assets, MoneyData SpendingLevel);

    private sealed record MoneyData(string Kind, decimal? Amount, decimal? Multiplier, bool OrMore);
}
