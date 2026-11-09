namespace CocAssistant.Api;

/// <summary>
/// The transient-failure retry every DbContext uses in Azure hosting (ADR 0031 amendment, PBI-DEP-002 D1): eight
/// retries with a 15-second maximum delay wait at least about 71 seconds in total, covering a paused free-offer
/// database resume inside the Container Apps ingress timeout. Local development and E2E keep SQL Server too, so the
/// same window applies there; EF design-time tooling never opens a connection through these options.
/// </summary>
public static class DatabaseRetryPolicy
{
    public const int MaxRetryCount = 8;

    public static readonly TimeSpan MaxRetryDelay = TimeSpan.FromSeconds(15);

    /// <summary>Applies the shared retry to a SQL Server options builder.</summary>
    public static void Apply(SqlServerDbContextOptionsBuilder sql) =>
        sql.EnableRetryOnFailure(MaxRetryCount, MaxRetryDelay, errorNumbersToAdd: null);
}
