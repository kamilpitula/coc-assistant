namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// The finish-then-start transaction runs inside the execution strategy as a single attempt (ADR 0025, PBI-DEP-002 D2):
/// replaying it would repeat an in-memory start after the finish was already accepted.
/// </summary>
public class SingleAttemptExecutionTests
{
    private sealed class RunOnceStrategy : IExecutionStrategy
    {
        public bool RetriesOnFailure => false;

        public TResult Execute<TState, TResult>(
            TState state,
            Func<DbContext, TState, TResult> operation,
            Func<DbContext, TState, ExecutionResult<TResult>>? verifySucceeded) =>
            throw new NotImplementedException();

        public Task<TResult> ExecuteAsync<TState, TResult>(
            TState state,
            Func<DbContext, TState, CancellationToken, Task<TResult>> operation,
            Func<DbContext, TState, CancellationToken, Task<ExecutionResult<TResult>>>? verifySucceeded,
            CancellationToken cancellationToken = default) =>
            operation(null!, state, cancellationToken);
    }

    private sealed class InvokeTwiceStrategy : IExecutionStrategy
    {
        public bool RetriesOnFailure => true;

        public TResult Execute<TState, TResult>(
            TState state,
            Func<DbContext, TState, TResult> operation,
            Func<DbContext, TState, ExecutionResult<TResult>>? verifySucceeded) =>
            throw new NotImplementedException();

        public async Task<TResult> ExecuteAsync<TState, TResult>(
            TState state,
            Func<DbContext, TState, CancellationToken, Task<TResult>> operation,
            Func<DbContext, TState, CancellationToken, Task<ExecutionResult<TResult>>>? verifySucceeded,
            CancellationToken cancellationToken = default)
        {
            try
            {
                await operation(null!, state, cancellationToken);
            }
            catch
            {
                // A retrying strategy swallows the first failure and invokes the operation again.
            }

            return await operation(null!, state, cancellationToken);
        }
    }

    [Fact]
    public async Task Given_a_strategy_that_runs_once_When_executing_Then_the_operation_runs_once()
    {
        var runs = 0;

        await SingleAttemptExecution.ExecuteOnceAsync(new RunOnceStrategy(), () =>
        {
            runs++;
            return Task.CompletedTask;
        });

        Assert.Equal(1, runs);
    }

    [Fact]
    public async Task Given_a_strategy_that_invokes_twice_When_executing_Then_the_second_attempt_is_refused_with_the_first_failure_inside()
    {
        var firstFailure = new InvalidOperationException("The database paused mid-transaction.");
        var strategy = new InvokeTwiceStrategy();

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            SingleAttemptExecution.ExecuteOnceAsync(strategy, () => Task.FromException(firstFailure)));

        Assert.Same(firstFailure, exception.InnerException);
    }

    [Fact]
    public async Task Given_a_failing_operation_When_executing_Then_the_failure_propagates_unchanged()
    {
        var failure = new InvalidOperationException("Not prepared.");

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            SingleAttemptExecution.ExecuteOnceAsync(new RunOnceStrategy(), () => Task.FromException(failure)));

        Assert.Same(failure, exception);
    }
}
