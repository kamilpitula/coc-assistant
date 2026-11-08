namespace CocAssistant.CampaignPlay.Tests;

/// <summary>The Creation Method lock: once any characteristic has a Roll Record, the method cannot change.</summary>
public class CreationLocksTests
{
    [Fact]
    public void Given_a_sheet_with_no_roll_records_When_reading_the_lock_Then_the_creation_method_is_free()
    {
        var sheet = CharacterSheet.Empty;

        Assert.False(CreationLocks.Of(sheet).CreationMethod);
    }

    [Fact]
    public void Given_a_sheet_with_only_luck_rolls_When_reading_the_lock_Then_the_creation_method_is_free()
    {
        var sheet = new CharacterSheetBuilder().WithLuckRolls(11).Build();

        Assert.False(CreationLocks.Of(sheet).CreationMethod);
    }

    [Fact]
    public void Given_a_sheet_with_a_characteristic_roll_When_reading_the_lock_Then_the_creation_method_is_locked()
    {
        var sheet = new CharacterSheetBuilder()
            .WithCharacteristicRolls(new Dictionary<Characteristic, int?> { [Characteristic.Strength] = 12 })
            .Build();

        Assert.True(CreationLocks.Of(sheet).CreationMethod);
    }
}
