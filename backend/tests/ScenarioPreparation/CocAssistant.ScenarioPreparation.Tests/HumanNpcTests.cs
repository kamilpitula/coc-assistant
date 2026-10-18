namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Creating and editing a Human NPC (specs/scenario-preparation/spec.md, Human NPC scenarios).</summary>
public class HumanNpcTests
{
    [Fact]
    public void Given_a_name_and_an_age_When_creating_Then_the_Human_NPC_belongs_to_the_Campaign_with_a_narrative_only_profile()
    {
        var creation = HumanNpc.Create(NpcProfileSamples.CampaignId, "  Mr. Knott ", 62, NpcProfileSamples.Now);

        Assert.Empty(creation.Problems);
        var human = Assert.IsType<HumanNpc>(creation.HumanNpc);
        Assert.Equal(("Mr. Knott", NpcProfileSamples.CampaignId, NpcProfileSamples.Now), (human.Name, human.CampaignId, human.CreatedAt));
        Assert.NotEqual(Guid.Empty, human.Id);
        Assert.Equal(62, human.Profile.Age);
        Assert.Null(human.Profile.Characteristics);
        Assert.Null(human.Profile.Skills);
        Assert.Null(human.Profile.Combat);
        Assert.Null(human.Profile.Spells);
        Assert.Null(human.Profile.KeeperNotes);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Given_no_name_When_creating_Then_it_is_refused_on_name_and_nothing_is_created(string? name)
    {
        var creation = HumanNpc.Create(NpcProfileSamples.CampaignId, name, 62, NpcProfileSamples.Now);

        Assert.Null(creation.HumanNpc);
        Assert.Equal([new NpcProfileProblem("name", NpcProfileProblemKind.NameRequired)], creation.Problems);
    }

    [Fact]
    public void Given_a_name_of_201_characters_When_creating_Then_it_is_refused_and_200_is_accepted()
    {
        var tooLong = HumanNpc.Create(NpcProfileSamples.CampaignId, NpcProfileSamples.LongText(201), 62, NpcProfileSamples.Now);
        var longest = HumanNpc.Create(NpcProfileSamples.CampaignId, NpcProfileSamples.LongText(200), 62, NpcProfileSamples.Now);

        Assert.Equal([new NpcProfileProblem("name", NpcProfileProblemKind.NameTooLong)], tooLong.Problems);
        Assert.NotNull(longest.HumanNpc);
    }

    [Fact]
    public void Given_no_age_When_creating_Then_it_is_refused_on_age()
    {
        var creation = HumanNpc.Create(NpcProfileSamples.CampaignId, "Mr. Knott", null, NpcProfileSamples.Now);

        Assert.Null(creation.HumanNpc);
        Assert.Equal([new NpcProfileProblem("age", NpcProfileProblemKind.AgeRequired)], creation.Problems);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(151)]
    public void Given_an_age_outside_0_to_150_When_creating_Then_it_is_refused(int age)
    {
        var creation = HumanNpc.Create(NpcProfileSamples.CampaignId, "Mr. Knott", age, NpcProfileSamples.Now);

        Assert.Equal([new NpcProfileProblem("age", NpcProfileProblemKind.AgeOutOfRange)], creation.Problems);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(150)]
    public void Given_an_age_at_the_edge_of_the_range_When_creating_Then_it_is_accepted(int age)
    {
        Assert.NotNull(HumanNpc.Create(NpcProfileSamples.CampaignId, "Mr. Knott", age, NpcProfileSamples.Now).HumanNpc);
    }

    [Fact]
    public void Given_a_name_and_an_age_both_missing_When_creating_Then_both_problems_are_reported()
    {
        var creation = HumanNpc.Create(NpcProfileSamples.CampaignId, null, null, NpcProfileSamples.Now);

        Assert.Equal(
            [
                new NpcProfileProblem("name", NpcProfileProblemKind.NameRequired),
                new NpcProfileProblem("age", NpcProfileProblemKind.AgeRequired),
            ],
            creation.Problems);
    }

    [Fact]
    public void Given_a_full_profile_When_editing_Then_the_name_and_whole_profile_are_replaced()
    {
        var human = NpcProfileSamples.HumanNpc();
        var profile = NpcProfileSamples.Thug() with
        {
            Skills = [NpcProfileSamples.Skill("Spot Hidden", 55), NpcProfileSamples.Skill("Firearms", 60, "Handgun")],
            Combat = NpcProfileSamples.Combat(NpcProfileSamples.Weapon()),
            Spells = [NpcProfileSamples.Spell()],
            KeeperNotes = NpcProfileSamples.ValidKeeperNotes,
        };

        var problems = human.Edit("  Mr. Knott, Landlord ", profile, NpcProfileSamples.Specializations);

        Assert.Empty(problems);
        Assert.Equal("Mr. Knott, Landlord", human.Name);
        Assert.Equal(30, human.Profile.Age);
        Assert.Equal(70, human.Profile.Characteristics!.Values["STR"]);
        Assert.Equal(2, human.Profile.Skills!.Count);
        Assert.Single(human.Profile.Combat!.Weapons);
        Assert.Single(human.Profile.Spells!);
        Assert.Equal(NpcProfileSamples.ValidKeeperNotes, human.Profile.KeeperNotes);
    }

    [Fact]
    public void Given_a_refused_edit_When_editing_Then_the_name_and_profile_are_unchanged()
    {
        var human = NpcProfileSamples.HumanNpc();
        var before = human.Profile;

        var problems = human.Edit(string.Empty, NpcProfileSamples.Narrative(200), NpcProfileSamples.Specializations);

        Assert.NotEmpty(problems);
        Assert.Equal("Mr. Knott", human.Name);
        Assert.Same(before, human.Profile);
    }

    [Fact]
    public void Given_an_empty_added_section_When_editing_Then_the_section_is_kept_empty()
    {
        var human = NpcProfileSamples.HumanNpc();

        human.Edit("Mr. Knott", NpcProfileSamples.Narrative() with { Skills = [], Spells = [], Combat = NpcProfileSamples.Combat() }, NpcProfileSamples.Specializations);

        Assert.Empty(human.Profile.Skills!);
        Assert.Empty(human.Profile.Spells!);
        Assert.Empty(human.Profile.Combat!.Weapons);
    }

    [Fact]
    public void Given_details_with_surrounding_whitespace_When_editing_Then_they_are_trimmed_and_blank_ones_are_dropped()
    {
        var human = NpcProfileSamples.HumanNpc();
        var details = NpcDetails.Empty with { ProfessionOrRole = "  Landlord ", Goal = "   " };

        human.Edit("Mr. Knott", NpcProfileSamples.Narrative() with { Details = details }, NpcProfileSamples.Specializations);

        Assert.Equal("Landlord", human.Profile.Details.ProfessionOrRole);
        Assert.Null(human.Profile.Details.Goal);
    }

    [Fact]
    public void Given_characteristics_When_editing_Then_all_eight_codes_are_stored_in_rule_order()
    {
        var human = NpcProfileSamples.HumanNpc();

        human.Edit("Mr. Knott", NpcProfileSamples.Narrative() with { Characteristics = NpcProfileSamples.Characteristics(("EDU", 80), ("STR", 60)) }, NpcProfileSamples.Specializations);

        Assert.Equal(["STR", "CON", "DEX", "APP", "POW", "SIZ", "INT", "EDU"], human.Profile.Characteristics!.Values.Keys);
        Assert.Equal((60, 80, (int?)null), (human.Profile.Characteristics.Values["STR"], human.Profile.Characteristics.Values["EDU"], human.Profile.Characteristics.Values["CON"]));
    }
}
