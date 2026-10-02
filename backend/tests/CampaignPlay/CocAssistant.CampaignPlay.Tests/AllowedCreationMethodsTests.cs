namespace CocAssistant.CampaignPlay.Tests;

/// <summary>Creation Methods per docs/game-rules/project_ruleset.md section 2.</summary>
public class AllowedCreationMethodsTests
{
    [Fact]
    public void Given_the_default_When_reading_the_allowed_creation_methods_Then_all_three_are_allowed()
    {
        Assert.Equal(
            [CreationMethod.StandardRolling, CreationMethod.PointBuy, CreationMethod.QuickFire],
            AllowedCreationMethods.All.Methods);
    }

    [Fact]
    public void Given_methods_in_any_order_with_duplicates_When_creating_Then_each_method_appears_once_in_canonical_order()
    {
        var allowed = AllowedCreationMethods.Create(
            [CreationMethod.QuickFire, CreationMethod.StandardRolling, CreationMethod.QuickFire]);

        Assert.Equal([CreationMethod.StandardRolling, CreationMethod.QuickFire], allowed.Methods);
    }

    [Fact]
    public void Given_no_methods_When_creating_Then_it_is_rejected()
    {
        Assert.Throws<ArgumentException>(() => AllowedCreationMethods.Create([]));
    }

    [Fact]
    public void Given_an_undefined_method_When_creating_Then_it_is_rejected()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => AllowedCreationMethods.Create([(CreationMethod)42]));
    }

    [Fact]
    public void Given_the_same_methods_in_a_different_order_When_comparing_Then_they_are_equal()
    {
        var first = AllowedCreationMethods.Create([CreationMethod.PointBuy, CreationMethod.QuickFire]);
        var second = AllowedCreationMethods.Create([CreationMethod.QuickFire, CreationMethod.PointBuy]);

        Assert.Equal(first, second);
        Assert.Equal(first.GetHashCode(), second.GetHashCode());
        Assert.NotEqual(first, AllowedCreationMethods.All);
    }

    [Fact]
    public void Given_point_buy_only_When_checking_membership_Then_only_point_buy_is_allowed()
    {
        var allowed = AllowedCreationMethods.Create([CreationMethod.PointBuy]);

        Assert.True(allowed.Allows(CreationMethod.PointBuy));
        Assert.False(allowed.Allows(CreationMethod.QuickFire));
    }
}
