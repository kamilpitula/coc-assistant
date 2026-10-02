namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// The Investigator lifecycle (specs/campaign-play/spec.md "Investigator lifecycle"):
/// Draft -> Submitted -> Changes Requested -> Submitted -> Approved.
/// </summary>
public class InvestigatorTests
{
    private static readonly DateTimeOffset CreatedAt = new(2026, 10, 2, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Later = CreatedAt.AddHours(1);
    private static readonly IReadOnlyList<ValidationError> NoErrors = [];

    private static readonly ValidationError AnError =
        new("AgeRequired", "identity.age", "Enter your Investigator's age.", null, null, ValidationSeverity.Error);

    private static readonly ValidationError AWarning =
        new("PointBuyBelowRecommendation", "characteristics.INT", "INT is below the recommended 40. Check with your Keeper.", "40", "35", ValidationSeverity.Warning);

    private static readonly CharacterSheet NamedSheet =
        CharacterSheet.Empty with { Identity = InvestigatorIdentity.Empty with { Name = "Harvey Walters" } };

    private static Investigator NewDraft() => Investigator.Create(Guid.NewGuid(), Guid.NewGuid(), CreatedAt);

    private static Investigator Submitted()
    {
        var investigator = NewDraft();
        investigator.Submit(NoErrors, CreatedAt);
        return investigator;
    }

    [Fact]
    public void Given_a_player_When_creating_an_investigator_Then_it_is_a_draft_with_an_empty_character_sheet()
    {
        var campaignId = Guid.NewGuid();
        var playerAccountId = Guid.NewGuid();

        var investigator = Investigator.Create(campaignId, playerAccountId, CreatedAt);

        Assert.Equal(InvestigatorStatus.Draft, investigator.Status);
        Assert.Equal(campaignId, investigator.CampaignId);
        Assert.Equal(playerAccountId, investigator.PlayerAccountId);
        Assert.Equal(CharacterSheet.Empty, investigator.CharacterSheet);
        Assert.Null(investigator.ChangeRequestComment);
        Assert.Equal(CreatedAt, investigator.CreatedAt);
        Assert.Equal(CreatedAt, investigator.UpdatedAt);
    }

    [Fact]
    public void Given_a_draft_When_replacing_its_character_sheet_Then_the_sheet_is_stored_and_the_update_time_moves()
    {
        var investigator = NewDraft();

        var replaced = investigator.ReplaceCharacterSheet(NamedSheet, Later);

        Assert.True(replaced);
        Assert.Equal(NamedSheet, investigator.CharacterSheet);
        Assert.Equal(Later, investigator.UpdatedAt);
    }

    [Fact]
    public void Given_a_draft_with_errors_When_submitting_Then_it_stays_a_draft()
    {
        var investigator = NewDraft();

        var submitted = investigator.Submit([AnError], Later);

        Assert.False(submitted);
        Assert.Equal(InvestigatorStatus.Draft, investigator.Status);
    }

    // Scenario: Player submits a valid Character Sheet
    [Fact]
    public void Given_a_draft_with_only_warnings_When_submitting_Then_it_is_submitted_and_can_no_longer_be_edited()
    {
        var investigator = NewDraft();

        var submitted = investigator.Submit([AWarning], Later);

        Assert.True(submitted);
        Assert.Equal(InvestigatorStatus.Submitted, investigator.Status);
        Assert.False(investigator.ReplaceCharacterSheet(NamedSheet, Later));
        Assert.Equal(CharacterSheet.Empty, investigator.CharacterSheet);
    }

    // Scenario: Keeper approves an Investigator
    [Fact]
    public void Given_a_submitted_investigator_When_the_keeper_approves_it_Then_it_is_approved()
    {
        var investigator = Submitted();

        Assert.True(investigator.Approve(Later));
        Assert.Equal(InvestigatorStatus.Approved, investigator.Status);
        Assert.Equal(Later, investigator.UpdatedAt);
    }

    // Regression Guardrail: An unapproved Investigator cannot be represented as ready for play.
    [Fact]
    public void Given_a_draft_When_approving_it_Then_it_is_not_approved()
    {
        var investigator = NewDraft();

        Assert.False(investigator.Approve(Later));
        Assert.Equal(InvestigatorStatus.Draft, investigator.Status);
    }

    // Scenario: Keeper requests changes
    [Fact]
    public void Given_a_submitted_investigator_When_the_keeper_requests_changes_Then_it_is_changes_requested_with_the_comment()
    {
        var investigator = Submitted();

        var requested = investigator.RequestChanges("Credit Rating seems high for this Occupation", Later);

        Assert.True(requested);
        Assert.Equal(InvestigatorStatus.ChangesRequested, investigator.Status);
        Assert.Equal("Credit Rating seems high for this Occupation", investigator.ChangeRequestComment);
        Assert.True(investigator.ReplaceCharacterSheet(NamedSheet, Later));
    }

    // Scenario: Request changes requires a comment
    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Given_a_submitted_investigator_When_requesting_changes_without_a_comment_Then_it_remains_submitted(string comment)
    {
        var investigator = Submitted();

        Assert.False(investigator.RequestChanges(comment, Later));
        Assert.Equal(InvestigatorStatus.Submitted, investigator.Status);
        Assert.Null(investigator.ChangeRequestComment);
    }

    [Fact]
    public void Given_a_submitted_investigator_When_requesting_changes_with_a_comment_over_the_limit_Then_it_remains_submitted()
    {
        var investigator = Submitted();

        Assert.True(investigator.RequestChanges(new string('a', Investigator.ChangeRequestCommentMaxLength), Later));

        var resubmitted = Submitted();
        Assert.False(resubmitted.RequestChanges(new string('a', Investigator.ChangeRequestCommentMaxLength + 1), Later));
        Assert.Equal(InvestigatorStatus.Submitted, resubmitted.Status);
    }

    [Fact]
    public void Given_changes_were_requested_When_the_player_resubmits_Then_it_is_submitted_and_keeps_the_latest_comment()
    {
        var investigator = Submitted();
        investigator.RequestChanges("Lower the Credit Rating", Later);

        Assert.True(investigator.Submit(NoErrors, Later));
        Assert.Equal(InvestigatorStatus.Submitted, investigator.Status);
        Assert.Equal("Lower the Credit Rating", investigator.ChangeRequestComment);

        investigator.RequestChanges("Now check the age", Later);
        Assert.Equal("Now check the age", investigator.ChangeRequestComment);
    }

    [Fact]
    public void Given_an_approved_investigator_When_editing_resubmitting_or_requesting_changes_Then_nothing_changes()
    {
        var investigator = Submitted();
        investigator.Approve(Later);

        Assert.False(investigator.ReplaceCharacterSheet(NamedSheet, Later));
        Assert.False(investigator.Submit(NoErrors, Later));
        Assert.False(investigator.RequestChanges("Too late", Later));
        Assert.False(investigator.Approve(Later));
        Assert.Equal(InvestigatorStatus.Approved, investigator.Status);
    }

    // Scenario: Player starts over from a Draft
    [Fact]
    public void Given_each_status_When_checking_start_over_Then_only_a_draft_can_start_over()
    {
        var changesRequested = Submitted();
        changesRequested.RequestChanges("Fix it", Later);

        Assert.True(NewDraft().CanStartOver);
        Assert.False(Submitted().CanStartOver);
        Assert.False(changesRequested.CanStartOver);
    }

    [Fact]
    public void Given_each_status_When_checking_keeper_visibility_Then_only_a_draft_is_hidden_from_the_keeper()
    {
        Assert.False(NewDraft().IsVisibleToKeeper);
        Assert.True(Submitted().IsVisibleToKeeper);
    }
}
