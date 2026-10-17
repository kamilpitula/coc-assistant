namespace CocAssistant.GameRules.Tests;

/// <summary>docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md section 3.4.</summary>
public class InvestigatorDifficultiesTests
{
    [Theory]
    [InlineData(0, InvestigatorDifficulty.Regular)]
    [InlineData(49, InvestigatorDifficulty.Regular)]
    [InlineData(50, InvestigatorDifficulty.Hard)]
    [InlineData(89, InvestigatorDifficulty.Hard)]
    [InlineData(90, InvestigatorDifficulty.Extreme)]
    [InlineData(100, InvestigatorDifficulty.Extreme)]
    public void Given_an_opposing_value_When_the_difficulty_is_found_Then_it_follows_the_thresholds(int value, InvestigatorDifficulty expected)
    {
        Assert.Equal(expected, InvestigatorDifficulties.ForOpposingValue(value));
    }
}
