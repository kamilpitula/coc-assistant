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

    public static ValidationError LuckRollRequired() => Error("LuckRollRequired", LuckRollField(0), "Enter your Luck roll.");

    public static ValidationError LuckSecondRollRequired() =>
        Error("LuckSecondRollRequired", LuckRollField(1), "Enter your second Luck roll.");

    public static ValidationError LuckSecondRollNotAllowed() =>
        Error("LuckSecondRollNotAllowed", LuckRollField(1), "Only one Luck roll is used at this age.");

    public static ValidationError DiceResultOutOfRange(string field, DiceExpression dice, int result) =>
        Error(
            "DiceResultOutOfRange",
            field,
            $"Enter a {dice} result between {dice.Minimum} and {dice.Maximum}.",
            $"{dice.Minimum}-{dice.Maximum}",
            Text(result));

    public static ValidationError AgeDeductionTotalMismatch(int total, int deducted) =>
        Error(
            "AgeDeductionTotalMismatch",
            "ageEffects.deductions",
            $"Deduct exactly {total} points in total. You have deducted {deducted}.",
            Text(total),
            Text(deducted));

    public static ValidationError AgeDeductionNotAllowed(Characteristic characteristic) =>
        Error(
            "AgeDeductionNotAllowed",
            AgeDeductionField(characteristic),
            $"{characteristic.ToCode()} can't take the age deduction at this age.");

    public static ValidationError AgeDeductionNegative(Characteristic characteristic, int deduction) =>
        Error("AgeDeductionNegative", AgeDeductionField(characteristic), $"Enter 0 or more for {characteristic.ToCode()}.", null, Text(deduction));

    public static ValidationError CharacteristicBelowFloor(Characteristic characteristic, string field, int value) =>
        Error(
            "CharacteristicBelowFloor",
            field,
            $"{characteristic.ToCode()} can't go below {CharacteristicFloor.Value} after age effects.",
            Text(CharacteristicFloor.Value),
            Text(value));

    public static ValidationError EduImprovementCheckRequired(int index) =>
        Error(
            "EduImprovementCheckRequired",
            EduCheckRollField(index),
            $"Enter the {CreationDice.EduImprovementCheck} roll for EDU check {index + 1}.");

    public static ValidationError EduImprovementCheckNotRequired(int index) =>
        Error("EduImprovementCheckNotRequired", EduCheckField(index), $"EDU check {index + 1} isn't needed at this age.");

    public static ValidationError EduImprovementGainRequired(int index) =>
        Error(
            "EduImprovementGainRequired",
            EduGainField(index),
            $"Enter the {CreationDice.EduImprovementGain} gain for EDU check {index + 1}.");

    public static ValidationError EduImprovementGainNotAllowed(int index, int gain) =>
        Error(
            "EduImprovementGainNotAllowed",
            EduGainField(index),
            $"EDU check {index + 1} has no gain because the roll isn't above EDU.",
            null,
            Text(gain));

    public static string CharacteristicField(Characteristic characteristic) => $"characteristics.{characteristic.ToCode()}";

    public static string AgeDeductionField(Characteristic characteristic) => $"ageEffects.deductions.{characteristic.ToCode()}";

    public static string LuckRollField(int index) => $"luckRolls[{index}]";

    public static string EduCheckField(int index) => $"ageEffects.eduImprovementChecks[{index}]";

    public static string EduCheckRollField(int index) => $"{EduCheckField(index)}.check";

    public static string EduGainField(int index) => $"{EduCheckField(index)}.gain";

    private static ValidationError Error(string code, string field, string message, string? expected = null, string? actual = null) =>
        new(code, field, message, expected, actual, ValidationSeverity.Error);

    private static string Text(int value) => value.ToString(System.Globalization.CultureInfo.InvariantCulture);
}
