namespace CocAssistant.ScenePlay.Tests;

/// <summary>
/// Giving, taking back, and reading held Items (specs/scene-play/spec.md; PBI-SPL-003 D5). Authorization lives in the service:
/// the Keeper check runs first on a write, so a Player or non-member gets NotFound before any port is touched. A give signals the
/// gaining and losing accounts; taking back an unheld Item signals nothing; a failed signal is logged and never fails the call.
/// </summary>
public class ItemHolderServiceTests
{
    private static readonly Guid CampaignId = Guid.Parse("cccccccc-0000-0000-0000-000000000001");
    private static readonly Guid KeeperId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid HarveyPlayerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000002");
    private static readonly Guid LucyPlayerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000003");
    private static readonly Guid NoInvestigatorPlayerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000004");
    private static readonly Guid StrangerId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000009");
    private static readonly Guid Harvey = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001");
    private static readonly Guid Lucy = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002");
    private static readonly Guid ItemId = Guid.Parse("99999999-0000-0000-0000-000000000001");
    private static readonly Guid RevealId = Guid.Parse("ffffffff-0000-0000-0000-000000000001");
    private static readonly DateTimeOffset Now = new(2026, 11, 6, 12, 0, 0, TimeSpan.Zero);

    private readonly FakeCampaignRoles _roles = new FakeCampaignRoles()
        .With(CampaignId, KeeperId, CampaignMemberRole.Keeper)
        .With(CampaignId, HarveyPlayerId, CampaignMemberRole.Player)
        .With(CampaignId, LucyPlayerId, CampaignMemberRole.Player)
        .With(CampaignId, NoInvestigatorPlayerId, CampaignMemberRole.Player);

    private readonly FakeSceneItemHolders _holders = new();
    private readonly FakeApprovedInvestigators _approved = new();
    private readonly RecordingItemHolderSignals _signals = new();
    private readonly RecordingLogger<ItemHolderService> _logger = new();

    public ItemHolderServiceTests()
    {
        _approved.Investigators.Add(new ApprovedInvestigatorRef(Harvey, HarveyPlayerId, "Harvey Walters"));
        _approved.Investigators.Add(new ApprovedInvestigatorRef(Lucy, LucyPlayerId, "Lucy Ward"));
    }

    private ItemHolderService Service => new(_roles, _holders, _approved, _signals, _logger);

    private static SceneRevealRecord GiveReveal(params Guid[] recipients) =>
        new(RevealId, RevealSubjectKind.Item, ItemId, Now, "Walter Corbitt's diary", null, "{}", null, null, recipients);

    [Theory]
    [InlineData("player")]
    [InlineData("stranger")]
    public async Task Given_a_player_or_non_member_When_giving_Then_it_is_not_found_before_any_port_is_touched(string who)
    {
        var caller = who == "player" ? HarveyPlayerId : StrangerId;

        var result = await Service.GiveAsync(CampaignId, caller, ItemId, Harvey, CancellationToken.None);

        Assert.Equal((GiveItemOutcome.NotFound, null, null), (result.Outcome, result.Reveal, result.FormerHolderId));
        Assert.Empty(_holders.Calls);
        Assert.Empty(_signals.Changes);
    }

    [Theory]
    [InlineData("player")]
    [InlineData("stranger")]
    public async Task Given_a_player_or_non_member_When_taking_back_Then_it_is_not_found_before_any_port_is_touched(string who)
    {
        var caller = who == "player" ? HarveyPlayerId : StrangerId;

        var result = await Service.TakeBackAsync(CampaignId, caller, ItemId, CancellationToken.None);

        Assert.Equal((TakeBackItemOutcome.NotFound, null), (result.Outcome, result.FormerHolderId));
        Assert.Empty(_holders.Calls);
        Assert.Empty(_signals.Changes);
    }

    [Fact]
    public async Task Given_the_Keeper_When_giving_to_a_new_holder_Then_the_Keeper_view_is_returned_and_the_gainer_is_signalled()
    {
        _holders.GiveResult = new ItemGiveRecordResult(ItemGiveOutcome.Given, GiveReveal(Harvey), null);

        var result = await Service.GiveAsync(CampaignId, KeeperId, ItemId, Harvey, CancellationToken.None);

        Assert.Equal(GiveItemOutcome.Given, result.Outcome);
        Assert.Null(result.FormerHolderId);
        Assert.Equal((RevealId, ItemId, "Walter Corbitt's diary"), (result.Reveal!.Reveal.RevealId, result.Reveal.SubjectId, result.Reveal.Reveal.Title));
        Assert.Equal([new RevealRecipientView(Harvey, "Harvey Walters")], result.Reveal.Recipients);
        Assert.Equal((ItemId, Harvey), _holders.LastGive);
        Assert.Equal([(HarveyPlayerId, null)], _signals.Changes);
    }

