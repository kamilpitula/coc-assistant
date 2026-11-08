namespace CocAssistant.Api.Tests;

public class RandomSourceScanTests
{
    [Fact]
    public void Given_the_backend_sources_When_scanned_Then_only_SecureDiceRoller_creates_random_numbers()
    {
        var root = BackendSourceRoot();
        var offenders = new List<string>();
        foreach (var file in Directory.EnumerateFiles(root, "*.cs", SearchOption.AllDirectories))
        {
            if (file.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}")
                || file.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}"))
            {
                continue;
            }

            if (file.EndsWith($"{Path.DirectorySeparatorChar}SecureDiceRoller.cs", StringComparison.Ordinal))
            {
                continue;
            }

            var text = File.ReadAllText(file);
            if (text.Contains("new Random(", StringComparison.Ordinal)
                || text.Contains("Random.Shared", StringComparison.Ordinal)
                || text.Contains("System.Random", StringComparison.Ordinal)
                || text.Contains("RandomNumberGenerator", StringComparison.Ordinal))
            {
                offenders.Add(Path.GetRelativePath(root, file));
            }
        }

        Assert.Empty(offenders);
    }

    private static string BackendSourceRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current is not null && !File.Exists(Path.Combine(current.FullName, "backend", "CocAssistant.slnx")))
        {
            current = current.Parent;
        }

        Assert.True(current is not null, "Could not find the repository root with backend/CocAssistant.slnx.");
        return Path.Combine(current.FullName, "backend", "src");
    }
}
