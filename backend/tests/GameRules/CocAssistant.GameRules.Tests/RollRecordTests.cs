namespace CocAssistant.GameRules.Tests;

public class RollRecordTests
{
    [Fact]
    public void Given_a_dice_roll_When_recording_it_from_the_server_Then_faces_total_who_and_when_are_kept_with_a_server_source()
    {
        var rolledBy = Guid.NewGuid();
        var rolledAt = new DateTimeOffset(2026, 11, 8, 12, 0, 0, TimeSpan.Zero);

        var record = RollRecord.FromServer("Characteristic:STR", new DiceRoll("3D6", [11, 9, 3], 23), rolledBy, rolledAt);

        Assert.Equal("Characteristic:STR", record.Purpose);
        Assert.Equal("3D6", record.Dice);
        Assert.Equal([11, 9, 3], record.Faces);
        Assert.Equal(23, record.Result);
        Assert.Equal(RollSource.Server, record.Source);
        Assert.Equal(rolledBy, record.RolledByAccountId);
        Assert.Equal(rolledAt, record.RolledAt);
    }

    [Fact]
    public void Given_a_player_entered_result_When_recording_it_Then_there_are_no_faces_who_or_when()
    {
        var record = RollRecord.PlayerEntered("Luck", "3D6", 11);

        Assert.Equal("Luck", record.Purpose);
        Assert.Equal("3D6", record.Dice);
        Assert.Equal(11, record.Result);
        Assert.Equal(RollSource.PlayerEntered, record.Source);
        Assert.Null(record.Faces);
        Assert.Null(record.RolledByAccountId);
        Assert.Null(record.RolledAt);
    }

    [Fact]
    public void Given_two_server_records_built_from_equal_faces_When_compared_Then_they_are_equal()
    {
        var rolledBy = Guid.NewGuid();
        var rolledAt = new DateTimeOffset(2026, 11, 8, 12, 0, 0, TimeSpan.Zero);

        var left = RollRecord.FromServer("Luck", new DiceRoll("3D6", [2, 5, 6], 13), rolledBy, rolledAt);
        var right = RollRecord.FromServer("Luck", new DiceRoll("3D6", [2, 5, 6], 13), rolledBy, rolledAt);

        Assert.Equal(left, right);
    }

    [Fact]
    public void Given_two_records_with_different_faces_When_compared_Then_they_are_not_equal()
    {
        var rolledBy = Guid.NewGuid();
        var rolledAt = new DateTimeOffset(2026, 11, 8, 12, 0, 0, TimeSpan.Zero);

        var left = RollRecord.FromServer("Luck", new DiceRoll("3D6", [2, 5, 6], 13), rolledBy, rolledAt);
        var right = RollRecord.FromServer("Luck", new DiceRoll("3D6", [2, 5, 5], 12), rolledBy, rolledAt);

        Assert.NotEqual(left, right);
    }

    [Fact]
    public void Given_two_records_with_equal_percentile_rolls_When_compared_Then_they_are_equal()
    {
        var rolledBy = Guid.NewGuid();
        var left = PercentileRecord(25, SuccessLevel.Hard, true, rolledBy);
        var right = PercentileRecord(25, SuccessLevel.Hard, true, rolledBy);

        Assert.Equal(left, right);
        Assert.Equal(left.GetHashCode(), right.GetHashCode());
    }

    [Fact]
    public void Given_two_records_with_different_percentile_results_When_compared_Then_they_are_not_equal()
    {
        var rolledBy = Guid.NewGuid();
        var left = PercentileRecord(25, SuccessLevel.Hard, true, rolledBy);
        var right = PercentileRecord(73, SuccessLevel.Failure, false, rolledBy);

        Assert.NotEqual(left, right);
    }

    [Fact]
    public void Given_two_records_with_different_experience_check_flags_When_compared_Then_they_are_not_equal()
    {
        var rolledBy = Guid.NewGuid();
        var left = PercentileRecord(25, SuccessLevel.Hard, true, rolledBy);
        var right = PercentileRecord(25, SuccessLevel.Hard, false, rolledBy);

        Assert.NotEqual(left, right);
    }

    private static RollRecord PercentileRecord(int result, SuccessLevel level, bool earnsCheck, Guid rolledBy)
    {
        var rolledAt = new DateTimeOffset(2026, 11, 8, 12, 0, 0, TimeSpan.Zero);
        var percentile = new PercentileRoll(
            60, 60, 30, 12, Difficulty.Regular, 0, 0, 5, [20], 20, result, level, level != SuccessLevel.Failure);
        return new RollRecord(
            "RollRequest:request:investigator",
            "1D100",
            result,
            RollSource.Server,
            [2, 5],
            rolledBy,
            rolledAt,
            percentile,
            earnsCheck);
    }
}
