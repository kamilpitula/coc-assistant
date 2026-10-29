namespace CocAssistant.ScenePlay.Tests;

/// <summary>In-memory roles by (Campaign, Account).</summary>
public sealed class FakeCampaignRoles : ICampaignRoles
{
    private readonly Dictionary<(Guid, Guid), CampaignMemberRole> _roles = [];

    public FakeCampaignRoles With(Guid campaignId, Guid accountId, CampaignMemberRole role)
    {
        _roles[(campaignId, accountId)] = role;
        return this;
    }

    public Task<CampaignMemberRole?> RoleOfAsync(Guid campaignId, Guid accountId, CancellationToken cancellationToken) =>
        Task.FromResult(_roles.TryGetValue((campaignId, accountId), out var role) ? (CampaignMemberRole?)role : null);
}

public sealed class FakeApprovedInvestigators : IApprovedInvestigators
{
    public List<ApprovedInvestigatorRef> Investigators { get; } = [];

    public Task<IReadOnlyList<ApprovedInvestigatorRef>> ListAsync(Guid campaignId, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<ApprovedInvestigatorRef>>(Investigators.ToList());
}

/// <summary>Records each call and answers with queued results, so the service's decisions are observable.</summary>
public sealed class FakePlayableScenes : IPlayableScenes
{
    public List<string> Calls { get; } = [];

    public PlayableScene? Active { get; set; }

    public StartSceneResult StartResult { get; set; } = new(StartSceneOutcome.SceneNotFound, null, null);

    public FinishSceneResult FinishResult { get; set; } = new(FinishSceneOutcome.NoActiveScene, null);

    public ChangePresentResult ChangeResult { get; set; } = new(ChangePresentOutcome.NoActiveScene, null);

    public IReadOnlyCollection<Guid>? LastApproved { get; private set; }

    public Task<PlayableScene?> FindActiveAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(FindActiveAsync));
        return Task.FromResult(Active);
    }

    public Task<StartSceneResult> StartAsync(
        Guid campaignId,
        Guid sceneId,
        IReadOnlyCollection<Guid> presentInvestigatorIds,
        IReadOnlyCollection<Guid> approvedInvestigatorIds,
        bool finishActiveScene,
        CancellationToken cancellationToken)
    {
        Calls.Add(nameof(StartAsync));
        LastApproved = approvedInvestigatorIds;
        return Task.FromResult(StartResult);
    }

    public Task<FinishSceneResult> FinishActiveAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(FinishActiveAsync));
        return Task.FromResult(FinishResult);
    }

    public Task<ChangePresentResult> ReplaceInvestigatorsPresentAsync(
        Guid campaignId,
        IReadOnlyCollection<Guid> presentInvestigatorIds,
        IReadOnlyCollection<Guid> approvedInvestigatorIds,
        CancellationToken cancellationToken)
    {
        Calls.Add(nameof(ReplaceInvestigatorsPresentAsync));
        return Task.FromResult(ChangeResult);
    }
}

public sealed class RecordingSceneWallEntries : ISceneWallEntries
{
    public List<string> Texts { get; } = [];

    public bool Fail { get; set; }

    public Task AddPublicAsync(Guid campaignId, Guid keeperAccountId, string text, CancellationToken cancellationToken)
    {
        if (Fail)
        {
            throw new InvalidOperationException("The Wall is down.");
        }

        Texts.Add(text);
        return Task.CompletedTask;
    }
}

public sealed class RecordingActiveSceneSignals : IActiveSceneSignals
{
    public int Count { get; private set; }

    public bool Fail { get; set; }

    public Task ActiveSceneChangedAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        if (Fail)
        {
            throw new InvalidOperationException("The hub is down.");
        }

        Count++;
        return Task.CompletedTask;
    }
}

public sealed class RecordingLogger<T> : ILogger<T>
{
    public List<LogLevel> Levels { get; } = [];

    public IDisposable? BeginScope<TState>(TState state)
        where TState : notnull => null;

    public bool IsEnabled(LogLevel logLevel) => true;

    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
        Levels.Add(logLevel);
}
