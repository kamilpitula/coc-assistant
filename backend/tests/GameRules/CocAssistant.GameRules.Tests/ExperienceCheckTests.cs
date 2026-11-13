using CocAssistant.GameRules.Domain.Development;

namespace CocAssistant.GameRules.Tests;

public class ExperienceCheckTests
{
    [Fact]
    public void Given_a_success_with_no_bonus_die_When_checking_Then_a_check_is_earned_character_rules_section_161()
    {
        Assert.True(ExperienceCheck.EarnsExperienceCheck(isSuccess: true, bonusDice: 0, penaltyDice: 0, skillCanEarnCheck: true));
    }

    [Fact]
    public void Given_a_failure_When_checking_Then_no_check_is_earned_character_rules_section_161()
    {
        Assert.False(ExperienceCheck.EarnsExperienceCheck(isSuccess: false, bonusDice: 0, penaltyDice: 0, skillCanEarnCheck: true));
    }

    [Fact]
    public void Given_a_success_with_one_bonus_die_and_no_penalty_die_When_checking_Then_no_check_is_earned_character_rules_section_161()
    {
        Assert.False(ExperienceCheck.EarnsExperienceCheck(isSuccess: true, bonusDice: 1, penaltyDice: 0, skillCanEarnCheck: true));
    }

    [Fact]
    public void Given_a_success_with_one_bonus_and_one_penalty_die_When_checking_Then_a_check_is_earned_project_ruleset_section_49()
    {
        Assert.True(ExperienceCheck.EarnsExperienceCheck(isSuccess: true, bonusDice: 1, penaltyDice: 1, skillCanEarnCheck: true));
    }

    [Fact]
    public void Given_a_success_on_a_skill_that_cannot_earn_a_check_When_checking_Then_no_check_is_earned_character_rules_section_161()
    {
        Assert.False(ExperienceCheck.EarnsExperienceCheck(isSuccess: true, bonusDice: 0, penaltyDice: 0, skillCanEarnCheck: false));
    }
}
