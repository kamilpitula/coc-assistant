namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Runs the finish-then-start transaction inside the context's execution strategy as a single attempt (ADR 0025):
/// the first save accepts the finish and startScene mutates the aggregate in memory, so a replay would repeat an
/// in-memory start after the finish was already accepted. A second invocation refuses with the first attempt's
/// failure inside, and the request fails instead of writing a start without its finish.
/// </summary>
internal static class SingleAttemptExecution
{
    private sealed class AttemptState(Func<Task> operation)
    {
        public int Invocations;
        public Exception? FirstFailure;
        public Func<Task> Operation { get; } = operation;
    }

    public static Task ExecuteOnceAsync(IExecutionStrategy strategy, Func<Task> operation, CancellationToken cancellationToken = default)
    {
        var state = new AttemptState(operation);
        return strategy.ExecuteAsync(
            state,
            static async (_, attempt, _) =>
            {
                attempt.Invocations++;
                if (attempt.Invocations > 1)
                {
                    throw new InvalidOperationException("A finish-then-start is not retried (ADR 0025).", attempt.FirstFailure);
                }

                try
                {
                    await attempt.Operation();
                }
                catch (Exception exception)
                {
                    attempt.FirstFailure ??= exception;
                    throw;
                }

                return true;
            },
            verifySucceeded: null,
            cancellationToken);
    }
}
