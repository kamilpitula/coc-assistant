namespace CocAssistant.CampaignPlay.Infrastructure;

/// <summary>Storage format for a Campaign's rules options: the Era code and comma-separated Creation Method names.</summary>
public static class CampaignRulesOptionsStorage
{
    public const int EraMaxLength = 20;
    public const int AllowedCreationMethodsMaxLength = 100;

    private const char Separator = ',';

    public static string ToStorage(Era era) => era.Code;

    public static Era ToEra(string code) =>
        Era.TryParse(code, out var era) ? era : throw new InvalidOperationException($"Unsupported stored Era '{code}'.");

    public static string ToStorage(AllowedCreationMethods methods) => string.Join(Separator, methods.Methods);

    public static AllowedCreationMethods ToAllowedCreationMethods(string stored) =>
        AllowedCreationMethods.Create(stored.Split(Separator).Select(Enum.Parse<CreationMethod>));
}
