namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Azure Storage connection string for the Azure adapter contract tests (PBI-SP-007 D7). It comes from COC_AZURITE_CONNECTION
/// (e.g. a CI service container) and falls back to the local Azurite emulator on its default port.
/// </summary>
public static class AzuriteTestConnection
{
    public const string EnvironmentVariableName = "COC_AZURITE_CONNECTION";

    public const string LocalEmulator = "UseDevelopmentStorage=true";

    public static string Get() => Resolve(Environment.GetEnvironmentVariable(EnvironmentVariableName));

    public static string Resolve(string? configured) => string.IsNullOrWhiteSpace(configured) ? LocalEmulator : configured;
}