    [Fact]
    public async Task Given_a_move_between_holders_When_giving_Then_the_former_holder_is_returned_and_both_accounts_are_signalled()
    {
        _holders.GiveResult = new ItemGiveRecordResult(ItemGiveOutcome.Given, GiveReveal(Lucy), Harvey);

        var result = await Service.GiveAsync(CampaignId, KeeperId, ItemId, Lucy, CancellationToken.None);

        Assert.Equal(Harvey, result.FormerHolderId);
        Assert.Equal([(LucyPlayerId, HarveyPlayerId)], _signals.Changes);
    }

    [Theory]
    [InlineData(ItemGiveOutcome.ItemNotFound, GiveItemOutcome.ItemNotFound)]
    [InlineData(ItemGiveOutcome.NoActiveScene, GiveItemOutcome.NoActiveScene)]
    [InlineData(ItemGiveOutcome.NotLinked, GiveItemOutcome.NotLinked)]
    [InlineData(ItemGiveOutcome.RecipientNotPresent, GiveItemOutcome.RecipientNotPresent)]
    [InlineData(ItemGiveOutcome.AlreadyHolder, GiveItemOutcome.AlreadyHolder)]
    [InlineData(ItemGiveOutcome.Conflict, GiveItemOutcome.Conflict)]
    public async Task Given_a_refused_give_When_giving_Then_the_outcome_is_returned_and_nothing_is_signalled(ItemGiveOutcome refusal, GiveItemOutcome expected)
    {
        _holders.GiveResult = new ItemGiveRecordResult(refusal, null, null);

        var result = await Service.GiveAsync(CampaignId, KeeperId, ItemId, Harvey, CancellationToken.None);

        Assert.Equal((expected, null), (result.Outcome, result.Reveal));
        Assert.Empty(_signals.Changes);
    }

    [Fact]
    public async Task Given_a_held_Item_When_taking_back_Then_the_former_holder_is_returned_and_only_the_loser_is_signalled()
    {
        _holders.TakeBackResult = new ItemTakeBackRecordResult(ItemTakeBackOutcome.TakenBack, Harvey);

        var result = await Service.TakeBackAsync(CampaignId, KeeperId, ItemId, CancellationToken.None);

        Assert.Equal((TakeBackItemOutcome.TakenBack, Harvey), (result.Outcome, result.FormerHolderId));
        Assert.Equal(ItemId, _holders.LastTakeBack);
        Assert.Equal([(null, HarveyPlayerId)], _signals.Changes);
    }

    [Theory]
    [InlineData(ItemTakeBackOutcome.ItemNotFound, TakeBackItemOutcome.ItemNotFound)]
    [InlineData(ItemTakeBackOutcome.NotHeld, TakeBackItemOutcome.NotHeld)]
    [InlineData(ItemTakeBackOutcome.Conflict, TakeBackItemOutcome.Conflict)]
    public async Task Given_a_refused_take_back_When_taking_back_Then_the_outcome_is_returned_and_nothing_is_signalled(ItemTakeBackOutcome refusal, TakeBackItemOutcome expected)
    {
        _holders.TakeBackResult = new ItemTakeBackRecordResult(refusal, null);

        var result = await Service.TakeBackAsync(CampaignId, KeeperId, ItemId, CancellationToken.None);

        Assert.Equal((expected, null), (result.Outcome, result.FormerHolderId));
        Assert.Empty(_signals.Changes);
    }

    [Fact]
    public async Task Given_a_failing_signal_When_giving_Then_the_give_still_succeeds_and_the_failure_is_logged()
    {
        _holders.GiveResult = new ItemGiveRecordResult(ItemGiveOutcome.Given, GiveReveal(Harvey), null);
        _signals.Fail = true;

        var result = await Service.GiveAsync(CampaignId, KeeperId, ItemId, Harvey, CancellationToken.None);

        Assert.Equal(GiveItemOutcome.Given, result.Outcome);
        Assert.Equal([LogLevel.Warning], _logger.Levels);
    }

