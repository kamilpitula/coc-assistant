namespace CocAssistant.CampaignPlay.Tests;

/// <summary>The stored JSON form of the Character Sheet, with its explicit schema version (ADR 0005, ADR 0007).</summary>
public class CharacterSheetJsonStorageTests
{
    [Fact]
    public void Given_a_character_sheet_When_storing_and_reading_it_Then_it_round_trips()
    {
        var sheet = new CharacterSheetBuilder().WithAssigned(Characteristic.Power, null).Build() with
        {
            Identity = new InvestigatorIdentity("Harvey Walters", 42, "Male", "Boston", "Arkham"),
        };

        var stored = CharacterSheetJsonStorage.ToStorage(sheet);

        Assert.Equal(sheet, CharacterSheetJsonStorage.FromStorage(stored));
    }

    [Fact]
    public void Given_age_deductions_and_roll_records_When_storing_and_reading_the_sheet_Then_they_round_trip()
    {
        var sheet = new CharacterSheetBuilder()
            .WithAge(45)
            .WithDeduction(Characteristic.Strength, 3)
            .WithDeduction(Characteristic.Dexterity, 2)
            .WithEduImprovementChecks(new EduImprovementCheckInput(70, 5), new EduImprovementCheckInput(20, null))
            .WithLuckRolls(11, 13)
            .Build();

        var stored = CharacterSheetJsonStorage.ToStorage(sheet);

        var read = CharacterSheetJsonStorage.FromStorage(stored);
        Assert.Equal(sheet, read);
        Assert.Equal(5, read.RollRecords.Count);
        Assert.All(read.RollRecords, record => Assert.Equal(RollSource.PlayerEntered, record.Source));
        using var document = JsonDocument.Parse(stored);
        Assert.Equal(3, document.RootElement.GetProperty("ageDeductions").GetProperty("STR").GetInt32());
        Assert.Equal("EduImprovement[1].Gain", document.RootElement.GetProperty("rollRecords")[3].GetProperty("purpose").GetString());
    }

    [Fact]
    public void Given_a_character_sheet_When_storing_it_Then_the_document_carries_the_schema_version_and_characteristic_codes()
    {
        var stored = CharacterSheetJsonStorage.ToStorage(new CharacterSheetBuilder().Build());

        using var document = JsonDocument.Parse(stored);
        Assert.Equal(1, document.RootElement.GetProperty("schemaVersion").GetInt32());
        Assert.Equal("PointBuy", document.RootElement.GetProperty("creationMethod").GetString());
        Assert.Equal(60, document.RootElement.GetProperty("assignedCharacteristics").GetProperty("STR").GetInt32());
    }

    [Fact]
    public void Given_a_document_with_an_unknown_schema_version_When_reading_it_Then_it_fails_loudly()
    {
        const string stored = """{ "schemaVersion": 99, "identity": {}, "assignedCharacteristics": {} }""";

        var exception = Assert.Throws<InvalidOperationException>(() => CharacterSheetJsonStorage.FromStorage(stored));
        Assert.Contains("99", exception.Message);
    }
}
