namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// A SignalR client of the Campaign hub that runs through the in-memory test server and authenticates with the
/// TestAuthHandler headers. Received messages are queued in arrival order so tests can await them without sleeping.
/// </summary>
public sealed class CampaignHubTestClient : IAsyncDisposable
{
    private static readonly TimeSpan ReceiveTimeout = TimeSpan.FromSeconds(10);

    private readonly Channel<object> _received = Channel.CreateUnbounded<object>();
    private readonly TaskCompletionSource<Exception?> _closed = new(TaskCreationOptions.RunContinuationsAsynchronously);

    private CampaignHubTestClient(HubConnection connection)
    {
        Connection = connection;
        Connection.On<PresenceChangedMessage>(nameof(ICampaignClient.PresenceChanged), message => _received.Writer.TryWrite(message));
        Connection.On<CampaignDataChangedMessage>(nameof(ICampaignClient.CampaignDataChanged), message => _received.Writer.TryWrite(message));
        Connection.Closed += exception =>
        {
            _closed.TrySetResult(exception);
            return Task.CompletedTask;
        };
    }

    public HubConnection Connection { get; }

    /// <summary>Completes when the server closes the connection.</summary>
    public Task<Exception?> Closed => _closed.Task;

    /// <summary>Builds a connection authenticated as the Account with the given oid; optionally its token expires at a time.</summary>
    public static CampaignHubTestClient Create(IdentityApiFactory factory, string oid, DateTimeOffset? expiresAt = null)
    {
        var server = factory.Server;
        var connection = new HubConnectionBuilder()
            .WithUrl(new Uri(server.BaseAddress, CampaignHub.Path.TrimStart('/')), options =>
            {
                options.Transports = HttpTransportType.LongPolling;
                options.HttpMessageHandlerFactory = _ => server.CreateHandler();
                options.Headers["X-Test-Oid"] = oid;
                options.Headers["X-Test-Name"] = DisplayNameFor(oid);
                options.Headers["X-Test-Email"] = $"{oid}@example.com";
                if (expiresAt is not null)
                {
                    options.Headers["X-Test-Expires-At"] = expiresAt.Value.ToString("O");
                }
            })
            .Build();
        return new CampaignHubTestClient(connection);
    }

    /// <summary>Builds a connection that carries no credentials.</summary>
    public static CampaignHubTestClient CreateUnauthenticated(IdentityApiFactory factory)
    {
        var server = factory.Server;
        var connection = new HubConnectionBuilder()
            .WithUrl(new Uri(server.BaseAddress, CampaignHub.Path.TrimStart('/')), options =>
            {
                options.Transports = HttpTransportType.LongPolling;
                options.HttpMessageHandlerFactory = _ => server.CreateHandler();
                options.Headers["X-Test-Unauthenticated"] = "true";
            })
            .Build();
        return new CampaignHubTestClient(connection);
    }

    /// <summary>Connects and subscribes to the Campaign, returning its Presence snapshot.</summary>
    public static async Task<(CampaignHubTestClient Client, PresenceSnapshotMessage Snapshot)> SubscribeAsync(
        IdentityApiFactory factory,
        string oid,
        Guid campaignId)
    {
        var client = Create(factory, oid);
        await client.Connection.StartAsync();
        var snapshot = await client.SubscribeToCampaignAsync(campaignId);
        return (client, snapshot);
    }

    public Task<PresenceSnapshotMessage> SubscribeToCampaignAsync(Guid campaignId) =>
        Connection.InvokeAsync<PresenceSnapshotMessage>(nameof(CampaignHub.SubscribeToCampaign), campaignId);

    /// <summary>The next message this client received, in arrival order.</summary>
    public async Task<object> NextMessageAsync()
    {
        using var timeout = new CancellationTokenSource(ReceiveTimeout);
        return await _received.Reader.ReadAsync(timeout.Token);
    }

    public async ValueTask DisposeAsync() => await Connection.DisposeAsync();
}
