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
        Assert.Equal(4, document.RootElement.GetProperty("schemaVersion").GetInt32());
        Assert.Equal("PointBuy", document.RootElement.GetProperty("creationMethod").GetString());
        Assert.Equal(60, document.RootElement.GetProperty("assignedCharacteristics").GetProperty("STR").GetInt32());
    }

    [Fact]
    public void Given_an_occupation_skills_and_quick_fire_inputs_When_storing_and_reading_the_sheet_Then_they_round_trip()
    {
        var custom = new CustomOccupation("Bootlegger", "EDUx2+DEXx2", [new SkillReference("Drive Auto"), null], 5, 30);
        var sheet = new CharacterSheetBuilder()
            .WithOccupation(new OccupationSelection("police-detective", custom, [null, "DEX"], [[new SkillReference("Disguise")], []]))
            .WithSkills(new SkillAllocation(new SkillReference("Firearms", "Handgun"), 40, null), new SkillAllocation(SkillReference.CreditRating, 30, 5))
            .WithQuickFireSkills(new QuickFireSkills(
                [new QuickFireSkillValue(new SkillReference("Law"), 70)],
                [new SkillReference("Art/Craft", "Painting")],
                new SkillReference("Drive Auto")))
            .Build();

        var read = CharacterSheetJsonStorage.FromStorage(CharacterSheetJsonStorage.ToStorage(sheet));

        Assert.Equal(sheet, read);
    }

    [Fact]
    public void Given_standard_rolling_rolls_When_storing_and_reading_the_sheet_Then_the_characteristic_roll_records_round_trip()
    {
        var sheet = new CharacterSheetBuilder()
            .WithCharacteristicRolls(new Dictionary<Characteristic, int?> { [Characteristic.Strength] = 11, [Characteristic.Size] = 7 })
            .Build();

        var read = CharacterSheetJsonStorage.FromStorage(CharacterSheetJsonStorage.ToStorage(sheet));

        Assert.Equal(sheet, read);
        Assert.Equal(7, read.CharacteristicRolls[Characteristic.Size]);
    }

    [Fact]
    public void Given_a_schema_version_1_document_When_reading_it_Then_it_is_upgraded_without_occupation_or_skills()
    {
        const string stored = """
            {
              "schemaVersion": 1,
              "identity": { "name": "Harvey Walters", "age": 25 },
              "creationMethod": "PointBuy",
              "assignedCharacteristics": { "STR": 60 },
              "ageDeductions": {},
              "rollRecords": [ { "purpose": "Luck", "dice": "3D6", "result": 11, "source": "PlayerEntered" } ]
            }
            """;

        var read = CharacterSheetJsonStorage.FromStorage(stored);

        Assert.Equal("Harvey Walters", read.Identity.Name);
        Assert.Equal(60, read.AssignedCharacteristics[Characteristic.Strength]);
        Assert.Equal([11], read.LuckRolls);
        Assert.Null(read.Occupation);
        Assert.Empty(read.SkillAllocations);
        Assert.Equal(QuickFireSkills.Empty, read.QuickFire);
    }

    [Fact]
    public void Given_a_schema_version_2_document_When_reading_it_Then_it_is_upgraded_without_an_extra_skill()
    {
        const string stored = """
            {
              "schemaVersion": 2,
              "identity": { "name": "Harvey Walters", "age": 25 },
              "creationMethod": "QuickFire",
              "assignedCharacteristics": {},
              "quickFire": { "values": [ { "skill": "Drive Auto", "specialization": null, "value": 40 } ], "personalInterests": [] }
            }
            """;

        var read = CharacterSheetJsonStorage.FromStorage(stored);

        Assert.Null(read.QuickFire.ExtraSkill);
        Assert.Equal(40, Assert.Single(read.QuickFire.Values).Value);
    }

    [Fact]
    public void Given_a_backstory_key_connection_custom_weapons_and_gear_When_storing_and_reading_the_sheet_Then_they_round_trip()
    {
        var sheet = new CharacterSheetBuilder()
            .WithBackstory(
                "Grew up above a bookshop.",
                new Dictionary<BackstoryEntry, string>
                {
                    [BackstoryEntry.SignificantPeople] = "My sister Ada",
                    [BackstoryEntry.Traits] = "Curious",
                })
            .WithKeyConnection(BackstoryEntry.SignificantPeople)
            .WithWeapons(new CustomWeapon(".38 Revolver", "Firearms (Handgun)", "1D10", "1 (3)", "15 yards", "6", "100"))
            .WithGear("Camera, notebook")
            .Build();

        var stored = CharacterSheetJsonStorage.ToStorage(sheet);

        Assert.Equal(sheet, CharacterSheetJsonStorage.FromStorage(stored));
        using var document = JsonDocument.Parse(stored);
        Assert.Equal("SignificantPeople", document.RootElement.GetProperty("keyConnection").GetString());
    }

    [Fact]
    public void Given_a_schema_version_3_document_When_reading_it_Then_it_is_upgraded_without_backstory_weapons_or_gear()
    {
        const string stored = """
            {
              "schemaVersion": 3,
              "identity": { "name": "Harvey Walters", "age": 25 },
              "creationMethod": "PointBuy",
              "assignedCharacteristics": { "STR": 60 }
            }
            """;

        var read = CharacterSheetJsonStorage.FromStorage(stored);

        Assert.Equal(BackstoryAndPossessions.Empty, read.BackstoryAndPossessions);
        Assert.Equal(60, read.AssignedCharacteristics[Characteristic.Strength]);
    }

    [Fact]
    public void Given_a_document_with_an_unknown_schema_version_When_reading_it_Then_it_fails_loudly()
    {
        const string stored = """{ "schemaVersion": 99, "identity": {}, "assignedCharacteristics": {} }""";

        var exception = Assert.Throws<InvalidOperationException>(() => CharacterSheetJsonStorage.FromStorage(stored));
        Assert.Contains("99", exception.Message);
    }
}
