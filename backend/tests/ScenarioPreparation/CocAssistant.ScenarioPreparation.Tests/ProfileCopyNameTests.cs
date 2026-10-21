namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>The name of a duplicated profile (specs/scenario-preparation/spec.md, Constraints, Duplicate).</summary>
public class ProfileCopyNameTests
{
    [Fact]
    public void Given_a_short_name_When_naming_the_copy_Then_the_suffix_is_appended()
    {
        Assert.Equal("Ghoul (copy)", ProfileCopyName.For("Ghoul"));
    }

    [Fact]
    public void Given_a_name_of_193_characters_When_naming_the_copy_Then_the_name_stays_whole_and_the_result_is_200()
    {
        var name = new string('a', 193);

        var copy = ProfileCopyName.For(name);

        Assert.Equal(name + " (copy)", copy);
        Assert.Equal(ProfileLimits.NameMaxLength, copy.Length);
    }

    [Theory]
    [InlineData(194)]
    [InlineData(200)]
    public void Given_a_name_longer_than_193_characters_When_naming_the_copy_Then_the_name_is_cut_to_193_and_the_suffix_stays(int length)
    {
        var copy = ProfileCopyName.For(new string('a', length));

        Assert.Equal(new string('a', 193) + " (copy)", copy);
    }

    [Fact]
    public void Given_a_cut_that_ends_on_a_space_When_naming_the_copy_Then_there_is_no_double_space()
    {
        var name = new string('a', 192) + " bcd";

        Assert.Equal(new string('a', 192) + " (copy)", ProfileCopyName.For(name));
    }

    [Fact]
    public void Given_a_surrogate_pair_at_the_cut_When_naming_the_copy_Then_the_pair_is_not_split()
    {
        var name = new string('a', 192) + "\U0001F480" + "bc";

        var copy = ProfileCopyName.For(name);

        Assert.Equal(new string('a', 192) + " (copy)", copy);
    }
}
