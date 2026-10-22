namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Which storage adapter the configuration selects (PBI-SP-007 D7): Azure, a local directory, or a loud failure.</summary>
public class HandoutFileStoreRegistrationTests
{
    private const string AzureKey = "Azure:Storage:ConnectionString";
    private const string DirectoryKey = "HandoutFiles:LocalDirectory";

    private static IConfiguration Configuration(params (string Key, string? Value)[] values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values.ToDictionary(pair => pair.Key, pair => pair.Value)).Build();

    private static IHandoutFileStore Resolve(IConfiguration configuration)
    {
        var services = new ServiceCollection();
        services.AddSingleton(configuration);
        services.AddScenarioPreparationInfrastructure(configuration);
        return services.BuildServiceProvider().GetRequiredService<IHandoutFileStore>();
    }

    [Fact]
    public void Given_a_local_directory_When_resolving_the_store_Then_the_filesystem_adapter_is_used()
    {
        var store = Resolve(Configuration((DirectoryKey, Path.Combine(Path.GetTempPath(), "coc-registration"))));

        Assert.IsType<FileSystemHandoutFileStore>(store);
    }

    [Fact]
    public void Given_an_azure_connection_string_When_resolving_the_store_Then_the_azure_adapter_is_used_even_with_a_directory()
    {
        var store = Resolve(Configuration((AzureKey, "UseDevelopmentStorage=true"), (DirectoryKey, "ignored")));

        Assert.IsType<AzureBlobHandoutFileStore>(store);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Given_neither_key_When_resolving_the_store_Then_it_fails_and_names_both_keys(string? blank)
    {
        var configuration = Configuration((AzureKey, blank), (DirectoryKey, blank));

        var exception = Assert.Throws<InvalidOperationException>(() => Resolve(configuration));

        Assert.Contains(AzureKey, exception.Message);
        Assert.Contains(DirectoryKey, exception.Message);
    }

    [Fact]
    public void Given_neither_key_When_registering_the_services_Then_nothing_fails_until_the_store_is_resolved()
    {
        var services = new ServiceCollection();

        var registration = Record.Exception(() => services.AddScenarioPreparationInfrastructure(Configuration()));

        Assert.Null(registration);
    }
}
