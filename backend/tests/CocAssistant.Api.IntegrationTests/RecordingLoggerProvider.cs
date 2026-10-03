namespace CocAssistant.Api.IntegrationTests;

/// <summary>Captures error log entries written anywhere in the assembled Api.</summary>
public sealed class RecordingLoggerProvider : ILoggerProvider
{
    private readonly ConcurrentQueue<(string Category, Exception? Exception)> _errors = new();

    public IReadOnlyList<(string Category, Exception? Exception)> Errors => _errors.ToList();

    public void Clear() => _errors.Clear();

    public ILogger CreateLogger(string categoryName) => new ErrorLogger(categoryName, _errors);

    public void Dispose()
    {
    }

    private sealed class ErrorLogger(string category, ConcurrentQueue<(string Category, Exception? Exception)> errors) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Error;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (IsEnabled(logLevel))
            {
                errors.Enqueue((category, exception));
            }
        }
    }
}
