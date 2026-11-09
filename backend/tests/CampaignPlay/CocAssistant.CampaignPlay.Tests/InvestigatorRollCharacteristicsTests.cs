namespace CocAssistant.CampaignPlay.Tests;

/// <summary>Rolling characteristics on the server (specs/character-sheet/spec.md, Creation rolling).</summary>
public class InvestigatorRollCharacteristicsTests
{
    private static readonly DateTimeOffset CreatedAt = new(2026, 10, 2, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset RolledAt = CreatedAt.AddHours(1);
    private static readonly Guid Roller = Guid.NewGuid();

    private static readonly int[] AllThrees =
        [2, 5, 6, 1, 2, 3, 2, 3, 4, 3, 4, 5, 4, 5, 6, 1, 2, 3, 4, 4, 5];

    private static Investigator NewDraft() => Investigator.Create(Guid.NewGuid(), Guid.NewGuid(), CreatedAt);

    private static CharacterSheet BlankStandardRollingSheet() =>
        new CharacterSheetBuilder()
            .WithCreationMethod(CreationMethod.StandardRolling)
            .WithLuckRolls()
            .WithEduImprovementChecks()
            .Build();

    [Fact]
    public void Given_a_draft_with_nothing_rolled_When_rolling_characteristics_Then_all_eight_are_server_rolled()
    {
        var investigator = NewDraft();
        investigator.ReplaceCharacterSheet(BlankStandardRollingSheet(), TestRules.Creation.AgeRules, CreatedAt);

        var rolled = investigator.RollCharacteristics(new ScriptedDiceRoller(AllThrees), Roller, RolledAt);

        Assert.True(rolled);
        Assert.Equal(8, investigator.CharacterSheet.RollRecords.Count);
        Assert.All(investigator.CharacterSheet.RollRecords, record => Assert.Equal(RollSource.Server, record.Source));
        Assert.Equal(RolledAt, investigator.UpdatedAt);
    }

    [Fact]
    public void Given_changes_requested_When_rolling_characteristics_Then_it_succeeds()
    {
        var investigator = NewDraft();
        investigator.ReplaceCharacterSheet(BlankStandardRollingSheet(), TestRules.Creation.AgeRules, CreatedAt);
        investigator.Submit([], CreatedAt);
        investigator.RequestChanges("Roll them.", CreatedAt);

        var rolled = investigator.RollCharacteristics(new ScriptedDiceRoller(AllThrees), Roller, RolledAt);

        Assert.True(rolled);
        Assert.Equal(8, investigator.CharacterSheet.RollRecords.Count);
    }

    [Theory]
    [InlineData(InvestigatorStatus.Submitted)]
    [InlineData(InvestigatorStatus.Approved)]
    public void Given_a_submitted_or_approved_investigator_When_rolling_characteristics_Then_it_fails_and_changes_nothing(InvestigatorStatus status)
    {
        var investigator = NewDraft();
        investigator.ReplaceCharacterSheet(BlankStandardRollingSheet(), TestRules.Creation.AgeRules, CreatedAt);
        investigator.Submit([], CreatedAt);
        if (status == InvestigatorStatus.Approved)
        {
            investigator.Approve(CreatedAt);
        }

        var before = investigator.CharacterSheet;
        var rolled = investigator.RollCharacteristics(new ScriptedDiceRoller(AllThrees), Roller, RolledAt);

        Assert.False(rolled);
        Assert.Equal(before, investigator.CharacterSheet);
        Assert.Equal(CreatedAt, investigator.UpdatedAt);
    }

    [Fact]
    public void Given_a_point_buy_sheet_When_rolling_characteristics_Then_it_fails_and_changes_nothing()
    {
        var investigator = NewDraft();
        investigator.ReplaceCharacterSheet(new CharacterSheetBuilder().Build(), TestRules.Creation.AgeRules, CreatedAt);

        var before = investigator.CharacterSheet;
        var rolled = investigator.RollCharacteristics(new ScriptedDiceRoller(AllThrees), Roller, RolledAt);

        Assert.False(rolled);
        Assert.Equal(before, investigator.CharacterSheet);
    }

    [Fact]
    public void Given_every_characteristic_already_rolled_When_rolling_characteristics_Then_it_fails_and_changes_nothing()
    {
        var investigator = NewDraft();
        investigator.ReplaceCharacterSheet(BlankStandardRollingSheet(), TestRules.Creation.AgeRules, CreatedAt);
        investigator.RollCharacteristics(new ScriptedDiceRoller(AllThrees), Roller, RolledAt);

        var before = investigator.CharacterSheet;
        var rolled = investigator.RollCharacteristics(new ScriptedDiceRoller(AllThrees), Roller, RolledAt);

        Assert.False(rolled);
        Assert.Equal(before, investigator.CharacterSheet);
    }
}
