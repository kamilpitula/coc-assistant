namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Keeps the ValidationError catalog of specs/character-sheet/spec.md, the backend factories, and the shared fixtures in
/// step: every catalogued code has one factory and is produced by at least one fixture case.
/// </summary>
public class ValidationCatalogCoverageTests
{
    private static readonly Regex CatalogRow = new(@"^\s*\| `(?<code>[A-Za-z]+)` \|", RegexOptions.Compiled);

    private static string RepositoryFile(params string[] parts)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine([directory.FullName, .. parts])))
        {
            directory = directory.Parent;
        }

        Assert.NotNull(directory);
        return Path.Combine([directory!.FullName, .. parts]);
    }

    private static IReadOnlyList<string> CatalogCodes() =>
        File.ReadLines(RepositoryFile("specs", "character-sheet", "spec.md"))
            .Select(line => CatalogRow.Match(line))
            .Where(match => match.Success)
            .Select(match => match.Groups["code"].Value)
            .ToList();

    [Fact]
    public void Given_the_spec_catalog_When_compared_with_the_backend_Then_every_code_has_a_factory()
    {
        var factories = typeof(ValidationErrors).GetMethods().Select(method => method.Name).ToHashSet();

        var codes = CatalogCodes();

        Assert.True(codes.Count >= 50, $"Expected the whole catalog, found {codes.Count} codes.");
        Assert.DoesNotContain(codes, code => !factories.Contains(code));
    }

    [Fact]
    public void Given_the_spec_catalog_When_compared_with_the_fixtures_Then_every_code_is_produced_by_a_fixture_case()
    {
        using var fixtures = JsonDocument.Parse(File.ReadAllText(RepositoryFile("specs", "character-sheet", "validation-fixtures.json")));
        var produced = fixtures.RootElement.GetProperty("cases").EnumerateArray()
            .SelectMany(fixtureCase => fixtureCase.GetProperty("expected").EnumerateArray())
            .Select(error => error.GetProperty("code").GetString())
            .ToHashSet();

        Assert.DoesNotContain(CatalogCodes(), code => !produced.Contains(code));
    }
}
