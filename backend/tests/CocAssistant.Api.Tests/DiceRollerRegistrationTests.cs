namespace CocAssistant.Api.Tests;

public class DiceRollerRegistrationTests
{
    [Fact]
    public void Given_the_composition_root_When_started_Then_exactly_one_IDiceRoller_is_registered_and_it_is_secure()
    {
        using var factory = new CompositionRootTestFactory();
        using var scope = factory.Services.CreateScope();

        var rollers = scope.ServiceProvider.GetServices<CocAssistant.GameRules.Domain.Dice.IDiceRoller>().ToList();

        var single = Assert.Single(rollers);
        Assert.IsType<CocAssistant.GameRules.Domain.Dice.SecureDiceRoller>(single);
    }
}
