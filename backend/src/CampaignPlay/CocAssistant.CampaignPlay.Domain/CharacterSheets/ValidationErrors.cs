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

    public static ValidationError CharacteristicRollRequired(Characteristic characteristic) =>
        Error(
            "CharacteristicRollRequired",
            CharacteristicRollField(characteristic),
            $"Enter the {StandardRolling.FormulaFor(characteristic).Dice} total for {characteristic.ToCode()}.");

    public static ValidationError QuickFireValueNotInPool(Characteristic characteristic, int value)
    {
        var values = List(QuickFireRules.CharacteristicValues.Distinct().Order());
        return Error(
            "QuickFireValueNotInPool",
            CharacteristicField(characteristic),
            $"{characteristic.ToCode()} must be one of the Quick fire values: {values}.",
            values,
            Text(value));
    }

    public static ValidationError QuickFireAssignmentMismatch(IEnumerable<int> assigned)
    {
        var pool = List(QuickFireRules.CharacteristicValues.Order());
        return Error("QuickFireAssignmentMismatch", "characteristics", $"Use each Quick fire value exactly once: {pool}.", pool, List(assigned.Order()));
    }

    public static ValidationError OccupationRequired() => Error("OccupationRequired", "occupation", "Choose an occupation.");

    public static ValidationError OccupationNotAvailable(string catalogId) =>
        Error("OccupationNotAvailable", "occupation.catalogId", "This occupation isn't available in this Campaign's era.", null, catalogId);

    public static ValidationError OccupationFormulaChoiceRequired(int termIndex, IReadOnlyList<string> options) =>
        Error(
            "OccupationFormulaChoiceRequired",
            $"occupation.formulaCharacteristics[{termIndex}]",
            "Choose which characteristic your occupation points use.",
            string.Join(", ", options));

    public static ValidationError WeaponNameRequired(int index) =>
        Error("WeaponNameRequired", $"weapons[{index}].name", "Enter a name for this weapon.");

    public static ValidationError CustomOccupationNameRequired() =>
        Error("CustomOccupationNameRequired", "occupation.custom.name", "Enter a name for your occupation.");

    public static ValidationError CustomOccupationFormulaNotAllowed(string? formulaId) =>
        Error("CustomOccupationFormulaNotAllowed", "occupation.custom.formulaId", "Choose a point formula from the list.", null, formulaId);

    public static ValidationError CustomOccupationSkillRequired(int index) =>
        Error("CustomOccupationSkillRequired", CustomOccupationSkillField(index), $"Choose occupation skill {index + 1}.");

    public static ValidationError CustomOccupationCreditRatingRangeInvalid(int? minimum, int? maximum) =>
        Error(
            "CustomOccupationCreditRatingRangeInvalid",
            "occupation.custom.creditRating",
            $"Enter a Credit Rating range between {CreditRatingRange.Minimum} and {CreditRatingRange.Maximum}, with the minimum no higher than the maximum.",
            $"{CreditRatingRange.Minimum}-{CreditRatingRange.Maximum}",
            $"{minimum}-{maximum}");

    public static ValidationError OccupationSkillChoiceRequired(int slotIndex, int needed, int chosen) =>
        Error(
            "OccupationSkillChoiceRequired",
            SkillChoiceField(slotIndex),
            $"Choose {needed} {(needed == 1 ? "skill" : "skills")} for this part of your occupation.",
            Text(needed),
            Text(chosen));

    public static ValidationError OccupationSkillChoiceNotAllowed(string field, SkillReference skill) =>
        Error(
            "OccupationSkillChoiceNotAllowed",
            field,
            "Choose a skill this occupation allows that isn't already one of its skills.",
            null,
            skill.DisplayName);

    public static ValidationError SpecializationRequired(string skillField, SkillReference skill) =>
        Error("SpecializationRequired", SpecializationField(skillField), $"Enter a specialization for {skill.Skill}.");

    public static ValidationError SpecializationNotAllowed(string skillField, SkillReference skill) =>
        Error(
            "SpecializationNotAllowed",
            SpecializationField(skillField),
            $"Choose a {skill.Skill} specialization from the list.",
            null,
            skill.Specialization);

    public static ValidationError UnknownSkill(int index, SkillReference skill) =>
        Error("UnknownSkill", $"{SkillField(index)}.skill", "Choose a skill from the list.", null, skill.DisplayName);

    public static ValidationError SkillPointsNegative(string field, SkillReference skill, int points) =>
        Error("SkillPointsNegative", field, $"Enter 0 or more points for {skill.DisplayName}.", null, Text(points));

    public static ValidationError CreationPointsOnCthulhuMythos(string field, int points) =>
        Error("CreationPointsOnCthulhuMythos", field, "Cthulhu Mythos can't take points at creation.", null, Text(points));

    public static ValidationError PersonalInterestPointsOnCreditRating(int index, int points) =>
        Error(
            "PersonalInterestPointsOnCreditRating",
            PersonalInterestPointsField(index),
            "Credit Rating can only take occupation points.",
            null,
            Text(points));

    public static ValidationError OccupationPointsOutsideOccupationSkills(int index, SkillReference skill, int points) =>
        Error(
            "OccupationPointsOutsideOccupationSkills",
            OccupationPointsField(index),
            $"{skill.DisplayName} is no longer one of your occupation skills. Remove its occupation points to use them elsewhere.",
            null,
            Text(points));

    public static ValidationError OccupationPointsOverspent(PointBudget budget) =>
        Error(
            "OccupationPointsOverspent",
            "occupationPoints",
            $"You've spent {budget.Spent} occupation points. You have {budget.Budget}.",
            Text(budget.Budget),
            Text(budget.Spent));

    public static ValidationError OccupationPointsUnspent(PointBudget budget) =>
        Warning(
            "OccupationPointsUnspent",
            "occupationPoints",
            $"You have {budget.Left} occupation points left. Unspent points are lost.",
            Text(budget.Budget),
            Text(budget.Spent));

    public static ValidationError CreditRatingOutOfRange(int minimum, int maximum, int creditRating) =>
        Error(
            "CreditRatingOutOfRange",
            CreditRatingField,
            $"Credit Rating must be between {minimum} and {maximum}.",
            $"{minimum}-{maximum}",
            Text(creditRating));

    public static ValidationError PersonalInterestPointsOverspent(PointBudget budget) =>
        Error(
            "PersonalInterestPointsOverspent",
            "personalInterestPoints",
            $"You've spent {budget.Spent} personal interest points. You have {budget.Budget}.",
            Text(budget.Budget),
            Text(budget.Spent));

    public static ValidationError PersonalInterestPointsUnspent(PointBudget budget) =>
        Warning(
            "PersonalInterestPointsUnspent",
            "personalInterestPoints",
            $"You have {budget.Left} personal interest points left. Unspent points are lost.",
            Text(budget.Budget),
            Text(budget.Spent));

    public static ValidationError QuickFireSkillValueNotInPool(int index, int value)
    {
        var values = List(QuickFireRules.SkillValues.Distinct());
        return Error(
            "QuickFireSkillValueNotInPool",
            $"{QuickFireValueField(index)}.value",
            $"Use one of the Quick fire skill values: {values}.",
            values,
            Text(value));
    }

    public static ValidationError QuickFireSkillAssignmentMismatch(IEnumerable<int> expected, IEnumerable<int> assigned)
    {
        var values = List(expected.OrderDescending());
        return Error(
            "QuickFireSkillAssignmentMismatch",
            "quickFire.values",
            $"Use each Quick fire skill value exactly once: {values}.",
            values,
            List(assigned.OrderDescending()));
    }

    public static ValidationError QuickFireSkillNotOccupationSkill(int index, SkillReference skill) =>
        Error(
            "QuickFireSkillNotOccupationSkill",
            $"{QuickFireValueField(index)}.skill",
            $"{skill.DisplayName} is no longer one of your occupation skills. Remove its value to use it elsewhere.",
            null,
            skill.DisplayName);

    public static ValidationError QuickFireExtraSkillRequired(int freedValue) =>
        Error("QuickFireExtraSkillRequired", QuickFireExtraSkillField, $"Choose the skill that takes the freed {freedValue}.", Text(freedValue));

    public static ValidationError QuickFireExtraSkillNotAllowed(SkillReference skill) =>
        Error(
            "QuickFireExtraSkillNotAllowed",
            QuickFireExtraSkillField,
            "Choose a skill for the freed value that isn't an occupation skill, Credit Rating, or Cthulhu Mythos.",
            null,
            skill.DisplayName);

    public static ValidationError QuickFireExtraSkillNotNeeded(SkillReference skill) =>
        Error(
            "QuickFireExtraSkillNotNeeded",
            QuickFireExtraSkillField,
            "This occupation frees no Quick fire value. Remove the extra skill.",
            null,
            skill.DisplayName);

    public const string QuickFireExtraSkillField = "quickFire.extraSkill";

    public static ValidationError QuickFireCreditRatingValue(int expected, int? actual) =>
        Error(
            "QuickFireCreditRatingValue",
            CreditRatingField,
            $"Credit Rating must be {expected} for this occupation.",
            Text(expected),
            actual is { } value ? Text(value) : null);

    public static ValidationError QuickFirePersonalInterestNotAllowed(int index, SkillReference skill) =>
        Error(
            "QuickFirePersonalInterestNotAllowed",
            QuickFirePersonalInterestField(index),
            "Choose a skill that isn't an occupation skill, Credit Rating, Cthulhu Mythos, or already chosen.",
            null,
            skill.DisplayName);

    public static ValidationError QuickFirePersonalInterestsTooMany(int chosen) =>
        Error(
            "QuickFirePersonalInterestsTooMany",
            "quickFire.personalInterests",
            PersonalInterestCountMessage(chosen),
            Text(QuickFireRules.PersonalInterestCount),
            Text(chosen));

    public static ValidationError QuickFirePersonalInterestsUnchosen(int chosen) =>
        Warning(
            "QuickFirePersonalInterestsUnchosen",
            "quickFire.personalInterests",
            PersonalInterestCountMessage(chosen),
            Text(QuickFireRules.PersonalInterestCount),
            Text(chosen));

    public static ValidationError SkillAboveWarningThreshold(SkillReference skill, int value) =>
        Warning(
            "SkillAboveWarningThreshold",
            "skills",
            $"{skill.DisplayName} is above {SkillValueWarning.Threshold}. Check with your Keeper.",
            Text(SkillValueWarning.Threshold),
            Text(value));

    public const string CreditRatingField = "creditRating";

    public static string CharacteristicRollField(Characteristic characteristic) => $"characteristicRolls.{characteristic.ToCode()}";

    public static string SkillChoiceField(int slotIndex) => $"occupation.skillChoices[{slotIndex}]";

    public static string SkillChoicePickField(int slotIndex, int pickIndex) => $"{SkillChoiceField(slotIndex)}[{pickIndex}]";

    public static string CustomOccupationSkillField(int index) => $"occupation.custom.skills[{index}]";

    public static string SkillField(int index) => $"skills[{index}]";

    public static string OccupationPointsField(int index) => $"{SkillField(index)}.occupationPoints";

    public static string PersonalInterestPointsField(int index) => $"{SkillField(index)}.personalInterestPoints";

    public static string QuickFireValueField(int index) => $"quickFire.values[{index}]";

    public static string QuickFirePersonalInterestField(int index) => $"quickFire.personalInterests[{index}]";

    /// <summary>The specialization field of a skill field: "skills[2]" or "skills[2].skill" become "skills[2].specialization".</summary>
    public static string SpecializationField(string skillField) =>
        $"{(skillField.EndsWith(".skill", StringComparison.Ordinal) ? skillField[..^".skill".Length] : skillField)}.specialization";

    public static string CharacteristicField(Characteristic characteristic) => $"characteristics.{characteristic.ToCode()}";

    public static string AgeDeductionField(Characteristic characteristic) => $"ageEffects.deductions.{characteristic.ToCode()}";

    public static string LuckRollField(int index) => $"luckRolls[{index}]";

    public static string EduCheckField(int index) => $"ageEffects.eduImprovementChecks[{index}]";

    public static string EduCheckRollField(int index) => $"{EduCheckField(index)}.check";

    public static string EduGainField(int index) => $"{EduCheckField(index)}.gain";

    private static ValidationError Error(string code, string field, string message, string? expected = null, string? actual = null) =>
        new(code, field, message, expected, actual, ValidationSeverity.Error);

    private static ValidationError Warning(string code, string field, string message, string? expected = null, string? actual = null) =>
        new(code, field, message, expected, actual, ValidationSeverity.Warning);

    private static string PersonalInterestCountMessage(int chosen) =>
        $"Choose {QuickFireRules.PersonalInterestCount} personal interest skills. You have chosen {chosen}.";

    private static string List(IEnumerable<int> values) => string.Join(", ", values.Select(Text));

    private static string Text(int value) => value.ToString(System.Globalization.CultureInfo.InvariantCulture);
}
