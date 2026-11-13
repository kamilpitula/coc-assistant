namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>A group of Roll Records the Keeper may grant a re-roll for with a Change Request (specs/character-sheet/spec.md, Re-roll grant).</summary>
public enum RollGroup
{
    Characteristics,
    Luck,
    EduImprovementChecks,
}

/// <summary>The purposes Roll Records are stored under (specs/character-sheet/spec.md, Roll Records).</summary>
public static class RollPurposes
{
    public const string Luck = "Luck";
    public const string LuckSecondRoll = "Luck:SecondRoll";

    /// <summary>The Standard Rolling roll of a characteristic (section 2.1), for example "Characteristic:STR".</summary>
    public static string Characteristic(Characteristic characteristic) => $"Characteristic:{characteristic.ToCode()}";

    /// <summary>Whether the purpose is a characteristic roll, which the Creation Method lock and PUT merging keep.</summary>
    public static bool IsCharacteristicPurpose(string purpose) =>
        CharacteristicPurposes.Contains(purpose);

    private static readonly HashSet<string> CharacteristicPurposes =
        CharacteristicCodes.All.Select(characteristic => $"Characteristic:{characteristic.ToCode()}").ToHashSet(StringComparer.Ordinal);

    /// <summary>The D100 roll of the 1-based EDU improvement check.</summary>
    public static string EduImprovementCheck(int checkNumber) => $"EduImprovement[{checkNumber}].Check";

    /// <summary>The 1D10 gain of the 1-based EDU improvement check.</summary>
    public static string EduImprovementGain(int checkNumber) => $"EduImprovement[{checkNumber}].Gain";

    /// <summary>The re-roll group a purpose belongs to, or null for a purpose no grant covers.</summary>
    public static RollGroup? GroupOf(string purpose) =>
        IsCharacteristicPurpose(purpose)
            ? RollGroup.Characteristics
            : purpose is Luck or LuckSecondRoll
                ? RollGroup.Luck
                : EduImprovementCheckNumberOf(purpose) is not null
                    ? RollGroup.EduImprovementChecks
                    : null;

    /// <summary>The EDU improvement check number a purpose belongs to, or null for other purposes.</summary>
    public static int? EduImprovementCheckNumberOf(string purpose)
    {
        const string prefix = "EduImprovement[";
        if (!purpose.StartsWith(prefix, StringComparison.Ordinal))
        {
            return null;
        }

        var end = purpose.IndexOf(']', prefix.Length);
        return end > prefix.Length && int.TryParse(purpose.AsSpan(prefix.Length, end - prefix.Length), out var number)
            ? number
            : null;
    }
}
