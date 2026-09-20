namespace CocAssistant.Identity.Tests;

/// <summary>A controllable TimeProvider so tests can assert exact, advanceable timestamps.</summary>
public sealed class FakeTimeProvider : TimeProvider
{
    private DateTimeOffset _now;

    public FakeTimeProvider(DateTimeOffset start) => _now = start;

    public override DateTimeOffset GetUtcNow() => _now;

    public void Advance(TimeSpan by) => _now += by;
}
