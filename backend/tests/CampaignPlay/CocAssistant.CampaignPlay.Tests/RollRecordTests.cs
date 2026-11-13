namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Legacy Player-entered dice results stay stored as Roll Records (docs/game-rules/project_ruleset.md section 4.3;
/// specs/character-sheet/spec.md, Roll Records).
/// </summary>
public class RollRecordTests
{
    [Theory]
    [InlineData("3D6", 3, 18)]
    [InlineData("D100", 1, 100)]
    [InlineData("1D10", 1, 10)]
    public void Given_a_dice_expression_When_reading_its_range_Then_it_spans_the_results_the_dice_can_produce(string notation, int minimum, int maximum)
    {
        var dice = DiceExpression.Parse(notation);

        Assert.Equal(minimum, dice.Minimum);
        Assert.Equal(maximum, dice.Maximum);
        Assert.Equal(notation, dice.ToString());
    }

    [Fact]
    public void Given_a_builder_with_luck_and_edu_results_When_building_the_sheet_Then_each_result_is_a_stored_roll_record_with_its_purpose()
    {
        var sheet = new CharacterSheetBuilder()
            .WithLuckRolls(11, 13)
            .WithEduImprovementChecks(
                new EduImprovementCheckInput(70, 4),
                new EduImprovementCheckInput(null, null),
                new EduImprovementCheckInput(20, null))
            .Build();

        Assert.Equal(
            [
                RollRecord.PlayerEntered("Luck", "3D6", 11),
                RollRecord.PlayerEntered("Luck:SecondRoll", "3D6", 13),
                RollRecord.PlayerEntered("EduImprovement[1].Check", "D100", 70),
                RollRecord.PlayerEntered("EduImprovement[1].Gain", "1D10", 4),
                RollRecord.PlayerEntered("EduImprovement[3].Check", "D100", 20),
            ],
            sheet.RollRecords);
        Assert.Equal(50, sheet.AssignedCharacteristics[Characteristic.Education]);
    }

    [Fact]
    public void Section_2_1_Given_eight_characteristic_rolls_When_building_the_sheet_Then_there_is_one_player_entered_roll_record_per_result()
    {
        var rolls = CharacteristicValues.From(CharacteristicCodes.All.Select(characteristic => KeyValuePair.Create(characteristic, (int?)7)));

        var sheet = new CharacterSheetBuilder()
            .WithCharacteristicRolls(rolls.Present.ToDictionary(characteristic => characteristic, characteristic => rolls[characteristic]))
            .WithLuckRolls(11)
            .WithEduImprovementChecks()
            .Build();

        Assert.Equal(9, sheet.RollRecords.Count);
        Assert.All(sheet.RollRecords, record => Assert.Equal(RollSource.PlayerEntered, record.Source));
        Assert.Contains(RollRecord.PlayerEntered("Characteristic:STR", "3D6", 7), sheet.RollRecords);
        Assert.Contains(RollRecord.PlayerEntered("Characteristic:SIZ", "2D6", 7), sheet.RollRecords);
        Assert.Equal(rolls, sheet.CharacteristicRolls);
        Assert.Equal(CharacteristicValues.Empty, sheet.AssignedCharacteristics);
    }

    [Fact]
    public void Given_a_character_sheet_with_roll_records_When_reading_its_dice_inputs_Then_they_come_back_in_order_with_gaps()
    {
        var sheet = new CharacterSheetBuilder()
            .WithLuckRolls(11)
            .WithEduImprovementChecks(
                new EduImprovementCheckInput(70, 4),
                new EduImprovementCheckInput(null, null),
                new EduImprovementCheckInput(20, null))
            .Build();

        Assert.Equal([11], sheet.LuckRolls);
        Assert.Equal(
            [new EduImprovementCheckInput(70, 4), new EduImprovementCheckInput(null, null), new EduImprovementCheckInput(20, null)],
            sheet.EduImprovementChecks);
    }

    // Re-roll grant (specs/character-sheet/spec.md): each purpose belongs to one grantable group.
    [Theory]
    [InlineData("Characteristic:STR", RollGroup.Characteristics)]
    [InlineData("Characteristic:EDU", RollGroup.Characteristics)]
    [InlineData("Luck", RollGroup.Luck)]
    [InlineData("Luck:SecondRoll", RollGroup.Luck)]
    [InlineData("EduImprovement[1].Check", RollGroup.EduImprovementChecks)]
    [InlineData("EduImprovement[2].Gain", RollGroup.EduImprovementChecks)]
    public void Given_a_roll_purpose_When_reading_its_group_Then_it_maps_to_its_re_roll_group(string purpose, RollGroup group)
    {
        Assert.Equal(group, RollPurposes.GroupOf(purpose));
    }

    [Theory]
    [InlineData("SomethingElse")]
    [InlineData("")]
    public void Given_an_unknown_purpose_When_reading_its_group_Then_it_has_no_re_roll_group(string purpose)
    {
        Assert.Null(RollPurposes.GroupOf(purpose));
    }

    /// <summary>
    /// The purpose-to-group contract shared with the frontend (specs/character-sheet/roll-group-mapping.json, read by
    /// rollGroups.test.ts): GroupOf agrees with it for every listed purpose, so the two copies cannot drift.
    /// </summary>
    [Fact]
    public void Given_the_shared_roll_group_mapping_When_mapping_every_listed_purpose_Then_it_matches()
    {
        foreach (var (purpose, group) in LoadRollGroupMapping())
        {
            Assert.Equal(group, RollPurposes.GroupOf(purpose));
        }
    }

    private static IReadOnlyList<KeyValuePair<string, RollGroup?>> LoadRollGroupMapping()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "specs", "character-sheet", "roll-group-mapping.json")))
        {
            directory = directory.Parent;
        }

        Assert.NotNull(directory);
        using var document = JsonDocument.Parse(File.ReadAllText(Path.Combine(directory!.FullName, "specs", "character-sheet", "roll-group-mapping.json")));
        return document.RootElement.GetProperty("mapping").EnumerateArray()
            .Select(entry => KeyValuePair.Create(
                entry.GetProperty("purpose").GetString()!,
                entry.GetProperty("group").ValueKind == JsonValueKind.Null
                    ? (RollGroup?)null
                    : Enum.Parse<RollGroup>(entry.GetProperty("group").GetString()!)))
            .ToList();
    }
}
