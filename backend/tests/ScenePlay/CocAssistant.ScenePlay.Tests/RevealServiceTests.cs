namespace CocAssistant.ScenePlay.Tests;

/// <summary>
/// Revealing, Clues, and Reveal files for Campaign members (specs/scene-play/spec.md; PBI-SPL-002 D3, D5, D6). Authorization lives in the
/// service: a Player or non-member gets NotFound before any port is touched, and a Player reads only what reached their Investigator.
/// </summary>
public class RevealServiceTests
{
    private static readonly Guid CampaignId = Guid.Parse("cccccccc-0000-0000-0000-000000000001");
    private static readonly Guid KeeperId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid HarveyPlayerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000002");
    private static readonly Guid LucyPlayerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000003");
    private static readonly Guid NoInvestigatorPlayerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000004");
    private static readonly Guid StrangerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000009");
    private static readonly Guid Harvey = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001");
    private static readonly Guid Lucy = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002");
    private static readonly Guid RevealId = Guid.Parse("ffffffff-0000-0000-0000-000000000001");
    private static readonly Guid SubjectId = Guid.Parse("99999999-0000-0000-0000-000000000001");
    private static readonly DateTimeOffset Now = new(2026, 10, 29, 12, 0, 0, TimeSpan.Zero);

    private readonly FakeCampaignRoles _roles = new FakeCampaignRoles()
        .With(CampaignId, KeeperId, CampaignMemberRole.Keeper)
        .With(CampaignId, HarveyPlayerId, CampaignMemberRole.Player)
        .With(CampaignId, LucyPlayerId, CampaignMemberRole.Player)
        .With(CampaignId, NoInvestigatorPlayerId, CampaignMemberRole.Player);

    private readonly FakeSceneReveals _reveals = new();
    private readonly FakePlayableScenes _scenes = new();
    private readonly FakeApprovedInvestigators _approved = new();
    private readonly FakeRevealedFiles _files = new();
    private readonly RecordingRevealSignals _signals = new();
    private readonly RecordingLogger<RevealService> _logger = new();

    public RevealServiceTests()
    {
        _approved.Investigators.Add(new ApprovedInvestigatorRef(Harvey, HarveyPlayerId, "Harvey Walters"));
        _approved.Investigators.Add(new ApprovedInvestigatorRef(Lucy, LucyPlayerId, "Lucy Ward"));
    }

    private RevealService Service => new(_roles, _reveals, _scenes, _approved, _files, _signals, _logger);

    private static SceneRevealRecord Record(params Guid[] recipients) =>
        new(RevealId, RevealSubjectKind.Handout, SubjectId, Now, "The cellar door", "ReadAloud", "{}", null, null, recipients);

    private static PlayableScene Active(params SceneRevealRecord[] reveals) =>
        new(Guid.NewGuid(), Guid.NewGuid(), "The Haunting", "The Corbitt House", "Arkham", Now, [Harvey, Lucy], reveals);

    private void ArrangeReveal(SceneRevealRecord record)
    {
        _reveals.RevealResult = new RevealRecordResult(RevealOutcome.Revealed, record);
        _scenes.Active = Active(record);
    }

    [Theory]
    [InlineData("player")]
    [InlineData("stranger")]
    public async Task Given_a_player_or_non_member_When_revealing_Then_it_is_not_found_before_any_port_is_touched(string who)
    {
        var caller = who == "player" ? HarveyPlayerId : StrangerId;

        var result = await Service.RevealAsync(CampaignId, caller, RevealSubjectKind.Handout, SubjectId, null, CancellationToken.None);

        Assert.Equal((RevealSceneOutcome.NotFound, null), (result.Outcome, result.Reveal));
        Assert.Empty(_reveals.Calls);
        Assert.Empty(_scenes.Calls);
        Assert.Empty(_signals.Recipients);
    }

    [Fact]
    public async Task Given_the_Keeper_When_revealing_to_one_investigator_Then_the_Keeper_view_lists_the_reveal_and_only_that_account_is_signalled()
    {
        ArrangeReveal(Record(Lucy));

        var result = await Service.RevealAsync(CampaignId, KeeperId, RevealSubjectKind.Handout, SubjectId, [Lucy], CancellationToken.None);

        Assert.Equal(RevealSceneOutcome.Revealed, result.Outcome);
        var reveal = result.Reveal!;
        Assert.Equal((RevealId, SubjectId, "The cellar door"), (reveal.Reveal.RevealId, reveal.SubjectId, reveal.Reveal.Title));
        Assert.Equal([new RevealRecipientView(Lucy, "Lucy Ward")], reveal.Recipients);
        Assert.Empty(_scenes.Calls);
        Assert.Equal([Lucy], _reveals.LastRecipients);
        Assert.Equal([LucyPlayerId], Assert.Single(_signals.Recipients));
    }

