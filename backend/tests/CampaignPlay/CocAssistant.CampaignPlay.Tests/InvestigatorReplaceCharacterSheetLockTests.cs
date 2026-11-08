namespace CocAssistant.CampaignPlay.Tests;

/// <summary>A PUT never creates, changes, or removes a characteristic Roll Record or a Server record, and it cannot
/// break the Creation Method lock (specs/character-sheet/spec.md, Creation locks).</summary>
public class InvestigatorReplaceCharacterSheetLockTests
{
    private static readonly DateTimeOffset CreatedAt = new(2026, 10, 2, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Later = CreatedAt.AddHours(1);
    private static readonly Guid Roller = Guid.NewGuid();

    private static Investigator NewDraft() => Investigator.Create(Guid.NewGuid(), Guid.NewGuid(), CreatedAt);

    private static CharacterSheet SheetWith(params RollRecord[] records) =>
        CharacterSheet.Empty with
        {
            CreationMethod = CreationMethod.StandardRolling,
            Identity = new InvestigatorIdentity("Harvey Walters", 25, null, null, null),
            RollRecords = records,
        };

    [Fact]
    public void Given_stored_characteristic_and_server_records_When_replacing_the_sheet_Then_they_are_kept_and_only_the_typed_luck_and_edu_are_rebuilt()
    {
        var investigator = NewDraft();
        investigator.ReplaceCharacterSheet(
            SheetWith(
                RollRecord.PlayerEntered("Characteristic:STR", "3D6", 12),
                RollRecord.FromServer("Characteristic:DEX", new DiceRoll("3D6", [1, 2, 3], 6), Roller, CreatedAt),
                RollRecord.PlayerEntered("Luck", "3D6", 11)),
            CreatedAt);

        var replaced = investigator.ReplaceCharacterSheet(
            SheetWith(
                RollRecord.PlayerEntered("Luck", "3D6", 13),
                RollRecord.PlayerEntered("EduImprovement[1].Check", "D100", 70)),
            Later);

        Assert.True(replaced);
        Assert.Equal(
            [
                RollRecord.PlayerEntered("Characteristic:STR", "3D6", 12),
                RollRecord.FromServer("Characteristic:DEX", new DiceRoll("3D6", [1, 2, 3], 6), Roller, CreatedAt),
                RollRecord.PlayerEntered("Luck", "3D6", 13),
                RollRecord.PlayerEntered("EduImprovement[1].Check", "D100", 70),
            ],
            investigator.CharacterSheet.RollRecords);
    }

    [Fact]
    public void Given_a_player_entered_characteristic_roll_When_changing_the_creation_method_Then_it_fails_and_changes_nothing()
    {
        var investigator = NewDraft();
        investigator.ReplaceCharacterSheet(
            SheetWith(RollRecord.PlayerEntered("Characteristic:STR", "3D6", 12)),
            CreatedAt);

        var before = investigator.CharacterSheet;
        var replaced = investigator.ReplaceCharacterSheet(
            SheetWith() with { CreationMethod = CreationMethod.PointBuy },
            Later);

        Assert.False(replaced);
        Assert.Equal(before, investigator.CharacterSheet);
        Assert.Equal(CreatedAt, investigator.UpdatedAt);
    }

    [Fact]
    public void Given_no_characteristic_record_When_changing_the_creation_method_Then_it_succeeds()
    {
        var investigator = NewDraft();
        investigator.ReplaceCharacterSheet(SheetWith(RollRecord.PlayerEntered("Luck", "3D6", 11)), CreatedAt);

        var replaced = investigator.ReplaceCharacterSheet(
            SheetWith(RollRecord.PlayerEntered("Luck", "3D6", 11)) with { CreationMethod = CreationMethod.PointBuy },
            Later);

        Assert.True(replaced);
        Assert.Equal(CreationMethod.PointBuy, investigator.CharacterSheet.CreationMethod);
    }
}
