namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The assembled Api with test domain event handlers registered: a throwing handler ahead of a
/// recording one, so tests observe dispatch, failure isolation, and logging (ADR 0011).
/// </summary>
public class DomainEventApiFactory : IdentityApiFactory
{
    public DomainEventRecorder Recorder { get; } = new();

    public RecordingLoggerProvider Logs { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);

        builder.ConfigureServices(services =>
        {
            services.AddSingleton(Recorder);
            services.AddScoped<IDomainEventHandler<PlayerJoinedCampaign>, ThrowingDomainEventHandler<PlayerJoinedCampaign>>();
            services.AddScoped<IDomainEventHandler<PlayerJoinedCampaign>, RecordingDomainEventHandler<PlayerJoinedCampaign>>();
            services.AddSingleton<ILoggerProvider>(Logs);
        });
    }
}
