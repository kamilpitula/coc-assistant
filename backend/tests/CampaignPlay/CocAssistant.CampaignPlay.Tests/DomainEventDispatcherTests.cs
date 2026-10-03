namespace CocAssistant.CampaignPlay.Tests;

public class DomainEventDispatcherTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 3, 12, 0, 0, TimeSpan.Zero);

    private readonly DomainEventRecorder _recorder = new();
    private readonly RecordingLogger<ServiceProviderDomainEventDispatcher> _logger = new();

    private static PlayerJoinedCampaign PlayerJoined() =>
        new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Now);

    private ServiceProviderDomainEventDispatcher DispatcherWith(params Type[] handlerTypes)
    {
        var services = new ServiceCollection();
        services.AddSingleton(_recorder);
        foreach (var handlerType in handlerTypes)
        {
            services.AddScoped(typeof(IDomainEventHandler<PlayerJoinedCampaign>), handlerType);
        }

        return new ServiceProviderDomainEventDispatcher(services.BuildServiceProvider(), _logger);
    }

    [Fact]
    public async Task Given_a_registered_handler_When_an_event_is_dispatched_Then_the_handler_receives_it()
    {
        var dispatcher = DispatcherWith(typeof(RecordingDomainEventHandler<PlayerJoinedCampaign>));
        var playerJoined = PlayerJoined();

        await dispatcher.DispatchAsync([playerJoined], CancellationToken.None);

        Assert.Equal([playerJoined], _recorder.Handled);
    }

    [Fact]
    public async Task Given_no_registered_handler_When_an_event_is_dispatched_Then_nothing_happens()
    {
        var dispatcher = DispatcherWith();

        await dispatcher.DispatchAsync([PlayerJoined()], CancellationToken.None);

        Assert.Empty(_recorder.Handled);
        Assert.Empty(_logger.Entries);
    }

    [Fact]
    public async Task Given_a_throwing_handler_before_another_handler_When_an_event_is_dispatched_Then_the_failure_is_logged_and_the_other_handler_still_runs()
    {
        var dispatcher = DispatcherWith(
            typeof(ThrowingDomainEventHandler<PlayerJoinedCampaign>),
            typeof(RecordingDomainEventHandler<PlayerJoinedCampaign>));
        var playerJoined = PlayerJoined();

        await dispatcher.DispatchAsync([playerJoined], CancellationToken.None);

        Assert.Equal([playerJoined], _recorder.Handled);
        var entry = Assert.Single(_logger.Entries);
        Assert.Equal(LogLevel.Error, entry.Level);
        Assert.IsType<InvalidOperationException>(entry.Exception);
        Assert.Contains(nameof(PlayerJoinedCampaign), entry.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Given_a_throwing_handler_When_several_events_are_dispatched_Then_every_event_still_reaches_the_other_handlers()
    {
        var dispatcher = DispatcherWith(
            typeof(ThrowingDomainEventHandler<PlayerJoinedCampaign>),
            typeof(RecordingDomainEventHandler<PlayerJoinedCampaign>));
        var first = PlayerJoined();
        var second = PlayerJoined();

        await dispatcher.DispatchAsync([first, second], CancellationToken.None);

        Assert.Equal([first, second], _recorder.Handled);
        Assert.Equal(2, _logger.Entries.Count);
    }

    [Fact]
    public async Task Given_a_handler_that_cannot_be_created_When_an_event_is_dispatched_Then_the_failure_is_logged_and_dispatch_completes()
    {
        var dispatcher = DispatcherWith(typeof(UnconstructableDomainEventHandler<PlayerJoinedCampaign>));

        await dispatcher.DispatchAsync([PlayerJoined()], CancellationToken.None);

        var entry = Assert.Single(_logger.Entries);
        Assert.Equal(LogLevel.Error, entry.Level);
    }
}
