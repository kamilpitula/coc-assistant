namespace CocAssistant.Api.Tests;

/// <summary>
/// Ingress forwarded headers (PBI-DEP-002 D4): the API trusts X-Forwarded-For and X-Forwarded-Proto from any proxy,
/// because the Container Apps ingress is its only path. Local requests carry no such headers, so behavior is unchanged.
/// </summary>
public class ForwardedHeadersTests
{
    [Fact]
    public async Task Given_the_composition_root_When_reading_forwarded_header_options_Then_both_ingress_headers_are_trusted_from_any_proxy()
    {
        await using var factory = new CompositionRootTestFactory();
        using var scope = factory.Services.CreateScope();
        var options = scope.ServiceProvider.GetRequiredService<IOptions<ForwardedHeadersOptions>>().Value;

        Assert.Equal(ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto, options.ForwardedHeaders);
        Assert.Empty(options.KnownIPNetworks);
        Assert.Empty(options.KnownProxies);
    }
}
