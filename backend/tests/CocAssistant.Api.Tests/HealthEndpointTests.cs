namespace CocAssistant.Api.Tests;

/// <summary>
/// The anonymous liveness probe (PBI-DEP-002 D5): GET /health returns 200 without touching a database, so Container
/// Apps probes never wake a paused database.
/// </summary>
public class HealthEndpointTests
{
    private sealed class ThrowingContextsFactory : CompositionRootTestFactory
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IdentityDbContext>();
                services.RemoveAll<CampaignPlayDbContext>();
                services.RemoveAll<ScenarioPreparationDbContext>();
                services.AddScoped<IdentityDbContext>(_ => throw new InvalidOperationException("IdentityDbContext was resolved."));
                services.AddScoped<CampaignPlayDbContext>(_ => throw new InvalidOperationException("CampaignPlayDbContext was resolved."));
                services.AddScoped<ScenarioPreparationDbContext>(_ => throw new InvalidOperationException("ScenarioPreparationDbContext was resolved."));
            });
        }
    }

    [Fact]
    public async Task Given_no_credentials_When_getting_health_Then_it_returns_200()
    {
        await using var factory = new CompositionRootTestFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Given_throwing_context_factories_When_getting_health_Then_it_still_returns_200_without_resolving_a_context()
    {
        await using var factory = new ThrowingContextsFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
