namespace CocAssistant.GameRules.Tests;

public class SanityLossNotationTests
{
    [Theory]
    [InlineData("0/1D6")]
    [InlineData("1/1D10")]
    [InlineData("1D4/1D8+1")]
    [InlineData("0/0")]
    [InlineData("  0/1D6  ")]
    public void Given_valid_sanity_loss_When_parsed_Then_it_is_accepted(string text)
    {
        var parsed = SanityLossNotation.TryParse(text, out var notation);

        Assert.True(parsed);
        Assert.NotNull(notation);
    }

    [Fact]
    public void Given_valid_sanity_loss_When_parsed_Then_each_side_is_kept_trimmed_at_the_ends()
    {
        SanityLossNotation.TryParse(" 1D4/1D8+1 ", out var notation);

        Assert.Equal("1D4/1D8+1", notation!.Text);
        Assert.Equal("1D4", notation.Success.Text);
        Assert.Equal("1D8+1", notation.Failure.Text);
    }

    [Theory]
    [InlineData("1D6")]
    [InlineData("0/")]
    [InlineData("/1D6")]
    [InlineData("0/1D6/1")]
    [InlineData("0/1D6+DB")]
    [InlineData("0 / 1D6")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("0/1D")]
    public void Given_invalid_sanity_loss_When_parsed_Then_it_is_refused(string text)
    {
        var parsed = SanityLossNotation.TryParse(text, out var notation);

        Assert.False(parsed);
        Assert.Null(notation);
    }

    [Fact]
    public void Given_null_text_When_parsed_Then_it_is_refused()
    {
        Assert.False(SanityLossNotation.TryParse(null, out _));
    }
}
