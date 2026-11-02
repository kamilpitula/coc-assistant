namespace CocAssistant.Api.Tests;

/// <summary>
/// Boots the composition root without touching a database or an identity provider: the Testing environment skips
/// the Development-only MigrateAsync block in Program.cs, so the configured connection strings are never opened.
/// The in-memory EntraId values below only replace the non-parsable placeholders from appsettings.json so the
/// JwtBearer options can build; no real authority is ever contacted.
/// </summary>
public class CompositionRootTestFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["EntraId:Instance"] = "https://localhost/",
                ["EntraId:TenantId"] = "test-tenant",
                ["EntraId:ClientId"] = "test-client",
            }));
    }
}
