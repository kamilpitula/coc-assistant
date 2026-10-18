namespace CocAssistant.GameRules.Tests;

public class DiceNotationTests
{
    [Theory]
    [InlineData("1D6+1D4+DB")]
    [InlineData("2D6-1")]
    [InlineData("d6")]
    [InlineData("D100")]
    [InlineData("1d10")]
    [InlineData("0")]
    [InlineData("3")]
    [InlineData("  1D6  ")]
    public void Given_valid_notation_When_parsed_Then_it_is_accepted(string text)
    {
        var parsed = DiceNotation.TryParse(text, DamageBonusUse.Allowed, out var notation);

        Assert.True(parsed);
        Assert.NotNull(notation);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("D")]
    [InlineData("1D")]
    [InlineData("0D6")]
    [InlineData("1D0")]
    [InlineData("1D6 + 2")]
    [InlineData("1 D6")]
    [InlineData("++1")]
    [InlineData("1D6+")]
    [InlineData("-1")]
    [InlineData("1D6+D")]
    [InlineData("DBB")]
    [InlineData("2DB")]
    [InlineData("99999999999")]
    [InlineData("1D6/1D4")]
    public void Given_invalid_notation_When_parsed_Then_it_is_refused(string text)
    {
        var parsed = DiceNotation.TryParse(text, DamageBonusUse.Allowed, out var notation);

        Assert.False(parsed);
        Assert.Null(notation);
    }

    [Fact]
    public void Given_null_text_When_parsed_Then_it_is_refused()
    {
        Assert.False(DiceNotation.TryParse(null, DamageBonusUse.Allowed, out _));
    }

    [Fact]
    public void Given_damage_bonus_where_allowed_When_parsed_Then_it_reports_the_damage_bonus()
    {
        DiceNotation.TryParse("1D6+DB", DamageBonusUse.Allowed, out var notation);

        Assert.True(notation!.IncludesDamageBonus);
    }

    [Fact]
    public void Given_no_damage_bonus_When_parsed_Then_it_reports_none()
    {
        DiceNotation.TryParse("1D6+2", DamageBonusUse.Allowed, out var notation);

        Assert.False(notation!.IncludesDamageBonus);
    }

    [Theory]
    [InlineData("DB")]
    [InlineData("1D10+DB")]
    [InlineData("1d3+db")]
    public void Given_damage_bonus_where_refused_When_parsed_Then_it_is_refused(string text)
    {
        Assert.False(DiceNotation.TryParse(text, DamageBonusUse.Refused, out _));
    }

    [Fact]
    public void Given_notation_with_spaces_at_the_ends_When_parsed_Then_the_text_is_trimmed()
    {
        DiceNotation.TryParse("  2D6-1 ", DamageBonusUse.Allowed, out var notation);

        Assert.Equal("2D6-1", notation!.Text);
    }

    [Fact]
    public void Given_mixed_terms_When_parsed_Then_the_terms_keep_order_and_sign()
    {
        DiceNotation.TryParse("2D6-1+DB", DamageBonusUse.Allowed, out var notation);

        Assert.Equal(
            [
                new DiceNotationTerm(DiceNotationTermKind.Dice, 1, 2, 6),
                new DiceNotationTerm(DiceNotationTermKind.Constant, -1, 1, 0),
                new DiceNotationTerm(DiceNotationTermKind.DamageBonus, 1, 0, 0),
            ],
            notation!.Terms);
    }
}
