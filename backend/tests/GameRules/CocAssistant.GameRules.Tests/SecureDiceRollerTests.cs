namespace CocAssistant.GameRules.Tests;

public class SecureDiceRollerTests
{
    [Theory]
    [InlineData(6)]
    [InlineData(10)]
    [InlineData(100)]
    public void Given_secure_roller_When_rolling_many_times_Then_every_face_is_in_range(int sides)
    {
        var roller = new SecureDiceRoller();

        for (var index = 0; index < 200; index++)
        {
            var face = roller.Roll(sides);
            Assert.InRange(face, 1, sides);
        }
    }

    [Fact]
    public void Given_zero_sides_When_rolling_Then_it_throws()
    {
        var roller = new SecureDiceRoller();

        Assert.Throws<ArgumentOutOfRangeException>(() => roller.Roll(0));
    }
}
