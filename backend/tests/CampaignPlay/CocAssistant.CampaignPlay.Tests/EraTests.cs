namespace CocAssistant.CampaignPlay.Tests;

/// <summary>Supported Eras per docs/game-rules/project_ruleset.md section 1.</summary>
public class EraTests
{
    [Fact]
    public void Given_the_1920s_code_When_parsing_an_era_Then_the_1920s_era_is_returned()
    {
        var parsed = Era.TryParse("1920s", out var era);

        Assert.True(parsed);
        Assert.Equal(Era.The1920s, era);
        Assert.Equal("1920s", era!.Code);
    }

    [Theory]
    [InlineData("1890s")]
    [InlineData("Modern")]
    [InlineData("1920S")]
    [InlineData("")]
    [InlineData(null)]
    public void Given_an_unsupported_code_When_parsing_an_era_Then_it_is_rejected(string? code)
    {
        var parsed = Era.TryParse(code, out var era);

        Assert.False(parsed);
        Assert.Null(era);
    }

    [Fact]
    public void Given_the_supported_eras_When_listing_them_Then_only_the_1920s_is_offered()
    {
        Assert.Equal([Era.The1920s], Era.Supported);
    }
}
