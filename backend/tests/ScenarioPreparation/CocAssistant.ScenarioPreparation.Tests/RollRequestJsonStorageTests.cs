namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Storing Requested Rolls' Roll Records as JSON (ADR 0032): every record round-trips with its percentile and flag.</summary>
public class RollRequestJsonStorageTests
{
    private static readonly PercentileRoll SpotHidden = new(60, 60, 30, 12, Difficulty.Regular, 0, 0, 5, [20], 20, 25, SuccessLevel.Hard, true);

    [Fact]
    public void Given_no_records_When_storing_Then_an_empty_list_comes_back()
    {
        Assert.Empty(RollRequestJsonStorage.FromStorage(RollRequestJsonStorage.ToStorage([])));
    }

    [Fact]
    public void Given_a_rolled_record_When_storing_Then_the_percentile_and_the_flag_come_back()
    {
        var records = new[]
        {
            new RollRecord(
                $"RollRequest:{Guid.NewGuid()}:{Guid.NewGuid()}",
                RequestedRoll.RollRecordDice,
                25,
                RollSource.Server,
                [20, 5],
                Guid.NewGuid(),
                new DateTimeOffset(2026, 11, 12, 12, 0, 0, TimeSpan.Zero),
                SpotHidden,
                true),
        };

        var stored = RollRequestJsonStorage.FromStorage(RollRequestJsonStorage.ToStorage(records));

        Assert.Equal(records, stored);
    }

    [Fact]
    public void Given_a_player_entered_record_When_storing_Then_the_missing_percentile_comes_back()
    {
        var records = new[] { RollRecord.PlayerEntered("Library Use", "1D100", 42) };

        Assert.Equal(records, RollRequestJsonStorage.FromStorage(RollRequestJsonStorage.ToStorage(records)));
    }

    [Fact]
    public void Given_an_unknown_schema_version_When_reading_Then_it_is_refused()
    {
        var stored = RollRequestJsonStorage.ToStorage([]).Replace(
            $"\"schemaVersion\":{RollRequestJsonStorage.CurrentSchemaVersion}", "\"schemaVersion\":99", StringComparison.Ordinal);

        Assert.Throws<InvalidOperationException>(() => RollRequestJsonStorage.FromStorage(stored));
    }
}