    [Fact]
    public async Task Given_a_reveal_to_everyone_When_signalling_Then_each_player_account_is_told_once()
    {
        ArrangeReveal(Record(Harvey, Lucy));

        await Service.RevealAsync(CampaignId, KeeperId, RevealSubjectKind.Handout, SubjectId, null, CancellationToken.None);

        Assert.Null(_reveals.LastRecipients);
        Assert.Equal([HarveyPlayerId, LucyPlayerId], Assert.Single(_signals.Recipients).Order());
    }

    [Theory]
    [InlineData(RevealOutcome.NoActiveScene, RevealSceneOutcome.NoActiveScene)]
    [InlineData(RevealOutcome.SubjectNotRevealable, RevealSceneOutcome.SubjectNotRevealable)]
    [InlineData(RevealOutcome.SubjectNotFound, RevealSceneOutcome.SubjectNotFound)]
    [InlineData(RevealOutcome.SubjectKeeperFacing, RevealSceneOutcome.SubjectKeeperFacing)]
    [InlineData(RevealOutcome.NoRecipient, RevealSceneOutcome.NoRecipient)]
    [InlineData(RevealOutcome.DuplicateRecipient, RevealSceneOutcome.DuplicateRecipient)]
    [InlineData(RevealOutcome.RecipientNotPresent, RevealSceneOutcome.RecipientNotPresent)]
    public async Task Given_a_refused_reveal_When_revealing_Then_the_outcome_is_returned_and_nothing_is_signalled(RevealOutcome refusal, RevealSceneOutcome expected)
    {
        _reveals.RevealResult = new RevealRecordResult(refusal, null);

        var result = await Service.RevealAsync(CampaignId, KeeperId, RevealSubjectKind.Handout, SubjectId, null, CancellationToken.None);

        Assert.Equal((expected, null), (result.Outcome, result.Reveal));
        Assert.Empty(_signals.Recipients);
    }

    [Fact]
    public async Task Given_an_unknown_subject_type_and_an_active_scene_When_revealing_Then_it_is_not_revealable_and_the_provider_is_not_asked()
    {
        _scenes.Active = Active();

        var result = await Service.RevealAsync(CampaignId, KeeperId, RevealSubjectKind.Unknown, SubjectId, null, CancellationToken.None);

        Assert.Equal(RevealSceneOutcome.SubjectNotRevealable, result.Outcome);
        Assert.Empty(_reveals.Calls);
    }

    [Fact]
    public async Task Given_an_unknown_subject_type_and_no_active_scene_When_revealing_Then_no_active_scene_wins()
    {
        _scenes.Active = null;

        var result = await Service.RevealAsync(CampaignId, KeeperId, RevealSubjectKind.Unknown, SubjectId, null, CancellationToken.None);

        Assert.Equal(RevealSceneOutcome.NoActiveScene, result.Outcome);
    }

    [Fact]
    public async Task Given_every_provider_outcome_When_mapped_Then_each_has_a_service_outcome_of_the_same_name()
    {
        foreach (var outcome in Enum.GetValues<RevealOutcome>())
        {
            Assert.True(Enum.TryParse<RevealSceneOutcome>(outcome.ToString(), out _), outcome.ToString());
        }

        await Task.CompletedTask;
    }

    [Fact]
    public async Task Given_the_signal_fails_When_revealing_Then_the_reveal_still_succeeds_and_a_warning_is_logged()
    {
        ArrangeReveal(Record(Harvey));
        _signals.Fail = true;

        var result = await Service.RevealAsync(CampaignId, KeeperId, RevealSubjectKind.Handout, SubjectId, [Harvey], CancellationToken.None);

        Assert.Equal(RevealSceneOutcome.Revealed, result.Outcome);
        Assert.Equal([LogLevel.Warning], _logger.Levels);
    }

    [Fact]
    public async Task Given_the_scene_finished_after_the_reveal_When_revealing_Then_it_succeeds_with_the_reveal_without_reading_the_scene_again()
    {
        _reveals.RevealResult = new RevealRecordResult(RevealOutcome.Revealed, Record(Harvey));
        _scenes.Active = null;

        var result = await Service.RevealAsync(CampaignId, KeeperId, RevealSubjectKind.Handout, SubjectId, [Harvey], CancellationToken.None);

        Assert.Equal(RevealSceneOutcome.Revealed, result.Outcome);
        Assert.Equal(RevealId, result.Reveal!.Reveal.RevealId);
        Assert.Empty(_scenes.Calls);
        Assert.Equal([HarveyPlayerId], Assert.Single(_signals.Recipients));
    }

