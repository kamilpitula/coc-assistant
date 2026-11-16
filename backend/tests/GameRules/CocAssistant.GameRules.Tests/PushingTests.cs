using CocAssistant.GameRules.Domain.Dice;

namespace CocAssistant.GameRules.Tests;

public class PushingTests
{
    [Fact]
    public void Given_a_success_When_checking_Then_it_cannot_be_pushed_skill_rolls_section_6()
    {
        Assert.False(Pushing.CanPush(isSuccess: true, hasBeenPushed: false, isSkillOrCharacteristicRoll: true));
    }

    [Fact]
    public void Given_a_failure_When_checking_Then_it_can_be_pushed_skill_rolls_section_6()
    {
        Assert.True(Pushing.CanPush(isSuccess: false, hasBeenPushed: false, isSkillOrCharacteristicRoll: true));
    }

    [Fact]
    public void Given_a_roll_that_was_pushed_When_checking_Then_it_cannot_be_pushed_again_project_ruleset_section_410()
    {
        Assert.False(Pushing.CanPush(isSuccess: false, hasBeenPushed: true, isSkillOrCharacteristicRoll: true));
    }

    [Fact]
    public void Given_a_roll_that_is_not_a_skill_or_characteristic_roll_When_checking_Then_it_cannot_be_pushed_skill_rolls_section_6()
    {
        Assert.False(Pushing.CanPush(isSuccess: false, hasBeenPushed: false, isSkillOrCharacteristicRoll: false));
    }
}
