namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>The provider service Scene Play calls to give, take back, and list held Items (ADR 0029). It performs no authorization.</summary>
public class ItemHolderCommandServiceTests : IDisposable
{
    private static readonly Guid Harvey = SceneStartExtensions.Harvey;
    private static readonly Guid Lucy = SceneStartExtensions.Lucy;
    private static readonly Guid[] Approved = [Harvey, Lucy];

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        return (scenario.Id, (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House")).Id);
    }

    private async Task StartAsync(Guid sceneId, params Guid[] present)
    {
        using var context = _builder.Fixture.CreateContext();
        var result = await _builder.CreateLifecycleService(context)
            .StartAsync(_builder.CampaignId, sceneId, present.Length == 0 ? [Harvey, Lucy] : present, Approved, false, CancellationToken.None);
        Assert.Equal(SceneStartOutcome.Started, result.Outcome);
    }

    private async Task<ItemGiveResult> GiveAsync(Guid itemId, Guid investigatorId, Guid? campaignId = null, IItemRepository? items = null)
    {
        using var context = _builder.Fixture.CreateContext();
        var service = new ItemHolderCommandService(
            new EfSceneRepository(context),
            items ?? new EfItemRepository(context),
            _builder.TimeProvider);
        _builder.TimeProvider.Advance(TimeSpan.FromMinutes(1));
        return await service.GiveAsync(campaignId ?? _builder.CampaignId, itemId, investigatorId, CancellationToken.None);
    }

    private async Task<ItemTakeBackResult> TakeBackAsync(Guid itemId, Guid? campaignId = null, IItemRepository? items = null)
    {
        using var context = _builder.Fixture.CreateContext();
        var service = new ItemHolderCommandService(
            new EfSceneRepository(context),
            items ?? new EfItemRepository(context),
            _builder.TimeProvider);
        _builder.TimeProvider.Advance(TimeSpan.FromMinutes(1));
        return await service.TakeBackAsync(campaignId ?? _builder.CampaignId, itemId, CancellationToken.None);
    }

    private async Task<IReadOnlyList<HeldItemView>> HeldAsync(Guid investigatorId)
    {
        using var context = _builder.Fixture.CreateContext();
        return await new ItemHolderCommandService(new EfSceneRepository(context), new EfItemRepository(context), _builder.TimeProvider)
            .ListHeldAsync(_builder.CampaignId, investigatorId, CancellationToken.None);
    }

    [Fact]
    public async Task Given_no_active_scene_When_giving_Then_it_is_refused_and_nothing_changes()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);

        var result = await GiveAsync(item.Id, Harvey);