    [Fact]
    public async Task Given_a_player_with_an_approved_investigator_When_listing_my_clues_Then_they_are_theirs_with_the_investigator_name()
    {
        _reveals.Clues.Add(new ClueRecord(Record(Harvey, Lucy), Guid.NewGuid(), "The Corbitt House"));

        var result = await Service.ListMyCluesAsync(CampaignId, HarveyPlayerId, CancellationToken.None);

        Assert.Equal(Harvey, _reveals.LastCluesInvestigatorId);
        Assert.Equal("Harvey Walters", result!.InvestigatorName);
        var clue = Assert.Single(result.Clues);
        Assert.Equal(("The cellar door", "The Corbitt House"), (clue.Reveal.Title, clue.SceneTitle));
    }

    [Theory]
    [InlineData("keeper")]
    [InlineData("stranger")]
    [InlineData("no-investigator")]
    public async Task Given_a_caller_who_is_not_a_player_with_an_investigator_When_listing_my_clues_Then_it_is_not_found(string who)
    {
        var caller = who switch { "keeper" => KeeperId, "stranger" => StrangerId, _ => NoInvestigatorPlayerId };

        Assert.Null(await Service.ListMyCluesAsync(CampaignId, caller, CancellationToken.None));
        Assert.Empty(_reveals.Calls);
    }

    [Fact]
    public async Task Given_the_Keeper_When_listing_an_investigators_clues_Then_that_investigators_are_returned()
    {
        _reveals.Clues.Add(new ClueRecord(Record(Lucy), Guid.NewGuid(), "The Corbitt House"));

        var result = await Service.ListInvestigatorCluesAsync(CampaignId, KeeperId, Lucy, CancellationToken.None);

        Assert.Equal(Lucy, _reveals.LastCluesInvestigatorId);
        Assert.Equal(("Lucy Ward", 1), (result!.InvestigatorName, result.Clues.Count));
    }

    [Theory]
    [InlineData("player")]
    [InlineData("stranger")]
    [InlineData("unknown-investigator")]
    public async Task Given_a_non_keeper_or_an_unapproved_investigator_When_the_Keeper_lists_clues_Then_it_is_not_found_before_any_clue_is_read(string who)
    {
        var caller = who == "player" ? HarveyPlayerId : who == "stranger" ? StrangerId : KeeperId;
        var investigator = who == "unknown-investigator" ? Guid.NewGuid() : Harvey;

        Assert.Null(await Service.ListInvestigatorCluesAsync(CampaignId, caller, investigator, CancellationToken.None));
        Assert.Empty(_reveals.Calls);
    }

    private void ArrangeFile(params Guid[] recipients) =>
        _reveals.File = new RevealFileRecord("blobkey", "cellar.png", "image/png", 68, recipients);

    [Theory]
    [InlineData("keeper")]
    [InlineData("recipient")]
    public async Task Given_the_Keeper_or_a_recipient_When_opening_the_file_Then_the_snapshotted_key_is_read(string who)
    {
        ArrangeFile(Harvey);
        var caller = who == "keeper" ? KeeperId : HarveyPlayerId;

        var result = await Service.OpenFileAsync(CampaignId, caller, RevealId, CancellationToken.None);

        Assert.Equal(RevealFileOutcome.Opened, result.Outcome);
        Assert.Equal(("cellar.png", "image/png", 68L), (result.Download!.File.Name, result.Download.File.MediaType, result.Download.File.SizeBytes));
        Assert.Equal(["blobkey"], _files.OpenedKeys);
    }

    [Theory]
    [InlineData("non-recipient")]
    [InlineData("no-investigator")]
    [InlineData("stranger")]
    public async Task Given_a_non_recipient_a_player_without_an_investigator_or_a_stranger_When_opening_the_file_Then_it_is_not_found_and_no_blob_is_read(string who)
    {
        ArrangeFile(Harvey);
        var caller = who switch { "non-recipient" => LucyPlayerId, "no-investigator" => NoInvestigatorPlayerId, _ => StrangerId };

        var result = await Service.OpenFileAsync(CampaignId, caller, RevealId, CancellationToken.None);

        Assert.Equal(RevealFileOutcome.NotFound, result.Outcome);
        Assert.Empty(_files.OpenedKeys);
    }

    [Fact]
    public async Task Given_a_reveal_without_a_file_or_of_another_campaign_When_opening_the_file_Then_it_is_not_found()
    {
        _reveals.File = null;

        var result = await Service.OpenFileAsync(CampaignId, KeeperId, RevealId, CancellationToken.None);

        Assert.Equal(RevealFileOutcome.NotFound, result.Outcome);
    }

    [Fact]
    public async Task Given_storage_fails_When_opening_the_file_Then_the_outcome_is_storage_failed()
    {
        ArrangeFile(Harvey);
        _files.Fail = true;

        var result = await Service.OpenFileAsync(CampaignId, KeeperId, RevealId, CancellationToken.None);

        Assert.Equal((RevealFileOutcome.StorageFailed, null), (result.Outcome, result.Download));
    }
}
