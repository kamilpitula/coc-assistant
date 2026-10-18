namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>The copy of each NPC Profile problem (specs/scenario-preparation/ux.md section 25.4; ADR 0018).</summary>
public class NpcProfileProblemMessagesTests
{
    public static TheoryData<NpcProfileProblemKind> Kinds()
    {
        var kinds = new TheoryData<NpcProfileProblemKind>();
        foreach (var kind in Enum.GetValues<NpcProfileProblemKind>())
        {
            kinds.Add(kind);
        }

        return kinds;
    }

    [Theory]
    [MemberData(nameof(Kinds))]
    public void Given_any_problem_kind_When_its_message_is_found_Then_there_is_one(NpcProfileProblemKind kind)
    {
        var message = NpcProfileProblemMessages.For(new NpcProfileProblem("skills[0].name", kind, "Fighting"));

        Assert.False(string.IsNullOrWhiteSpace(message));
    }

    [Theory]
    [InlineData("details.goal", NpcProfileProblemKind.TextTooLong, "Goal must be 4,000 characters or fewer.")]
    [InlineData("details.knowledge", NpcProfileProblemKind.TextTooLong, "What the Human NPC knows must be 4,000 characters or fewer.")]
    [InlineData("skills[3].specialization", NpcProfileProblemKind.RowTextTooLong, "Specialization must be 1,000 characters or fewer.")]
    [InlineData("combat.weapons[0].range", NpcProfileProblemKind.RowTextTooLong, "Range must be 1,000 characters or fewer.")]
    [InlineData("characteristics.STR", NpcProfileProblemKind.CharacteristicOutOfRange, "Enter STR from 0 to 100.")]
    [InlineData("combat.weapons", NpcProfileProblemKind.TooManyRows, "Add at most 100 weapons.")]
    [InlineData("spells", NpcProfileProblemKind.TooManyRows, "Add at most 100 spells.")]
    [InlineData("combat.weapons[0].damage", NpcProfileProblemKind.DamageBonusOnFirearm, "Damage Bonus doesn't apply to firearms. Remove DB from the damage.")]
    [InlineData("age", NpcProfileProblemKind.AgeOutOfRange, "Enter an age from 0 to 150, in whole years.")]
    public void Given_a_problem_When_its_message_is_found_Then_it_names_the_field_and_limit(string path, NpcProfileProblemKind kind, string expected)
    {
        Assert.Equal(expected, NpcProfileProblemMessages.For(new NpcProfileProblem(path, kind)));
    }

    [Fact]
    public void Given_a_specialization_problem_When_its_message_is_found_Then_it_names_the_family()
    {
        var problem = new NpcProfileProblem("skills[0].specialization", NpcProfileProblemKind.SpecializationNotListed, "Firearms");

        Assert.Equal("Choose a Firearms specialization from the list.", NpcProfileProblemMessages.For(problem));
    }
}
