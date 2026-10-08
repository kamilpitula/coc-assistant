namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Runs every case of specs/character-sheet/validation-fixtures.json against the backend validator, which must produce
/// exactly the expected ValidationError items (specs/character-sheet/spec.md, Validation, parity fixtures). The case
/// names cite the rule sections they exercise.
/// </summary>
public class ValidationFixtureParityTests
{
    private static readonly ICreationRuleData RuleData = new EmbeddedResourceCreationRuleData();
    private static readonly CharacterSheetCalculator Calculator = TestRules.Calculator;
    private static readonly Lazy<JsonDocument> Fixtures = new(() =>
        JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "validation-fixtures.json"))));

    public static TheoryData<string> CaseNames()
    {
        var names = new TheoryData<string>();
        foreach (var fixtureCase in Fixtures.Value.RootElement.GetProperty("cases").EnumerateArray())
        {
            names.Add(fixtureCase.GetProperty("name").GetString()!);
        }

        return names;
    }

    [Theory]
    [MemberData(nameof(CaseNames))]
    public void Given_a_shared_fixture_case_When_the_backend_validates_it_Then_it_reports_exactly_the_expected_items(string caseName)
    {
        var fixtureCase = Fixtures.Value.RootElement.GetProperty("cases").EnumerateArray()
            .Single(candidate => candidate.GetProperty("name").GetString() == caseName);
        var sheet = FixtureSheet.ToInputs(fixtureCase.GetProperty("sheet")).ToCharacterSheet(new PlayerEnteredRollSource());
        var allowed = AllowedCreationMethods.Create(fixtureCase.GetProperty("allowedCreationMethods").EnumerateArray()
            .Select(method => Enum.Parse<CreationMethod>(method.GetString()!)));

        var actual = TestRules.Validate(sheet, allowed);

        var expected = fixtureCase.GetProperty("expected").EnumerateArray().Select(FixtureSheet.ToValidationError);
        Assert.Equal(Sorted(expected), Sorted(actual));
    }

    [Fact]
    public void Given_the_fixture_rules_When_compared_with_the_backend_rule_parameters_Then_they_match()
    {
        var rules = Fixtures.Value.RootElement.GetProperty("rules");

        Assert.Equal(PointBuyRules.Budget, rules.GetProperty("pointBuyBudget").GetInt32());
        Assert.Equal(PointBuyRules.Minimum, rules.GetProperty("pointBuyMinimum").GetInt32());
        Assert.Equal(PointBuyRules.Maximum, rules.GetProperty("pointBuyMaximum").GetInt32());
        Assert.Equal(PointBuyRules.RecommendedMinimum, rules.GetProperty("pointBuyRecommendedMinimum").GetInt32());
        Assert.Equal(InvestigatorAgeRange.Minimum, rules.GetProperty("minimumAge").GetInt32());
        Assert.Equal(InvestigatorAgeRange.Maximum, rules.GetProperty("maximumAge").GetInt32());
        Assert.Equal(CharacteristicFloor.Value, rules.GetProperty("characteristicFloor").GetInt32());
        Assert.Equal(CreationDice.Luck.ToString(), rules.GetProperty("luckDice").GetString());
        Assert.Equal(CreationDice.EduImprovementCheck.ToString(), rules.GetProperty("eduImprovementCheckDice").GetString());
        Assert.Equal(CreationDice.EduImprovementGain.ToString(), rules.GetProperty("eduImprovementGainDice").GetString());
        Assert.Equal(EduImprovement.MaximumEducation, rules.GetProperty("eduMaximum").GetInt32());
        Assert.Equal(CreationDice.LuckMultiplier, rules.GetProperty("luckMultiplier").GetInt32());
        Assert.Equal(QuickFireRules.CharacteristicValues, Ints(rules.GetProperty("quickFireCharacteristicValues")));
        Assert.Equal(QuickFireRules.SkillValues, Ints(rules.GetProperty("quickFireSkillValues")));
        Assert.Equal(QuickFireRules.PersonalInterestBonus, rules.GetProperty("quickFirePersonalInterestBonus").GetInt32());
        Assert.Equal(QuickFireRules.PersonalInterestCount, rules.GetProperty("quickFirePersonalInterestCount").GetInt32());
        Assert.Equal(CreditRatingRange.Minimum, rules.GetProperty("creditRatingMinimum").GetInt32());
        Assert.Equal(CreditRatingRange.Maximum, rules.GetProperty("creditRatingMaximum").GetInt32());
        Assert.Equal(CustomOccupationRules.SkillCount, rules.GetProperty("customOccupationSkillCount").GetInt32());
        Assert.Equal(SkillValueWarning.Threshold, rules.GetProperty("skillValueWarningThreshold").GetInt32());
        Assert.Equal(SkillReference.CreditRatingName, rules.GetProperty("creditRatingSkill").GetString());
        Assert.Equal(SkillReference.CthulhuMythosName, rules.GetProperty("cthulhuMythosSkill").GetString());
        Assert.Equal(
            OccupationPointFormulas.Common.Select(OccupationPointFormulas.IdOf),
            rules.GetProperty("occupationPointFormulas").EnumerateArray().Select(formula => formula.GetProperty("id").GetString()));
        Assert.All(CharacteristicCodes.All, characteristic =>
        {
            var formula = rules.GetProperty("standardRolling").GetProperty(characteristic.ToCode());
            Assert.Equal(StandardRolling.FormulaFor(characteristic).Dice.ToString(), formula.GetProperty("dice").GetString());
            Assert.Equal(StandardRolling.FormulaFor(characteristic).Bonus, formula.GetProperty("bonus").GetInt32());
            Assert.Equal(StandardRolling.FormulaFor(characteristic).Multiplier, formula.GetProperty("multiplier").GetInt32());
        });
    }

    private static List<int> Ints(JsonElement values) => values.EnumerateArray().Select(value => value.GetInt32()).ToList();

    private static List<ValidationError> Sorted(IEnumerable<ValidationError> errors) =>
        errors
            .OrderBy(error => error.Field, StringComparer.Ordinal)
            .ThenBy(error => error.Code, StringComparer.Ordinal)
            .ThenBy(error => error.Message, StringComparer.Ordinal)
            .ToList();

    /// <summary>Reads the fixture's sheet, written in the PUT character-sheet body shape.</summary>
    private static class FixtureSheet
    {
        public static CharacterSheetInputs ToInputs(JsonElement sheet)
        {
            var identity = sheet.GetProperty("identity");
            var ageEffects = sheet.GetProperty("ageEffects");
            return new CharacterSheetInputs(
                new InvestigatorIdentity(
                    OptionalString(identity, "name"),
                    OptionalInt(identity, "age"),
                    OptionalString(identity, "gender"),
                    OptionalString(identity, "residence"),
                    OptionalString(identity, "birthplace")),
                OptionalString(sheet, "creationMethod") is { } method ? Enum.Parse<CreationMethod>(method) : null,
                Characteristics(sheet.GetProperty("characteristics")),
                Characteristics(ageEffects.GetProperty("deductions")),
                ageEffects.GetProperty("eduImprovementChecks").EnumerateArray()
                    .Select(check => new EduImprovementCheckInput(OptionalInt(check, "check"), OptionalInt(check, "gain")))
                    .ToList(),
                sheet.GetProperty("luckRolls").EnumerateArray().Select(Int).ToList(),
                sheet.TryGetProperty("characteristicRolls", out var rolls) ? Characteristics(rolls) : null,
                Occupation(sheet),
                OptionalArray(sheet, "skills").Select(Allocation).ToList(),
                QuickFire(sheet),
                BackstoryAndPossessions(sheet));
        }

        private static BackstoryAndPossessions BackstoryAndPossessions(JsonElement sheet)
        {
            var entries = sheet.TryGetProperty("backstory", out var backstory) && backstory.ValueKind == JsonValueKind.Object
                ? Enum.GetValues<BackstoryEntry>()
                    .Select(entry => (entry, text: OptionalString(backstory, JsonNamingPolicy.CamelCase.ConvertName(entry.ToString()))))
                    .Where(pair => pair.text is not null)
                    .ToDictionary(pair => pair.entry, pair => pair.text!)
                : [];
            var keyConnection = OptionalString(sheet, "keyConnection") is { } key ? Enum.Parse<BackstoryEntry>(key, ignoreCase: true) : (BackstoryEntry?)null;
            var weapons = OptionalArray(sheet, "weapons")
                .Select(weapon => new CustomWeapon(
                    OptionalString(weapon, "name"),
                    OptionalString(weapon, "skill"),
                    OptionalString(weapon, "damage"),
                    OptionalString(weapon, "attacks"),
                    OptionalString(weapon, "range"),
                    OptionalString(weapon, "ammo"),
                    OptionalString(weapon, "malfunction")))
                .ToList();
            var myStory = backstory.ValueKind == JsonValueKind.Object ? OptionalString(backstory, "myStory") : null;
            return new BackstoryAndPossessions(new Backstory(myStory, entries), keyConnection, weapons, OptionalString(sheet, "gear"));
        }

        private static OccupationSelection? Occupation(JsonElement sheet)
        {
            if (!sheet.TryGetProperty("occupation", out var occupation) || occupation.ValueKind == JsonValueKind.Null)
            {
                return null;
            }

            var custom = occupation.TryGetProperty("custom", out var customElement) && customElement.ValueKind != JsonValueKind.Null
                ? new CustomOccupation(
                    OptionalString(customElement, "name"),
                    OptionalString(customElement, "formulaId"),
                    OptionalArray(customElement, "skills").Select(skill => skill.ValueKind == JsonValueKind.Null ? null : Skill(skill)).ToList(),
                    OptionalInt(customElement, "creditRatingMin"),
                    OptionalInt(customElement, "creditRatingMax"))
                : null;
            return new OccupationSelection(
                OptionalString(occupation, "catalogId"),
                custom,
                OptionalArray(occupation, "formulaCharacteristics").Select(value => value.ValueKind == JsonValueKind.Null ? null : value.GetString()).ToList(),
                OptionalArray(occupation, "skillChoices")
                    .Select(picks => (IReadOnlyList<SkillReference>)picks.EnumerateArray().Select(Skill).ToList())
                    .ToList());
        }

        private static SkillAllocation Allocation(JsonElement allocation) =>
            new(Skill(allocation), OptionalInt(allocation, "occupationPoints"), OptionalInt(allocation, "personalInterestPoints"));

        private static QuickFireSkills QuickFire(JsonElement sheet)
        {
            if (!sheet.TryGetProperty("quickFire", out var quickFire) || quickFire.ValueKind == JsonValueKind.Null)
            {
                return QuickFireSkills.Empty;
            }

            return new QuickFireSkills(
                OptionalArray(quickFire, "values").Select(value => new QuickFireSkillValue(Skill(value), OptionalInt(value, "value"))).ToList(),
                OptionalArray(quickFire, "personalInterests").Select(Skill).ToList(),
                quickFire.TryGetProperty("extraSkill", out var extra) && extra.ValueKind != JsonValueKind.Null ? Skill(extra) : null);
        }

        private static SkillReference Skill(JsonElement skill) => new(skill.GetProperty("skill").GetString()!, OptionalString(skill, "specialization"));

        private static IEnumerable<JsonElement> OptionalArray(JsonElement element, string name) =>
            element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Array ? value.EnumerateArray() : [];

        public static ValidationError ToValidationError(JsonElement error) =>
            new(
                error.GetProperty("code").GetString()!,
                error.GetProperty("field").GetString()!,
                error.GetProperty("message").GetString()!,
                OptionalString(error, "expected"),
                OptionalString(error, "actual"),
                Enum.Parse<ValidationSeverity>(error.GetProperty("severity").GetString()!));

        private static CharacteristicValues Characteristics(JsonElement values) =>
            CharacteristicValues.From(values.EnumerateObject().Select(property =>
                CharacteristicCodes.TryParse(property.Name, out var characteristic)
                    ? KeyValuePair.Create(characteristic, Int(property.Value))
                    : throw new InvalidOperationException($"Unknown characteristic '{property.Name}'.")));

        private static string? OptionalString(JsonElement element, string name) =>
            element.TryGetProperty(name, out var value) && value.ValueKind != JsonValueKind.Null ? value.GetString() : null;

        private static int? OptionalInt(JsonElement element, string name) =>
            element.TryGetProperty(name, out var value) ? Int(value) : null;

        private static int? Int(JsonElement value) => value.ValueKind == JsonValueKind.Null ? null : value.GetInt32();
    }
}
