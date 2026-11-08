namespace CocAssistant.Api.Tests;

public class CharacterSheetRequestRulesTests
{
    private static CocAssistant.CampaignPlay.Controllers.CharacterSheetRequest Body(
        string? creationMethod,
        Dictionary<string, int?>? characteristicRolls) =>
        new(
            new CocAssistant.CampaignPlay.Controllers.IdentityRequest("Harvey Walters", 25, null, null, null),
            creationMethod,
            null,
            null,
            null,
            characteristicRolls);

    [Theory]
    [InlineData("StandardRolling")]
    [InlineData("PointBuy")]
    [InlineData("QuickFire")]
    public void Given_characteristic_roll_values_When_validating_Then_they_are_rejected_under_every_method(string creationMethod)
    {
        var problems = CocAssistant.CampaignPlay.Controllers.CharacterSheetRequestRules.Problems(
            Body(creationMethod, new Dictionary<string, int?> { ["STR"] = 10 }));

        Assert.Contains(problems, problem => problem.Contains("characteristicRolls"));
    }

    [Fact]
    public void Given_no_characteristic_roll_values_When_validating_Then_there_is_no_roll_problem()
    {
        var problems = CocAssistant.CampaignPlay.Controllers.CharacterSheetRequestRules.Problems(Body("StandardRolling", null));

        Assert.DoesNotContain(problems, problem => problem.Contains("characteristicRolls"));
    }
}
