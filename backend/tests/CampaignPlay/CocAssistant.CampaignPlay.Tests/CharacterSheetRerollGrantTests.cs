namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// The Keeper's re-roll grant (specs/character-sheet/spec.md, Re-roll grant): granting a group moves its current Roll
/// Records to the replaced collection and opens the grant; replaced records never count toward values.
/// </summary>
public class CharacterSheetRerollGrantTests
{
    private static IReadOnlyDictionary<Characteristic, int?> EightTotals() =>
        CharacteristicCodes.All.ToDictionary(characteristic => characteristic, _ => (int?)7);

    [Fact]
    public void Given_a_sheet_When_granting_characteristics_Then_only_the_characteristic_records_move_and_the_grant_is_set()
    {
        var sheet = new CharacterSheetBuilder()
            .WithCharacteristicRolls(EightTotals())
            .WithLuckRolls(11)
            .Build();

        var granted = sheet.WithRerollGranted([RollGroup.Characteristics]);

        Assert.Equal([RollGroup.Characteristics], granted.RerollGrants);
        Assert.DoesNotContain(granted.RollRecords, record => record.Purpose.StartsWith("Characteristic:", StringComparison.Ordinal));
        Assert.Contains(RollRecord.PlayerEntered("Luck", "3D6", 11), granted.RollRecords);
        Assert.Equal(8, granted.ReplacedRollRecords.Count);
        Assert.Contains(RollRecord.PlayerEntered("Characteristic:STR", "3D6", 7), granted.ReplacedRollRecords);
    }

    [Fact]
    public void Given_a_grant_When_reading_values_Then_replaced_records_do_not_count()
    {
        var sheet = new CharacterSheetBuilder()
            .WithCharacteristicRolls(EightTotals())
            .WithLuckRolls(11)
            .WithEduImprovementChecks(new EduImprovementCheckInput(70, null))
            .Build();

        var granted = sheet.WithRerollGranted([RollGroup.Characteristics, RollGroup.EduImprovementChecks]);

        Assert.All(granted.CharacteristicRolls.Present, _ => Assert.Fail("No characteristic should have a value."));
        Assert.Equal([11], granted.LuckRolls);
        Assert.Empty(granted.EduImprovementChecks);
    }

    [Fact]
    public void Given_a_replaced_and_a_new_record_with_the_same_purpose_When_reading_the_value_Then_the_new_record_wins_without_throwing()
    {
        var sheet = new CharacterSheetBuilder()
            .WithCharacteristicRolls(EightTotals())
            .Build()
            .WithRerollGranted([RollGroup.Characteristics]);

        var rerolled = sheet.WithAddedRollRecords([RollRecord.PlayerEntered("Characteristic:STR", "3D6", 12)]);

        Assert.Equal(12, rerolled.ResultFor("Characteristic:STR"));
        Assert.Null(rerolled.ResultFor("Characteristic:CON"));
    }

    [Fact]
    public void Given_open_grants_When_adding_records_Then_only_the_rolled_groups_grants_clear()
    {
        var sheet = new CharacterSheetBuilder()
            .WithCharacteristicRolls(EightTotals())
            .WithLuckRolls(11)
            .Build()
            .WithRerollGranted([RollGroup.Characteristics, RollGroup.Luck]);

        var rerolled = sheet.WithAddedRollRecords([RollRecord.PlayerEntered("Characteristic:STR", "3D6", 12)]);

        Assert.Equal([RollGroup.Luck], rerolled.RerollGrants);
        Assert.Single(rerolled.RollRecords, record => record.Purpose == "Characteristic:STR");
    }

    [Fact]
    public void Given_two_sheets_When_only_the_grants_or_replaced_records_differ_Then_they_are_not_equal()
    {
        var sheet = new CharacterSheetBuilder()
            .WithCharacteristicRolls(EightTotals())
            .Build();

        Assert.NotEqual(sheet, sheet.WithRerollGranted([RollGroup.Characteristics]));
        Assert.NotEqual(
            sheet.WithRerollGranted([RollGroup.Characteristics]),
            sheet.WithRerollGranted([RollGroup.Luck]));
    }
}
