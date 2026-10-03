namespace CocAssistant.Api.Tests;

/// <summary>
/// The composition root's live connection setup (specs/campaign-play/spec.md, Live connection contract; ADR 0009):
/// the access_token query string authenticates only hub requests, and Azure SignalR Service is used only when configured.
/// </summary>
public class LiveConnectionRegistrationTests
{
    private static async Task<string?> ReadBearerTokenAsync(string pathAndQuery)
    {
        await using var factory = new WebApplicationFactory<Program>();
        var options = factory.Services
            .GetRequiredService<IOptionsMonitor<JwtBearerOptions>>()
            .Get(JwtBearerDefaults.AuthenticationScheme);
        var httpContext = new DefaultHttpContext();
        var uri = new Uri($"https://localhost{pathAndQuery}");
        httpContext.Request.Path = uri.AbsolutePath;
        httpContext.Request.QueryString = new QueryString(uri.Query);
        var context = new MessageReceivedContext(
            httpContext,
            new AuthenticationScheme(JwtBearerDefaults.AuthenticationScheme, null, typeof(JwtBearerHandler)),
            options);

        await options.Events.MessageReceived(context);
        return context.Token;
    }

    [Fact]
    public async Task Given_a_hub_request_with_an_access_token_query_When_reading_the_bearer_token_Then_the_query_token_is_used()
    {
        Assert.Equal("hub-token", await ReadBearerTokenAsync("/hubs/campaign?access_token=hub-token"));
    }

    [Fact]
    public async Task Given_a_hub_negotiate_request_with_an_access_token_query_When_reading_the_bearer_token_Then_the_query_token_is_used()
    {
        Assert.Equal("hub-token", await ReadBearerTokenAsync("/hubs/campaign/negotiate?negotiateVersion=1&access_token=hub-token"));
    }

    [Fact]
    public async Task Given_an_api_request_with_an_access_token_query_When_reading_the_bearer_token_Then_the_query_is_ignored()
    {
        Assert.Null(await ReadBearerTokenAsync("/api/campaigns?access_token=api-token"));
    }

    [Fact]
    public void Given_no_azure_signalr_connection_string_When_adding_the_live_transport_Then_signalr_runs_in_process()
    {
        var services = new ServiceCollection();

        services.AddLiveTransport(new ConfigurationBuilder().Build());

        Assert.Contains(services, descriptor => descriptor.ServiceType.Assembly == typeof(HubLifetimeManager<>).Assembly);
        Assert.DoesNotContain(services, IsAzureSignalRService);
    }

    [Fact]
    public void Given_an_azure_signalr_connection_string_When_adding_the_live_transport_Then_azure_signalr_service_is_added()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Azure:SignalR:ConnectionString"] = "Endpoint=https://example.service.signalr.net;AccessKey=not-a-secret;Version=1.0;",
            })
            .Build();

        services.AddLiveTransport(configuration);

        Assert.Contains(services, IsAzureSignalRService);
    }

    private static bool IsAzureSignalRService(ServiceDescriptor descriptor) =>
        descriptor.ServiceType.Assembly.GetName().Name == "Microsoft.Azure.SignalR"
        || descriptor.ImplementationType?.Assembly.GetName().Name == "Microsoft.Azure.SignalR";
}
