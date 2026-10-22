namespace CocAssistant.Api.IntegrationTests;

/// <summary>Runs the real Api pipeline against a dedicated SQL Server database (LocalDB by default), swapping real JWT validation for TestAuthHandler.</summary>
public class IdentityApiFactory : WebApplicationFactory<Program>
{
    public static readonly string ConnectionString = SqlServerTestConnection.ForDatabase("CocAssistantIdentityTests");

    /// <summary>Where this factory's Handout files go: a private temporary directory, so no run needs Azure Storage.</summary>
    public string HandoutFilesDirectory { get; } = Path.Combine(Path.GetTempPath(), "coc-handout-files-" + Guid.NewGuid().ToString("N"));

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:IdentityDb"] = ConnectionString,
                ["ConnectionStrings:CampaignPlayDb"] = ConnectionString,
                ["ConnectionStrings:ScenarioPreparationDb"] = ConnectionString,
                ["HandoutFiles:LocalDirectory"] = HandoutFilesDirectory,
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

        var scenarioPreparationDbContext = scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>();
        await scenarioPreparationDbContext.Database.MigrateAsync();
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing && Directory.Exists(HandoutFilesDirectory))
        {
            Directory.Delete(HandoutFilesDirectory, recursive: true);
        }
    }
}
