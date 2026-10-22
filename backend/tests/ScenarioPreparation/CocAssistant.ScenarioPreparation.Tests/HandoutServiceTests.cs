namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Reading, adding, editing, removing, and reordering a Scene's Handouts as its Keeper (specs/scenario-preparation/spec.md).
/// Everyone else ends in NotFound before any Scene is read (ADR 0013).
/// </summary>
public class HandoutServiceTests : IDisposable
{
    private const string Text = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The door creaks open\"}]}]}}";
    private const string Other = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"A cold draught\"}]}]}}";
    private const string Image = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\"}]}}";
    private const string Blank = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\" \"}]}]}}";

    private static readonly Guid Keeper = ScenarioPreparationTestBuilder.KeeperAccountId;

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        return (scenario.Id, (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House")).Id);
    }

    private async Task<HandoutWriteResult> CreateAsync(
        Guid scenarioId, Guid sceneId, string title = "Arrival", string? content = Text, HandoutKind? kind = HandoutKind.ReadAloud, HandoutVisibility? visibility = HandoutVisibility.PlayerFacing, Guid? campaignId = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHandoutService(context).CreateAsync(campaignId ?? _builder.CampaignId, Keeper, scenarioId, sceneId, kind, visibility, title, content, CancellationToken.None);
    }

    private async Task<HandoutWriteResult> EditAsync(
        Guid scenarioId, Guid sceneId, Guid handoutId, string title = "Renamed", string? content = Other, HandoutKind? kind = HandoutKind.Text, HandoutVisibility? visibility = HandoutVisibility.KeeperFacing, Guid? campaignId = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHandoutService(context).EditAsync(campaignId ?? _builder.CampaignId, Keeper, scenarioId, sceneId, handoutId, kind, visibility, title, content, CancellationToken.None);
    }

    private async Task<HandoutRemoveOutcome> RemoveAsync(Guid scenarioId, Guid sceneId, Guid handoutId)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHandoutService(context).RemoveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, handoutId, CancellationToken.None);
    }

    private async Task<HandoutReorderResult> ReorderAsync(Guid scenarioId, Guid sceneId, params Guid[] handoutIds)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHandoutService(context).ReorderAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, handoutIds, CancellationToken.None);
    }

    private async Task<IReadOnlyList<HandoutSummaryView>> StoredHandoutsAsync(Guid scenarioId, Guid sceneId) =>
        (await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.Handouts;

    [Fact]
    public async Task Given_the_Keeper_When_creating_a_handout_Then_the_trimmed_handout_is_stored_and_the_view_carries_its_content()
    {
        var (scenarioId, sceneId) = await SceneAsync();

        var result = await CreateAsync(scenarioId, sceneId, "  Arrival ");

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        var handout = result.Handout!;
        Assert.Equal(
            (HandoutKind.ReadAloud, HandoutVisibility.PlayerFacing, "Arrival", Text),
            (handout.Kind, handout.Visibility, handout.Title, handout.Content));
        Assert.Equal(
            new HandoutSummaryView(handout.Id, HandoutKind.ReadAloud, HandoutVisibility.PlayerFacing, "Arrival"),
            Assert.Single(await StoredHandoutsAsync(scenarioId, sceneId)));
    }

    [Fact]
    public async Task Given_a_stored_handout_When_getting_it_Then_the_view_with_content_is_returned_and_unknown_ids_are_NotFound()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);
        using var context = _builder.Fixture.CreateContext();
        var service = _builder.CreateHandoutService(context);

        var found = await service.GetAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, handout.Id, CancellationToken.None);
        var unknown = await service.GetAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, Guid.NewGuid(), CancellationToken.None);

        Assert.Equal(handout, found);
        Assert.Null(unknown);
    }

    [Theory]
    [InlineData("Player")]
    [InlineData("OtherKeeper")]
    [InlineData("Stranger")]
    public async Task Given_a_caller_who_is_not_the_Keeper_When_using_handouts_Then_everything_is_NotFound_before_any_Scene_is_read(string caller)
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);
        var (campaignId, accountId) = caller switch
        {
            "Player" => (_builder.CampaignId, ScenarioPreparationTestBuilder.PlayerAccountId),
            "OtherKeeper" => (_builder.CampaignId, ScenarioPreparationTestBuilder.OtherKeeperAccountId),
            _ => (Guid.NewGuid(), Keeper),
        };
        using var context = _builder.Fixture.CreateContext();
        var recording = new RecordingSceneRepository(new EfSceneRepository(context));
        var service = _builder.CreateHandoutService(context, recording);

        var got = await service.GetAsync(campaignId, accountId, scenarioId, sceneId, handout.Id, CancellationToken.None);
        var created = await service.CreateAsync(campaignId, accountId, scenarioId, sceneId, HandoutKind.Text, HandoutVisibility.KeeperFacing, "X", Text, CancellationToken.None);
        var edited = await service.EditAsync(campaignId, accountId, scenarioId, sceneId, handout.Id, HandoutKind.Text, HandoutVisibility.KeeperFacing, "X", Text, CancellationToken.None);
        var removed = await service.RemoveAsync(campaignId, accountId, scenarioId, sceneId, handout.Id, CancellationToken.None);
        var reordered = await service.ReorderAsync(campaignId, accountId, scenarioId, sceneId, [handout.Id], CancellationToken.None);

        Assert.Null(got);
        Assert.Equal(HandoutWriteOutcome.NotFound, created.Outcome);
        Assert.Equal(HandoutWriteOutcome.NotFound, edited.Outcome);
        Assert.Equal(HandoutRemoveOutcome.NotFound, removed);
        Assert.Equal(HandoutReorderOutcome.NotFound, reordered.Outcome);
        Assert.Empty(recording.Calls);
        Assert.Single(await StoredHandoutsAsync(scenarioId, sceneId));
    }

    [Fact]
    public async Task Given_a_scene_of_another_scenario_or_campaign_or_an_unknown_handout_When_using_ids_Then_everything_is_NotFound()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (otherScenarioId, _) = await SceneAsync();
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);

        var wrongScenario = await CreateAsync(otherScenarioId, sceneId);
        var wrongCampaign = await EditAsync(scenarioId, sceneId, handout.Id, campaignId: _builder.OtherCampaignOfSameKeeperId);
        var unknownHandout = await EditAsync(scenarioId, sceneId, Guid.NewGuid());
        var unknownRemoval = await RemoveAsync(scenarioId, sceneId, Guid.NewGuid());

        Assert.Equal(HandoutWriteOutcome.NotFound, wrongScenario.Outcome);
        Assert.Equal(HandoutWriteOutcome.NotFound, wrongCampaign.Outcome);
        Assert.Equal(HandoutWriteOutcome.NotFound, unknownHandout.Outcome);
        Assert.Equal(HandoutRemoveOutcome.NotFound, unknownRemoval);
        Assert.Single(await StoredHandoutsAsync(scenarioId, sceneId));
    }

    [Fact]
    public async Task Given_invalid_fields_When_creating_Then_the_matching_outcome_is_returned_and_nothing_is_stored()
    {
        var (scenarioId, sceneId) = await SceneAsync();

        var results = new[]
        {
            await CreateAsync(scenarioId, sceneId, " "),
            await CreateAsync(scenarioId, sceneId, kind: null),
            await CreateAsync(scenarioId, sceneId, visibility: null),
            await CreateAsync(scenarioId, sceneId, content: null),
            await CreateAsync(scenarioId, sceneId, content: Image),
            await CreateAsync(scenarioId, sceneId, content: Blank),
        };

        Assert.Equal(
            [
                HandoutWriteOutcome.InvalidTitle,
                HandoutWriteOutcome.InvalidKind,
                HandoutWriteOutcome.InvalidVisibility,
                HandoutWriteOutcome.MissingContent,
                HandoutWriteOutcome.InvalidContent,
                HandoutWriteOutcome.MissingContent,
            ],
            results.Select(result => result.Outcome));
        Assert.All(results, result => Assert.Null(result.Handout));
        Assert.Empty(await StoredHandoutsAsync(scenarioId, sceneId));
    }

    [Fact]
    public async Task Given_the_Keeper_When_editing_a_handout_Then_all_fields_including_the_kind_are_replaced_and_the_place_is_kept()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "First");
        var second = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "Second");

        var result = await EditAsync(scenarioId, sceneId, second.Id);

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        Assert.Equal(new HandoutView(second.Id, HandoutKind.Text, HandoutVisibility.KeeperFacing, "Renamed", Other), result.Handout);
        Assert.Equal(["First", "Renamed"], (await StoredHandoutsAsync(scenarioId, sceneId)).Select(handout => handout.Title));
    }

    [Fact]
    public async Task Given_invalid_fields_When_editing_Then_the_outcome_is_returned_and_the_handout_is_unchanged()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "Before");

        var result = await EditAsync(scenarioId, sceneId, handout.Id, content: Image);

        Assert.Equal(HandoutWriteOutcome.InvalidContent, result.Outcome);
        Assert.Equal("Before", Assert.Single(await StoredHandoutsAsync(scenarioId, sceneId)).Title);
    }

    [Fact]
    public async Task Given_an_active_scene_When_creating_editing_and_reordering_Then_all_are_accepted_and_removal_is_refused()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var first = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "First");
        var second = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "Second");
        await _builder.PlayAsync(sceneId, SceneStatus.Active);

        var created = await CreateAsync(scenarioId, sceneId, "Third");
        var edited = await EditAsync(scenarioId, sceneId, first.Id);
        var reordered = await ReorderAsync(scenarioId, sceneId, second.Id, first.Id, created.Handout!.Id);
        var removed = await RemoveAsync(scenarioId, sceneId, first.Id);

        Assert.Equal(
            (HandoutWriteOutcome.Saved, HandoutWriteOutcome.Saved, HandoutReorderOutcome.Reordered, HandoutRemoveOutcome.NotPrepared),
            (created.Outcome, edited.Outcome, reordered.Outcome, removed));
        Assert.Equal(["Second", "Renamed", "Third"], (await StoredHandoutsAsync(scenarioId, sceneId)).Select(handout => handout.Title));
    }

    [Fact]
    public async Task Given_a_finished_scene_When_changing_handouts_Then_Finished_or_NotPrepared_is_returned_and_nothing_changes()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "Before");
        await _builder.PlayAsync(sceneId, SceneStatus.Finished);

        var created = await CreateAsync(scenarioId, sceneId);
        var edited = await EditAsync(scenarioId, sceneId, handout.Id);
        var reordered = await ReorderAsync(scenarioId, sceneId, handout.Id);
        var removed = await RemoveAsync(scenarioId, sceneId, handout.Id);
        var removedUnknown = await RemoveAsync(scenarioId, sceneId, Guid.NewGuid());

        Assert.Equal(
            (HandoutWriteOutcome.Finished, HandoutWriteOutcome.Finished, HandoutReorderOutcome.Finished, HandoutRemoveOutcome.NotPrepared, HandoutRemoveOutcome.NotPrepared),
            (created.Outcome, edited.Outcome, reordered.Outcome, removed, removedUnknown));
        Assert.Equal("Before", Assert.Single(await StoredHandoutsAsync(scenarioId, sceneId)).Title);
    }

    [Fact]
    public async Task Given_a_prepared_scene_When_removing_a_handout_Then_it_is_removed_and_the_others_remain()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var removed = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "Removed");
        await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "Kept");

        var outcome = await RemoveAsync(scenarioId, sceneId, removed.Id);

        Assert.Equal(HandoutRemoveOutcome.Removed, outcome);
        Assert.Equal(["Kept"], (await StoredHandoutsAsync(scenarioId, sceneId)).Select(handout => handout.Title));
    }

    [Fact]
    public async Task Given_three_handouts_When_reordering_Then_the_new_order_is_stored_and_the_summaries_are_returned_in_it()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var first = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "First");
        var second = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "Second");
        var third = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "Third");

        var result = await ReorderAsync(scenarioId, sceneId, third.Id, first.Id, second.Id);

        Assert.Equal(HandoutReorderOutcome.Reordered, result.Outcome);
        Assert.Equal(["Third", "First", "Second"], result.Handouts!.Select(handout => handout.Title));
        Assert.Equal(result.Handouts, await StoredHandoutsAsync(scenarioId, sceneId));
    }

    [Fact]
    public async Task Given_a_duplicate_or_stale_list_When_reordering_Then_the_matching_outcome_is_returned_and_the_order_is_unchanged()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var first = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "First");
        var second = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "Second");

        var duplicate = await ReorderAsync(scenarioId, sceneId, first.Id, first.Id);
        var stale = await ReorderAsync(scenarioId, sceneId, second.Id);

        Assert.Equal(HandoutReorderOutcome.DuplicateIds, duplicate.Outcome);
        Assert.Equal(HandoutReorderOutcome.DoesNotMatchHandouts, stale.Outcome);
        Assert.Equal(["First", "Second"], (await StoredHandoutsAsync(scenarioId, sceneId)).Select(handout => handout.Title));
    }
}
