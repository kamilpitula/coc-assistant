namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Media types are decided by the leading bytes only (specs/scenario-preparation/spec.md, File storage).</summary>
public class HandoutMediaTypesTests
{
    [Fact]
    public void Given_the_leading_bytes_of_each_allowed_type_When_detecting_Then_that_media_type_is_returned()
    {
        Assert.Equal("image/png", HandoutMediaTypes.Detect(HandoutFileSamples.Png()));
        Assert.Equal("image/jpeg", HandoutMediaTypes.Detect(HandoutFileSamples.Jpeg()));
        Assert.Equal("image/gif", HandoutMediaTypes.Detect(HandoutFileSamples.Gif()));
        Assert.Equal("image/gif", HandoutMediaTypes.Detect("GIF87a"u8));
        Assert.Equal("image/webp", HandoutMediaTypes.Detect(HandoutFileSamples.WebP()));
        Assert.Equal("application/pdf", HandoutMediaTypes.Detect(HandoutFileSamples.Pdf()));
    }

    [Fact]
    public void Given_svg_empty_or_unknown_bytes_When_detecting_Then_nothing_is_detected()
    {
        Assert.Null(HandoutMediaTypes.Detect(HandoutFileSamples.Svg()));
        Assert.Null(HandoutMediaTypes.Detect([]));
        Assert.Null(HandoutMediaTypes.Detect("hello world"u8));
        Assert.Null(HandoutMediaTypes.Detect("RIFF\0\0\0\0WAVE"u8));
        Assert.Null(HandoutMediaTypes.Detect([0x89, 0x50, 0x4E]));
    }

    [Fact]
    public void Given_a_html_file_named_like_an_image_When_detecting_Then_only_the_bytes_count()
    {
        Assert.Null(HandoutMediaTypes.Detect("<html><script>alert(1)</script></html>"u8));
    }
}