    [Fact]
    public async Task Given_a_failing_signal_When_taking_back_Then_the_take_back_still_succeeds()
    {
        _holders.TakeBackResult = new ItemTakeBackRecordResult(ItemTakeBackOutcome.TakenBack, Harvey);
        _signals.Fail = true;

        var result = await Service.TakeBackAsync(CampaignId, KeeperId, ItemId, CancellationToken.None);

        Assert.Equal(TakeBackItemOutcome.TakenBack, result.Outcome);
        Assert.Equal([LogLevel.Warning], _logger.Levels);
    }

    [Fact]
    public async Task Given_every_provider_outcome_When_mapped_Then_each_has_a_service_outcome_of_the_same_name()
    {
        foreach (var outcome in Enum.GetValues<ItemGiveOutcome>())
        {
            Assert.True(Enum.TryParse<GiveItemOutcome>(outcome.ToString(), out _), outcome.ToString());
        }

        foreach (var outcome in Enum.GetValues<ItemTakeBackOutcome>())
        {
            Assert.True(Enum.TryParse<TakeBackItemOutcome>(outcome.ToString(), out _), outcome.ToString());
        }

        await Task.CompletedTask;
    }

    [Fact]
    public async Task Given_the_Keeper_When_reading_mine_items_Then_it_is_null_and_no_port_is_touched()
    {
        var result = await Service.ListMyItemsAsync(CampaignId, KeeperId, CancellationToken.None);

        Assert.Null(result);
        Assert.Empty(_holders.Calls);
    }

    [Fact]
    public async Task Given_a_Player_without_an_Investigator_When_reading_mine_items_Then_it_is_null_and_no_port_is_touched()
    {
        var result = await Service.ListMyItemsAsync(CampaignId, NoInvestigatorPlayerId, CancellationToken.None);

        Assert.Null(result);
        Assert.Empty(_holders.Calls);
    }

    [Fact]
    public async Task Given_a_Player_When_reading_mine_items_Then_only_their_own_held_Items_are_returned_newest_first()
    {
        _holders.Held.Add(new HeldItemRecord(ItemId, GiveReveal(Harvey)));

        var result = await Service.ListMyItemsAsync(CampaignId, HarveyPlayerId, CancellationToken.None);

        Assert.Equal(Harvey, _holders.LastHeldInvestigatorId);
        Assert.Equal("Harvey Walters", result!.InvestigatorName);
        var held = Assert.Single(result.Items);
        Assert.Equal((ItemId, RevealId, "Walter Corbitt's diary", Now), (held.ItemId, held.Reveal.RevealId, held.Reveal.Title, held.Reveal.RevealedAt));
    }

    [Fact]
    public async Task Given_a_Player_When_reading_mine_items_Then_the_port_is_read_for_their_own_Investigator()
    {
        _holders.Held.Add(new HeldItemRecord(ItemId, GiveReveal(Harvey)));

        var result = await Service.ListMyItemsAsync(CampaignId, HarveyPlayerId, CancellationToken.None);

        Assert.Equal(Harvey, _holders.LastHeldInvestigatorId);
        Assert.Equal(ItemId, Assert.Single(result!.Items).ItemId);
    }

    [Theory]
    [InlineData("player")]
    [InlineData("stranger")]
    public async Task Given_a_caller_who_is_not_the_Keeper_When_reading_an_Investigators_Items_Then_it_is_null_and_no_port_is_touched(string who)
    {
        var caller = who == "player" ? HarveyPlayerId : StrangerId;

        var result = await Service.ListInvestigatorItemsAsync(CampaignId, caller, Lucy, CancellationToken.None);

        Assert.Null(result);
        Assert.Empty(_holders.Calls);
    }

    [Fact]
    public async Task Given_an_Investigator_who_is_not_Approved_When_the_Keeper_reads_Then_it_is_null_and_no_port_is_touched()
    {
        var result = await Service.ListInvestigatorItemsAsync(CampaignId, KeeperId, Guid.NewGuid(), CancellationToken.None);

        Assert.Null(result);
        Assert.Empty(_holders.Calls);
    }

    [Fact]
    public async Task Given_the_Keeper_When_reading_an_Investigators_Items_Then_the_Items_carry_their_ids()
    {
        _holders.Held.Add(new HeldItemRecord(ItemId, GiveReveal(Lucy)));

        var result = await Service.ListInvestigatorItemsAsync(CampaignId, KeeperId, Lucy, CancellationToken.None);

        Assert.Equal(Lucy, _holders.LastHeldInvestigatorId);
        Assert.Equal("Lucy Ward", result!.InvestigatorName);
        Assert.Equal(ItemId, Assert.Single(result.Items).ItemId);
    }
}
