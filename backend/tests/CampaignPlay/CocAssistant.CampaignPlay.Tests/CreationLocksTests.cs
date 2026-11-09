namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// The creation locks (specs/character-sheet/spec.md, Creation locks): the Creation Method locks once any
/// characteristic has a Roll Record; the age bracket locks once Luck or any EDU check does, while the saved age has a
/// bracket; EDU locks once any EDU check does. PlayerEntered records lock too.
/// </summary>
public class CreationLocksTests
{
    private static AgeBracket? BracketFor(int? age) => age is { } value ? TestRules.Creation.AgeRules.BracketFor(value) : null;

    private static CharacterSheet SheetWith(int? age, params RollRecord[] records) =>
        CharacterSheet.Empty with
        {
            CreationMethod = CreationMethod.PointBuy,
            Identity = new InvestigatorIdentity("Harvey Walters", age, null, null, null),
            AssignedCharacteristics = CharacteristicValues.Empty.With(Characteristic.Education, 50),
            RollRecords = records,
        };

    [Fact]
    public void Given_a_sheet_with_no_roll_records_When_reading_the_locks_Then_everything_is_free()
    {
        var locks = CreationLocks.Of(SheetWith(25), BracketFor(25));

        Assert.Equal(new CreationLocks(false, false, false), locks);
    }

    [Fact]
    public void Given_a_sheet_with_a_characteristic_roll_When_reading_the_locks_Then_only_the_creation_method_is_locked()
    {
        var sheet = SheetWith(25, RollRecord.PlayerEntered(RollPurposes.Characteristic(Characteristic.Strength), "3D6", 12));

        Assert.Equal(new CreationLocks(true, false, false), CreationLocks.Of(sheet, BracketFor(25)));
    }

    [Fact]
    public void Given_a_sheet_with_a_player_entered_luck_roll_When_reading_the_locks_Then_the_age_bracket_is_locked()
    {
        var sheet = SheetWith(25, RollRecord.PlayerEntered(RollPurposes.Luck, "3D6", 11));

        Assert.Equal(new CreationLocks(false, true, false), CreationLocks.Of(sheet, BracketFor(25)));
    }

    [Fact]
    public void Given_a_sheet_with_an_edu_check_When_reading_the_locks_Then_the_age_bracket_and_edu_are_locked()
    {
        var sheet = SheetWith(25, RollRecord.PlayerEntered(RollPurposes.EduImprovementCheck(1), "D100", 30));

        Assert.Equal(new CreationLocks(false, true, true), CreationLocks.Of(sheet, BracketFor(25)));
    }

    [Fact]
    public void Given_luck_records_but_no_stored_bracket_When_reading_the_locks_Then_the_age_bracket_is_free()
    {
        var sheet = SheetWith(null, RollRecord.PlayerEntered(RollPurposes.Luck, "3D6", 11));

        Assert.Equal(new CreationLocks(false, false, false), CreationLocks.Of(sheet, BracketFor(null)));
    }

    [Fact]
    public void Given_an_age_within_the_stored_bracket_When_checking_the_locks_Then_nothing_is_refused()
    {
        var stored = SheetWith(25, RollRecord.PlayerEntered(RollPurposes.Luck, "3D6", 11));
        var next = stored with { Identity = stored.Identity with { Age = 30 } };

        Assert.False(CreationLocks.Refuses(stored, next, TestRules.Creation.AgeRules));
    }

    [Fact]
    public void Given_an_age_in_another_bracket_When_checking_the_locks_Then_it_is_refused()
    {
        var stored = SheetWith(25, RollRecord.PlayerEntered(RollPurposes.Luck, "3D6", 11));
        var next = stored with { Identity = stored.Identity with { Age = 45 } };

        Assert.True(CreationLocks.Refuses(stored, next, TestRules.Creation.AgeRules));
    }

    [Fact]
    public void Given_a_cleared_age_When_checking_the_locks_Then_it_is_refused()
    {
        var stored = SheetWith(25, RollRecord.PlayerEntered(RollPurposes.Luck, "3D6", 11));
        var next = stored with { Identity = stored.Identity with { Age = null } };

        Assert.True(CreationLocks.Refuses(stored, next, TestRules.Creation.AgeRules));
    }

    [Fact]
    public void Given_no_luck_or_edu_records_When_changing_the_age_When_checking_the_locks_Then_it_is_accepted()
    {
        var stored = SheetWith(25);
        var next = stored with { Identity = stored.Identity with { Age = 45 } };

        Assert.False(CreationLocks.Refuses(stored, next, TestRules.Creation.AgeRules));
    }

    [Fact]
    public void Given_an_edu_check_record_When_changing_edu_When_checking_the_locks_Then_it_is_refused()
    {
        var stored = SheetWith(25, RollRecord.PlayerEntered(RollPurposes.EduImprovementCheck(1), "D100", 30));
        var next = stored with
        {
            AssignedCharacteristics = stored.AssignedCharacteristics.With(Characteristic.Education, 60),
        };

        Assert.True(CreationLocks.Refuses(stored, next, TestRules.Creation.AgeRules));
    }

    [Fact]
    public void Given_an_edu_check_record_When_switching_to_a_method_that_clears_edu_Then_it_is_refused()
    {
        var stored = SheetWith(25, RollRecord.PlayerEntered(RollPurposes.EduImprovementCheck(1), "D100", 30));
        var next = stored with
        {
            CreationMethod = CreationMethod.QuickFire,
            AssignedCharacteristics = CharacteristicValues.Empty,
        };

        Assert.True(CreationLocks.Refuses(stored, next, TestRules.Creation.AgeRules));
    }

    [Fact]
    public void Given_standard_rolling_with_an_edu_check_record_When_checking_the_locks_Then_edu_from_records_is_unaffected()
    {
        var stored = SheetWith(25, RollRecord.PlayerEntered(RollPurposes.EduImprovementCheck(1), "D100", 30)) with
        {
            CreationMethod = CreationMethod.StandardRolling,
            AssignedCharacteristics = CharacteristicValues.Empty,
        };

        Assert.False(CreationLocks.Refuses(stored, stored with { }, TestRules.Creation.AgeRules));
    }
}
