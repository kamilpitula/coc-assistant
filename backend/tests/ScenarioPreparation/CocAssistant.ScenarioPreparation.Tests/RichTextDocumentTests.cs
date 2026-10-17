namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Runs every case of specs/scenario-preparation/rich-text-fixtures.json against the backend validator (ADR 0015
/// amendment) and covers size, malformed input, and tolerated extra properties.
/// </summary>
public class RichTextDocumentTests
{
    private static readonly Lazy<JsonDocument> Fixtures = new(() =>
        JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "rich-text-fixtures.json"))));

    public static TheoryData<string> CaseNames()
    {
        var names = new TheoryData<string>();
        foreach (var fixtureCase in Fixtures.Value.RootElement.GetProperty("cases").EnumerateArray())
        {
            names.Add(fixtureCase.GetProperty("name").GetString()!);
        }

        return names;
    }

    [Theory]
    [MemberData(nameof(CaseNames))]
    public void Given_a_shared_fixture_case_When_validating_Then_the_outcome_is_the_expected_one(string caseName)
    {
        var fixtureCase = Fixtures.Value.RootElement.GetProperty("cases").EnumerateArray()
            .Single(candidate => candidate.GetProperty("name").GetString() == caseName);

        var outcome = RichTextDocument.Validate(fixtureCase.GetProperty("document").GetRawText());

        var accepted = fixtureCase.GetProperty("expected").GetString() == "accepted";
        Assert.Equal(accepted, outcome == RichTextOutcome.Accepted);
    }

    [Fact]
    public void Given_the_fixture_When_compared_with_the_backend_limit_Then_the_byte_limits_match()
    {
        Assert.Equal(RichTextDocument.MaxBytes, Fixtures.Value.RootElement.GetProperty("maxBytes").GetInt32());
    }

    [Fact]
    public void Given_the_every_node_fixture_case_When_compared_with_the_rules_Then_every_allowed_node_type_appears()
    {
        var everyNode = Fixtures.Value.RootElement.GetProperty("cases").EnumerateArray()
            .Single(candidate => candidate.GetProperty("name").GetString() == "every allowed node").GetRawText();

        Assert.All(RichTextNodeRules.ByType.Keys, type => Assert.Contains($"\"type\": \"{type}\"", everyNode));
    }

    private static readonly string AcuteE = ((char)0xE9).ToString();

    private static string DocumentOfBytes(int totalBytes, string character)
    {
        const string prefix = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"";
        const string suffix = "\"}]}]}}";
        var remaining = totalBytes - Encoding.UTF8.GetByteCount(prefix + suffix);
        var characterBytes = Encoding.UTF8.GetByteCount(character);
        var repeated = string.Concat(Enumerable.Repeat(character, remaining / characterBytes));
        var padding = new string('a', remaining % characterBytes);
        return prefix + repeated + padding + suffix;
    }

    [Fact]
    public void Given_a_document_of_exactly_204800_bytes_When_validating_Then_it_is_accepted()
    {
        var json = DocumentOfBytes(204_800, "a");

        Assert.Equal(204_800, Encoding.UTF8.GetByteCount(json));
        Assert.Equal(RichTextOutcome.Accepted, RichTextDocument.Validate(json));
    }

    [Fact]
    public void Given_a_document_of_204801_bytes_When_validating_Then_it_is_too_large()
    {
        var json = DocumentOfBytes(204_801, "a");

        Assert.Equal(204_801, Encoding.UTF8.GetByteCount(json));
        Assert.Equal(RichTextOutcome.TooLarge, RichTextDocument.Validate(json));
    }

    [Fact]
    public void Given_multi_byte_characters_When_validating_Then_bytes_not_characters_are_counted()
    {
        var atLimit = DocumentOfBytes(204_800, AcuteE);
        Assert.True(atLimit.Length < 204_800 - 50_000);
        Assert.Equal(RichTextOutcome.Accepted, RichTextDocument.Validate(atLimit));

        var overLimit = DocumentOfBytes(204_802, AcuteE);
        Assert.True(overLimit.Length < 204_800 - 50_000);
        Assert.Equal(RichTextOutcome.TooLarge, RichTextDocument.Validate(overLimit));
    }

    [Theory]
    [InlineData("")]
    [InlineData("{not json")]
    [InlineData("[1]")]
    [InlineData("\"text\"")]
    [InlineData("{}")]
    [InlineData("{\"root\":[]}")]
    public void Given_malformed_or_rootless_input_When_validating_Then_it_is_malformed(string json)
    {
        Assert.Equal(RichTextOutcome.Malformed, RichTextDocument.Validate(json));
    }

    [Fact]
    public void Given_a_root_of_the_wrong_type_When_validating_Then_the_content_is_disallowed()
    {
        Assert.Equal(
            RichTextOutcome.DisallowedContent,
            RichTextDocument.Validate("{\"root\":{\"type\":\"paragraph\",\"children\":[]}}"));
    }

    [Fact]
    public void Given_a_root_without_children_When_validating_Then_it_is_accepted()
    {
        Assert.Equal(RichTextOutcome.Accepted, RichTextDocument.Validate("{\"root\":{\"type\":\"root\",\"children\":[]}}"));
    }

    [Fact]
    public void Given_unknown_extra_properties_on_allowed_nodes_When_validating_Then_it_is_accepted()
    {
        const string json = "{\"root\":{\"type\":\"root\",\"extra\":1,\"children\":[{\"type\":\"paragraph\",\"future\":{\"a\":1},\"children\":[]}]}}";

        Assert.Equal(RichTextOutcome.Accepted, RichTextDocument.Validate(json));
    }
}
