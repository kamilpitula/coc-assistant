namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// The ValidationError catalog of specs/character-sheet/spec.md (Validation): one factory per code, so codes, fields,
/// and message text are defined once. The frontend mirrors these; specs/character-sheet/validation-fixtures.json keeps
/// them in parity.
/// </summary>
public static class ValidationErrors
{
    public static ValidationError InvestigatorNameRequired() =>
        Error("InvestigatorNameRequired", "identity.name", "Enter your Investigator's name.");

    public static ValidationError AgeRequired() =>
        Error("AgeRequired", "identity.age", "Enter your Investigator's age.");

    public static ValidationError AgeOutOfRange(int age) =>
        Error(
            "AgeOutOfRange",
            "identity.age",
            $"Age must be between {InvestigatorAgeRange.Minimum} and {InvestigatorAgeRange.Maximum}.",
            $"{InvestigatorAgeRange.Minimum}-{InvestigatorAgeRange.Maximum}",
            Text(age));

    public static ValidationError CreationMethodRequired() =>
        Error("CreationMethodRequired", "creationMethod", "Choose a creation method.");

    public static ValidationError CreationMethodNotAllowed(CreationMethod method, AllowedCreationMethods allowed) =>
        Error(
            "CreationMethodNotAllowed",
            "creationMethod",
            "This Campaign no longer allows this creation method. Ask your Keeper.",
            string.Join(", ", allowed.Methods),
            method.ToString());

    public static ValidationError CharacteristicRequired(Characteristic characteristic) =>
        Error("CharacteristicRequired", CharacteristicField(characteristic), $"Enter a value for {characteristic.ToCode()}.");

    public static ValidationError PointBuyValueOutOfRange(Characteristic characteristic, int value) =>
        Error(
            "PointBuyValueOutOfRange",
            CharacteristicField(characteristic),
            $"{characteristic.ToCode()} must be between {PointBuyRules.Minimum} and {PointBuyRules.Maximum}.",
            $"{PointBuyRules.Minimum}-{PointBuyRules.Maximum}",
            Text(value));

    public static ValidationError PointBuyTotalMismatch(int total) =>
        Error(
            "PointBuyTotalMismatch",
            "characteristics",
            $"Your characteristics must add up to {PointBuyRules.Budget}. They add up to {total}.",
            Text(PointBuyRules.Budget),
            Text(total));

    public static ValidationError PointBuyBelowRecommendation(Characteristic characteristic, int value) =>
        new(
            "PointBuyBelowRecommendation",
            CharacteristicField(characteristic),
            $"{characteristic.ToCode()} is below the recommended {PointBuyRules.RecommendedMinimum}. Check with your Keeper.",
            Text(PointBuyRules.RecommendedMinimum),
            Text(value),
            ValidationSeverity.Warning);

    public static string CharacteristicField(Characteristic characteristic) => $"characteristics.{characteristic.ToCode()}";

    private static ValidationError Error(string code, string field, string message, string? expected = null, string? actual = null) =>
        new(code, field, message, expected, actual, ValidationSeverity.Error);

    private static string Text(int value) => value.ToString(System.Globalization.CultureInfo.InvariantCulture);
}
