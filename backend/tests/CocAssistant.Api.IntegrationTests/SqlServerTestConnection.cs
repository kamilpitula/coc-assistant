namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// Builds SQL Server connection strings for integration tests. The server comes from COC_SQLSERVER_CONNECTION
/// (e.g. a CI service container) and falls back to LocalDB; each caller supplies its own database name.
/// </summary>
public static class SqlServerTestConnection
{
    public const string EnvironmentVariableName = "COC_SQLSERVER_CONNECTION";

    private const string LocalDbServer = @"Server=(localdb)\mssqllocaldb;Trusted_Connection=True";

    public static string ForDatabase(string databaseName) =>
        Build(Environment.GetEnvironmentVariable(EnvironmentVariableName), databaseName);

    public static string Build(string? configuredServer, string databaseName)
    {
        var server = string.IsNullOrWhiteSpace(configuredServer) ? LocalDbServer : configuredServer;
        var builder = new SqlConnectionStringBuilder(server)
        {
            InitialCatalog = databaseName,
            MultipleActiveResultSets = true,
        };
        return builder.ConnectionString;
    }
}
