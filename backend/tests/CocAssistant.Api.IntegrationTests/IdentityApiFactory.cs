namespace CocAssistant.Api.IntegrationTests;

/// <summary>Runs the real Api pipeline against a dedicated LocalDB database, swapping real JWT validation for TestAuthHandler.</summary>
public class IdentityApiFactory : WebApplicationFactory<Program>
{
    public const string ConnectionString =
        "Server=(localdb)\\mssqllocaldb;Database=CocAssistantIdentityTests;Trusted_Connection=True;MultipleActiveResultSets=true";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:IdentityDb"] = ConnectionString,
                ["ConnectionStrings:CampaignPlayDb"] = ConnectionString,
            });
        });

        builder.ConfigureServices(services =>
        {
            services
                .AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });

            services.Configure<AuthenticationOptions>(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                options.DefaultScheme = TestAuthHandler.SchemeName;
            });
        });
    }

    public async Task EnsureDatabaseCreatedAsync()
    {
        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        await dbContext.Database.MigrateAsync();

        var campaignPlayDbContext = scope.ServiceProvider.GetRequiredService<CampaignPlayDbContext>();
        await campaignPlayDbContext.Database.MigrateAsync();
    }
}
