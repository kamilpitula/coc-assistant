namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Creating and editing a Mythos Creature (specs/scenario-preparation/spec.md, Mythos Creature scenarios).</summary>
public class MythosCreatureTests
{
    [Fact]
    public void Given_a_name_When_creating_Then_the_Mythos_Creature_belongs_to_the_Campaign_with_an_empty_profile()
    {
        var creation = MythosCreature.Create(MonsterProfileSamples.CampaignId, "  Ghoul ", MonsterProfileSamples.Now);

        Assert.Empty(creation.Problems);
        var creature = Assert.IsType<MythosCreature>(creation.MythosCreature);
        Assert.Equal(("Ghoul", MonsterProfileSamples.CampaignId, MonsterProfileSamples.Now), (creature.Name, creature.CampaignId, creature.CreatedAt));
        Assert.NotEqual(Guid.Empty, creature.Id);
        Assert.Equal(MonsterProfile.Empty, creature.Profile);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Given_no_name_When_creating_Then_it_is_refused_on_name_and_nothing_is_created(string? name)
    {
        var creation = MythosCreature.Create(MonsterProfileSamples.CampaignId, name, MonsterProfileSamples.Now);

        Assert.Null(creation.MythosCreature);
        Assert.Equal([new MonsterProfileProblem("name", MonsterProfileProblemKind.NameRequired)], creation.Problems);
    }

    [Fact]
    public void Given_a_name_of_201_characters_When_creating_Then_it_is_refused_and_200_is_accepted()
    {
        var tooLong = MythosCreature.Create(MonsterProfileSamples.CampaignId, MonsterProfileSamples.LongText(201), MonsterProfileSamples.Now);
        var longest = MythosCreature.Create(MonsterProfileSamples.CampaignId, MonsterProfileSamples.LongText(200), MonsterProfileSamples.Now);

        Assert.Equal([new MonsterProfileProblem("name", MonsterProfileProblemKind.NameTooLong)], tooLong.Problems);
        Assert.Null(tooLong.MythosCreature);
        Assert.NotNull(longest.MythosCreature);
    }

    [Fact]
    public void Given_a_valid_profile_When_editing_Then_the_name_and_normalized_profile_replace_the_old_ones()
    {
        var creature = MonsterProfileSamples.MythosCreature();
        var profile = MonsterProfileSamples.Ghoul() with { Details = MonsterDetails.Empty with { CreatureKind = " mythos ", Origin = "  Crypts  " } };

        var problems = creature.Edit(" Ghoul Elder ", profile);

        Assert.Empty(problems);
        Assert.Equal("Ghoul Elder", creature.Name);
        Assert.Equal(("Mythos", "Crypts"), (creature.Profile.Details.CreatureKind, creature.Profile.Details.Origin));
        Assert.Equal(80, creature.Profile.Characteristics!.Values["STR"]);
    }

    [Fact]
    public void Given_an_invalid_profile_When_editing_Then_the_problems_are_returned_and_nothing_changes()
    {
        var creature = MonsterProfileSamples.MythosCreature();
        Assert.Empty(creature.Edit("Ghoul", MonsterProfileSamples.Ghoul()));
        var before = creature.Profile;

        var problems = creature.Edit("", MonsterProfileSamples.Ghoul() with { SanityLoss = new MonsterSanityLoss("1D6") });

        Assert.Equal(
            [
                new MonsterProfileProblem("name", MonsterProfileProblemKind.NameRequired),
                new MonsterProfileProblem("sanityLoss.value", MonsterProfileProblemKind.SanityLossMalformed),
            ],
            problems);
        Assert.Equal("Ghoul", creature.Name);
        Assert.Same(before, creature.Profile);
    }

    [Fact]
    public void Given_a_profile_without_sections_When_editing_Then_the_sections_stay_absent()
    {
        var creature = MonsterProfileSamples.MythosCreature();
        Assert.Empty(creature.Edit("Ghoul", MonsterProfileSamples.Ghoul()));

        Assert.Empty(creature.Edit("Ghoul", MonsterProfile.Empty));

        Assert.Equal(MonsterProfile.Empty, creature.Profile);
    }
}
