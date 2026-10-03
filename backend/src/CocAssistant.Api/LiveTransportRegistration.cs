namespace CocAssistant.Api;

/// <summary>
/// The live connection transport (specs/campaign-play/spec.md, Live connection contract; ADR 0009): SignalR always runs,
/// and Azure SignalR Service (Default mode) is added only when Azure:SignalR:ConnectionString is configured, so local
/// development and tests run in-process with no secrets.
/// </summary>
public static class LiveTransportRegistration
{
    public const string AzureSignalRConnectionStringKey = "Azure:SignalR:ConnectionString";

    /// <summary>Hub requests (negotiate and WebSockets) carry the bearer token in this query string parameter.</summary>
    public const string AccessTokenQueryParameter = "access_token";

    public const string HubPathPrefix = "/hubs";

    public static IServiceCollection AddLiveTransport(this IServiceCollection services, IConfiguration configuration)
    {
        var signalR = services.AddSignalR();
        var azureSignalRConnectionString = configuration[AzureSignalRConnectionStringKey];
        if (!string.IsNullOrWhiteSpace(azureSignalRConnectionString))
        {
            signalR.AddAzureSignalR(options => options.ConnectionString = azureSignalRConnectionString);
        }

        services
            .AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .PostConfigure(ReadAccessTokenQueryOnHubPaths);
        return services;
    }

    /// <summary>The access_token query value of a hub request; null for every other path, so APIs keep using headers.</summary>
    public static string? ReadHubAccessToken(HttpRequest request)
    {
        if (!request.Path.StartsWithSegments(HubPathPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var token = request.Query[AccessTokenQueryParameter].ToString();
        return string.IsNullOrEmpty(token) ? null : token;
    }

    // Wraps the handler Microsoft.Identity.Web configured instead of replacing it.
    private static void ReadAccessTokenQueryOnHubPaths(JwtBearerOptions options)
    {
        options.Events ??= new JwtBearerEvents();
        var previous = options.Events.OnMessageReceived;
        options.Events.OnMessageReceived = async context =>
        {
            await previous(context);
            context.Token ??= ReadHubAccessToken(context.Request);
        };
    }
}
