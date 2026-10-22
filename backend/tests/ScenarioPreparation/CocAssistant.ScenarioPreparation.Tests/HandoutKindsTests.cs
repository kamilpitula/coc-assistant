namespace CocAssistant.ScenarioPreparation.Tests;

public class HandoutKindsTests
{
    [Theory]
    [InlineData(HandoutKind.ReadAloud, HandoutKindFamily.RichText)]
    [InlineData(HandoutKind.Text, HandoutKindFamily.RichText)]
    [InlineData(HandoutKind.Image, HandoutKindFamily.Picture)]
    [InlineData(HandoutKind.Map, HandoutKindFamily.Picture)]
    [InlineData(HandoutKind.Document, HandoutKindFamily.Document)]
    public void Given_a_kind_When_asking_for_its_family_Then_the_family_is_returned(HandoutKind kind, HandoutKindFamily family)
    {
        Assert.Equal(family, HandoutKinds.FamilyOf(kind));
        Assert.Equal(family != HandoutKindFamily.RichText, HandoutKinds.IsFile(kind));
    }

    [Theory]
    [InlineData(HandoutKind.Image, "image/png", true)]
    [InlineData(HandoutKind.Image, "image/jpeg", true)]
    [InlineData(HandoutKind.Map, "image/webp", true)]
    [InlineData(HandoutKind.Map, "image/gif", true)]
    [InlineData(HandoutKind.Image, "application/pdf", false)]
    [InlineData(HandoutKind.Image, "image/svg+xml", false)]
    [InlineData(HandoutKind.Document, "application/pdf", true)]
    [InlineData(HandoutKind.Document, "image/png", false)]
    [InlineData(HandoutKind.Text, "image/png", false)]
    public void Given_a_kind_and_a_media_type_When_checking_Then_only_the_kinds_own_types_are_allowed(HandoutKind kind, string mediaType, bool allowed) =>
        Assert.Equal(allowed, HandoutKinds.AllowsMediaType(kind, mediaType));
}