        Assert.Equal(ItemGiveOutcome.NoActiveScene, result.Outcome);
        Assert.Null(result.Reveal);
        using var context = _builder.Fixture.CreateContext();
        Assert.Equal(0, (await new EfItemRepository(context).FindByIdAsync(_builder.CampaignId, item.Id, CancellationToken.None))!.Version);
    }

    [Fact]
    public async Task Given_no_active_scene_and_a_missing_item_When_giving_Then_it_is_not_found()
    {
        await SceneAsync();

        var result = await GiveAsync(Guid.NewGuid(), Harvey);

        Assert.Equal(ItemGiveOutcome.ItemNotFound, result.Outcome);
    }

    [Fact]
    public async Task Given_an_item_of_another_campaign_When_giving_Then_it_is_not_found()
    {
        var (_, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.OtherCampaignOfSameKeeperId);
        await StartAsync(sceneId);

        var result = await GiveAsync(item.Id, Harvey);

        Assert.Equal(ItemGiveOutcome.ItemNotFound, result.Outcome);
    }

    [Fact]
    public async Task Given_an_item_not_linked_to_the_active_scene_When_giving_Then_it_is_refused()
    {
        var (_, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await StartAsync(sceneId);

        var result = await GiveAsync(item.Id, Harvey);

        Assert.Equal(ItemGiveOutcome.NotLinked, result.Outcome);
    }

    [Fact]
    public async Task Given_an_investigator_not_present_When_giving_Then_it_is_refused()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await StartAsync(sceneId, Harvey);

        var result = await GiveAsync(item.Id, Lucy);

        Assert.Equal(ItemGiveOutcome.RecipientNotPresent, result.Outcome);
    }

    [Fact]
    public async Task Given_the_current_holder_When_giving_Then_it_is_refused_and_unchanged()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await StartAsync(sceneId);
        Assert.Equal(ItemGiveOutcome.Given, (await GiveAsync(item.Id, Harvey)).Outcome);

        var result = await GiveAsync(item.Id, Harvey);

        Assert.Equal(ItemGiveOutcome.AlreadyHolder, result.Outcome);
        Assert.Null(result.Reveal);
        using var context = _builder.Fixture.CreateContext();
        Assert.Equal(1, (await new EfItemRepository(context).FindByIdAsync(_builder.CampaignId, item.Id, CancellationToken.None))!.Version);
    }

    [Fact]
    public async Task Given_a_linked_item_When_giving_Then_the_holder_gets_an_item_reveal()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await StartAsync(sceneId);

        var result = await GiveAsync(item.Id, Harvey);

        Assert.Equal(ItemGiveOutcome.Given, result.Outcome);
        Assert.Null(result.FormerHolderId);
        Assert.Equal([Harvey], result.Reveal!.RecipientIds);
        Assert.Equal((RevealSubjectType.Item, item.Id), (result.Reveal.SubjectType, result.Reveal.SubjectId));
        using var context = _builder.Fixture.CreateContext();
        var stored = await new EfItemRepository(context).FindByIdAsync(_builder.CampaignId, item.Id, CancellationToken.None);
        Assert.Equal((Harvey, result.Reveal.Id, 1), (stored!.HolderInvestigatorId, stored.HolderRevealId, stored.Version));
    }

    [Fact]
    public async Task Given_a_held_item_When_giving_to_someone_else_Then_it_moves_and_returns_the_former_holder()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await StartAsync(sceneId);
        Assert.Equal(ItemGiveOutcome.Given, (await GiveAsync(item.Id, Harvey)).Outcome);

        var result = await GiveAsync(item.Id, Lucy);

        Assert.Equal(ItemGiveOutcome.Given, result.Outcome);
        Assert.Equal(Harvey, result.FormerHolderId);
        using var context = _builder.Fixture.CreateContext();
        Assert.Equal(Lucy, (await new EfItemRepository(context).FindByIdAsync(_builder.CampaignId, item.Id, CancellationToken.None))!.HolderInvestigatorId);
    }

    [Fact]
    public async Task Given_a_write_wins_the_race_When_giving_Then_it_is_a_conflict_and_nothing_changes()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await StartAsync(sceneId);
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingItemRepository(new EfItemRepository(context))
        {
            BeforeSave = async () =>
            {
                using var other = _builder.Fixture.CreateContext();
                var rival = await other.Items.SingleAsync(candidate => candidate.Id == item.Id);
                rival.MarkInPlay();
                await other.SaveChangesAsync();
            },
        };

        var result = await GiveAsync(item.Id, Harvey, null, racing);

        Assert.Equal(ItemGiveOutcome.Conflict, result.Outcome);
        using var read = _builder.Fixture.CreateContext();
        Assert.Null((await new EfItemRepository(read).FindByIdAsync(_builder.CampaignId, item.Id, CancellationToken.None))!.HolderInvestigatorId);
    }

    [Fact]
    public async Task Given_no_holder_When_taking_back_Then_nothing_changes()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);

        var result = await TakeBackAsync(item.Id);

        Assert.Equal(ItemTakeBackOutcome.NotHeld, result.Outcome);
        Assert.Null(result.FormerHolderId);
        using var context = _builder.Fixture.CreateContext();
        Assert.Equal(0, (await new EfItemRepository(context).FindByIdAsync(_builder.CampaignId, item.Id, CancellationToken.None))!.Version);
    }

    [Fact]
    public async Task Given_a_missing_item_When_taking_back_Then_it_is_not_found()
    {
        var result = await TakeBackAsync(Guid.NewGuid());

        Assert.Equal(ItemTakeBackOutcome.ItemNotFound, result.Outcome);
    }

    [Fact]
    public async Task Given_a_held_item_When_taking_back_Then_no_one_holds_it_and_the_reveal_stays()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await StartAsync(sceneId);
        Assert.Equal(ItemGiveOutcome.Given, (await GiveAsync(item.Id, Harvey)).Outcome);

        var result = await TakeBackAsync(item.Id);

        Assert.Equal(ItemTakeBackOutcome.TakenBack, result.Outcome);
        Assert.Equal(Harvey, result.FormerHolderId);
        using var context = _builder.Fixture.CreateContext();
        var stored = await new EfItemRepository(context).FindByIdAsync(_builder.CampaignId, item.Id, CancellationToken.None);
        Assert.Equal((null, null), (stored!.HolderInvestigatorId, stored.HolderRevealId));
        Assert.Equal(1, await context.Set<Reveal>().CountAsync());
    }

    [Fact]
    public async Task Given_a_write_wins_the_race_When_taking_back_Then_it_is_a_conflict_and_the_holder_stays()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await StartAsync(sceneId);
        Assert.Equal(ItemGiveOutcome.Given, (await GiveAsync(item.Id, Harvey)).Outcome);
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingItemRepository(new EfItemRepository(context))
        {
            BeforeSave = async () =>
            {
                using var other = _builder.Fixture.CreateContext();
                var rival = await other.Items.SingleAsync(candidate => candidate.Id == item.Id);
                rival.MarkInPlay();
                await other.SaveChangesAsync();
            },
        };

        var result = await TakeBackAsync(item.Id, null, racing);

        Assert.Equal(ItemTakeBackOutcome.Conflict, result.Outcome);
        using var read = _builder.Fixture.CreateContext();
        Assert.Equal(Harvey, (await new EfItemRepository(read).FindByIdAsync(_builder.CampaignId, item.Id, CancellationToken.None))!.HolderInvestigatorId);
    }

    [Fact]
    public async Task Given_held_items_When_listing_Then_they_come_newest_first_with_their_give_snapshots()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var first = await _builder.CreateItemAsync(_builder.CampaignId, "Diary");
        var second = await _builder.CreateItemAsync(_builder.CampaignId, "Key");
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, first.Id);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, second.Id);
        await StartAsync(sceneId);
        var firstGive = await GiveAsync(first.Id, Harvey);
        var secondGive = await GiveAsync(second.Id, Harvey);

        var held = await HeldAsync(Harvey);

        Assert.Equal([second.Id, first.Id], held.Select(entry => entry.ItemId));
        Assert.Equal([secondGive.Reveal!.Id, firstGive.Reveal!.Id], held.Select(entry => entry.GiveReveal.Id));
        Assert.All(held, entry => Assert.Equal(Harvey, entry.InvestigatorId));
        Assert.Empty(await HeldAsync(Lucy));
    }
}
