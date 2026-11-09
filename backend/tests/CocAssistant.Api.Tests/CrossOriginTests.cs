namespace CocAssistant.Api.Tests;

/// <summary>
/// The SPA-origin CORS policy (PBI-DEP-002 D3): one named policy from the Cors:AllowedOrigins array, attached to the
/// controllers and the Campaign hub only, with credentials. With no origins configured, no cross-origin request is allowed.
/// </summary>
public class CrossOriginTests
{
    private const string SpaOrigin = "https://spa.example";

    // The API reads Cors:AllowedOrigins eagerly when the host builds, so tests configure it the way the Container App
    // does: process environment variables (Cors__AllowedOrigins__N). WebApplicationFactory's ConfigureAppConfiguration
    // applies after Program's service registration, so an in-memory override would be read too late.
    private sealed class OriginsEnvironment : IDisposable
    {
        public OriginsEnvironment(params string?[] origins)
        {
            Clear();
            for (var index = 0; index < origins.Length; index++)
            {
                Environment.SetEnvironmentVariable($"Cors__AllowedOrigins__{index}", origins[index]);
            }
        }

        public void Dispose() => Clear();

        private static void Clear()
        {
            for (var index = 0; index < 8; index++)
            {
                Environment.SetEnvironmentVariable($"Cors__AllowedOrigins__{index}", null);
            }
        }
    }

    private static async Task<HttpResponseMessage> SendPreflightAsync(HttpClient client, string origin, string path, string method)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, path);
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", method);
        request.Headers.Add("Access-Control-Request-Headers", "authorization");
        return await client.SendAsync(request);
    }

    [Fact]
    public async Task Given_a_configured_origin_When_preflighting_an_api_route_Then_it_is_allowed_with_credentials()
    {
        using var _ = new OriginsEnvironment(SpaOrigin);
        await using var factory = new CompositionRootTestFactory();
        var client = factory.CreateClient();

        var response = await SendPreflightAsync(client, SpaOrigin, "/api/account/me", "GET");

        Assert.Equal(SpaOrigin, response.Headers.GetValues("Access-Control-Allow-Origin").Single());
        Assert.Equal("true", response.Headers.GetValues("Access-Control-Allow-Credentials").Single());
    }

    [Fact]
    public async Task Given_a_configured_origin_When_preflighting_the_hub_negotiate_Then_it_is_allowed_with_credentials()
    {
        using var _ = new OriginsEnvironment(SpaOrigin);
        await using var factory = new CompositionRootTestFactory();
        var client = factory.CreateClient();

        var response = await SendPreflightAsync(client, SpaOrigin, "/hubs/campaign/negotiate", "POST");

        Assert.Equal(SpaOrigin, response.Headers.GetValues("Access-Control-Allow-Origin").Single());
        Assert.Equal("true", response.Headers.GetValues("Access-Control-Allow-Credentials").Single());
    }

    [Fact]
    public async Task Given_a_configured_origin_When_preflighting_from_another_origin_Then_no_origin_is_allowed()
    {
        using var _ = new OriginsEnvironment(SpaOrigin);
        await using var factory = new CompositionRootTestFactory();
        var client = factory.CreateClient();

        var response = await SendPreflightAsync(client, "https://other.example", "/api/account/me", "GET");

        Assert.DoesNotContain("Access-Control-Allow-Origin", response.Headers.Select(header => header.Key));
    }

    [Fact]
    public async Task Given_no_configured_origins_When_preflighting_Then_no_origin_is_allowed()
    {
        using var _ = new OriginsEnvironment();
        await using var factory = new CompositionRootTestFactory();
        var client = factory.CreateClient();

        var response = await SendPreflightAsync(client, SpaOrigin, "/api/account/me", "GET");

        Assert.DoesNotContain("Access-Control-Allow-Origin", response.Headers.Select(header => header.Key));
    }

    [Fact]
    public void Given_origins_with_whitespace_and_a_trailing_slash_When_reading_Then_they_are_trimmed()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Cors:AllowedOrigins:0"] = "  https://spa.example/  ",
                ["Cors:AllowedOrigins:1"] = "https://other.example",
            })
            .Build();

        Assert.Equal(["https://spa.example", "https://other.example"], CrossOriginRegistration.ReadAllowedOrigins(configuration));
    }

    [Fact]
    public void Given_blank_origins_When_reading_Then_they_are_dropped()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Cors:AllowedOrigins:0"] = "   ",
                ["Cors:AllowedOrigins:1"] = "",
                ["Cors:AllowedOrigins:2"] = "https://spa.example",
            })
            .Build();

        Assert.Equal(["https://spa.example"], CrossOriginRegistration.ReadAllowedOrigins(configuration));
    }

    [Fact]
    public void Given_a_lone_slash_origin_When_reading_Then_it_is_dropped()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Cors:AllowedOrigins:0"] = "/",
                ["Cors:AllowedOrigins:1"] = "https://spa.example",
            })
            .Build();

        Assert.Equal(["https://spa.example"], CrossOriginRegistration.ReadAllowedOrigins(configuration));
    }

    [Fact]
    public void Given_no_origins_configured_When_reading_Then_the_list_is_empty()
    {
        var configuration = new ConfigurationBuilder().Build();

        Assert.Empty(CrossOriginRegistration.ReadAllowedOrigins(configuration));
    }
}
