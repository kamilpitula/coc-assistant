namespace CocAssistant.GameRules.Tests;

public class DamageBonusNotationTests
{
    [Theory]
    [InlineData("0")]
    [InlineData("+1D4")]
    [InlineData("-1")]
    [InlineData("-2")]
    [InlineData("+2D6+1")]
    [InlineData("1D4")]
    [InlineData("  +1D4  ")]
    public void Given_valid_damage_bonus_When_parsed_Then_it_is_accepted(string text)
    {
        var parsed = DamageBonusNotation.TryParse(text, out var notation);

        Assert.True(parsed);
        Assert.NotNull(notation);
    }

    [Fact]
    public void Given_signed_text_When_parsed_Then_the_text_is_kept_trimmed_with_its_sign()
    {
        DamageBonusNotation.TryParse(" -1D4 ", out var notation);

        Assert.Equal("-1D4", notation!.Text);
        Assert.Equal(-1, notation.Sign);
        Assert.Equal("1D4", notation.Magnitude.Text);
    }

    [Theory]
    [InlineData("DB")]
    [InlineData("+DB")]
    [InlineData("+-1")]
    [InlineData("++1D4")]
    [InlineData("+")]
    [InlineData("")]
    [InlineData("1D")]
    [InlineData("+ 1D4")]
    public void Given_invalid_damage_bonus_When_parsed_Then_it_is_refused(string text)
    {
        var parsed = DamageBonusNotation.TryParse(text, out var notation);

        Assert.False(parsed);
        Assert.Null(notation);
    }

    [Fact]
    public void Given_null_text_When_parsed_Then_it_is_refused()
    {
        Assert.False(DamageBonusNotation.TryParse(null, out _));
    }
}
