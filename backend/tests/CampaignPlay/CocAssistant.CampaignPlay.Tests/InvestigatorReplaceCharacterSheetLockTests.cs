namespace CocAssistant.CampaignPlay.Tests;

/// <summary>A PUT never creates, changes, or removes a Roll Record, and it cannot break a creation lock
/// (specs/character-sheet/spec.md, Creation locks). Server records seed the locks, as they lock like legacy records.</summary>
public class InvestigatorReplaceCharacterSheetLockTests
{
    private static readonly DateTimeOffset CreatedAt = new(2026, 10, 2, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Later = CreatedAt.AddHours(1);
    private static readonly Guid Roller = Guid.NewGuid();
    private static readonly AgeRules AgeRules = TestRules.Creation.AgeRules;

    private static readonly int[] AllThrees =
        [2, 5, 6, 1, 2, 3, 2, 3, 4, 3, 4, 5, 4, 5, 6, 1, 2, 3, 4, 4, 5];

    private static Investigator NewDraft() => Investigator.Create(Guid.NewGuid(), Guid.NewGuid(), CreatedAt);

    private static CharacterSheet SheetWith(params RollRecord[] records) =>
        CharacterSheet.Empty with
        {
            CreationMethod = CreationMethod.StandardRolling,
            Identity = new InvestigatorIdentity("Harvey Walters", 25, null, null, null),
            RollRecords = records,
        };

    private static CharacterSheet PointBuySheet() => new CharacterSheetBuilder().BuildInputs().ToCharacterSheet();

    private static Investigator DraftWithRolledCharacteristics()
    {
        var investigator = NewDraft();
        Assert.True(investigator.ReplaceCharacterSheet(SheetWith(), AgeRules, CreatedAt));
        Assert.True(investigator.RollCharacteristics(new ScriptedDiceRoller(AllThrees), Roller, Later));
        return investigator;
    }

    private static Investigator DraftWithRolledLuck()
    {
        var investigator = NewDraft();
        Assert.True(investigator.ReplaceCharacterSheet(SheetWith(), AgeRules, CreatedAt));
        Assert.True(investigator.RollLuck(AgeRules, new ScriptedDiceRoller([4, 5, 6]), Roller, Later));
        return investigator;
    }

    private static Investigator DraftWithRolledEduCheck()
    {
        var investigator = NewDraft();
        Assert.True(investigator.ReplaceCharacterSheet(PointBuySheet(), AgeRules, CreatedAt));
        Assert.True(investigator.RollEduImprovementCheck(AgeRules, new ScriptedDiceRoller([70, 4]), Roller, Later));
        return investigator;
    }

    [Fact]
    public void Given_stored_records_When_replacing_the_sheet_Then_every_stored_record_is_kept()
    {
        var investigator = DraftWithRolledCharacteristics();
        var before = investigator.CharacterSheet;

        var replaced = investigator.ReplaceCharacterSheet(SheetWith(), AgeRules, Later);

        Assert.True(replaced);
        Assert.Equal(before.RollRecords, investigator.CharacterSheet.RollRecords);
        Assert.All(investigator.CharacterSheet.RollRecords, record => Assert.Equal(RollSource.Server, record.Source));
    }

    [Fact]
    public void Given_a_rolled_characteristic_When_changing_the_creation_method_Then_it_fails_and_changes_nothing()
    {
        var investigator = DraftWithRolledCharacteristics();

        var before = investigator.CharacterSheet;
        var replaced = investigator.ReplaceCharacterSheet(
            SheetWith() with { CreationMethod = CreationMethod.PointBuy },
            AgeRules,
            Later);

        Assert.False(replaced);
        Assert.Equal(before, investigator.CharacterSheet);
        Assert.Equal(Later, investigator.UpdatedAt);
    }

    [Fact]
    public void Given_only_a_rolled_luck_When_changing_the_creation_method_Then_it_succeeds()
    {
        var investigator = DraftWithRolledLuck();

        var replaced = investigator.ReplaceCharacterSheet(
            SheetWith() with { CreationMethod = CreationMethod.PointBuy },
            AgeRules,
            Later);

        Assert.True(replaced);
        Assert.Equal(CreationMethod.PointBuy, investigator.CharacterSheet.CreationMethod);
    }

    [Fact]
    public void Given_a_rolled_luck_When_moving_to_another_age_bracket_Then_it_fails_and_changes_nothing()
    {
        var investigator = DraftWithRolledLuck();

        var before = investigator.CharacterSheet;
        var replaced = investigator.ReplaceCharacterSheet(
            SheetWith() with { Identity = before.Identity with { Age = 45 } },
            AgeRules,
            Later);

        Assert.False(replaced);
        Assert.Equal(before, investigator.CharacterSheet);
        Assert.Equal(Later, investigator.UpdatedAt);
    }

    [Fact]
    public void Given_a_rolled_luck_When_moving_within_the_same_bracket_Then_it_succeeds()
    {
        var investigator = DraftWithRolledLuck();

        var replaced = investigator.ReplaceCharacterSheet(
            SheetWith() with { Identity = new InvestigatorIdentity("Harvey Walters", 30, null, null, null) },
            AgeRules,
            Later);

        Assert.True(replaced);
        Assert.Equal(30, investigator.CharacterSheet.Identity.Age);
    }

    [Fact]
    public void Given_a_rolled_edu_check_When_changing_edu_Then_it_fails_and_changes_nothing()
    {
        var investigator = DraftWithRolledEduCheck();

        var before = investigator.CharacterSheet;
        var stored = PointBuySheet();
        var replaced = investigator.ReplaceCharacterSheet(
            stored with { AssignedCharacteristics = stored.AssignedCharacteristics.With(Characteristic.Education, 60) },
            AgeRules,
            Later);

        Assert.False(replaced);
        Assert.Equal(before, investigator.CharacterSheet);
        Assert.Equal(Later, investigator.UpdatedAt);
    }

    [Fact]
    public void Given_a_rolled_edu_check_When_nothing_locked_changes_Then_it_succeeds()
    {
        var investigator = DraftWithRolledEduCheck();
        var stored = PointBuySheet();

        var replaced = investigator.ReplaceCharacterSheet(
            stored with { Identity = stored.Identity with { Name = "Changed" } },
            AgeRules,
            Later);

        Assert.True(replaced);
        Assert.Equal("Changed", investigator.CharacterSheet.Identity.Name);
    }
}
