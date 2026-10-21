namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Linking, editing, and unlinking Non-Player Entities on a Scene as its Keeper (specs/scenario-preparation/spec.md). Everyone
/// else ends in NotFound before any Scene is read (ADR 0013); an entity outside the Campaign is a validation problem.
/// </summary>
public class NonPlayerEntityLinkServiceTests : IDisposable
{
    private const string Description = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"A shape\"}]}]}}";
    private const string Image = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\"}]}}";

    private static readonly Guid Keeper = ScenarioPreparationTestBuilder.KeeperAccountId;

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        return (scenario.Id, (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House")).Id);
    }

    private async Task<NonPlayerEntityLinkWriteResult> LinkAsync(
        Guid scenarioId, Guid sceneId, NonPlayerEntityType? type, Guid? entityId, string name = "A shape", string? description = null, Guid? campaignId = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateLinkService(context).LinkAsync(campaignId ?? _builder.CampaignId, Keeper, scenarioId, sceneId, type, entityId, name, description, CancellationToken.None);
    }

    private async Task<NonPlayerEntityLinkWriteResult> EditAsync(
        Guid scenarioId, Guid sceneId, Guid linkId, string name = "Renamed", string? description = null, Guid? campaignId = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateLinkService(context).EditAsync(campaignId ?? _builder.CampaignId, Keeper, scenarioId, sceneId, linkId, name, description, CancellationToken.None);
    }

    private async Task<NonPlayerEntityUnlinkOutcome> UnlinkAsync(Guid scenarioId, Guid sceneId, Guid linkId)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateLinkService(context).UnlinkAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, linkId, CancellationToken.None);
    }

    private async Task<IReadOnlyList<NonPlayerEntityLinkView>> StoredLinksAsync(Guid scenarioId, Guid sceneId) =>
        (await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.NonPlayerEntityLinks;

    [Fact]
    public async Task Given_the_Keeper_When_linking_a_human_npc_Then_the_trimmed_link_is_stored_and_the_view_carries_the_profile_name()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId, "Mr. Knott");

        var result = await LinkAsync(scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id, "  The landlord ", Description);

        Assert.Equal(NonPlayerEntityLinkWriteOutcome.Saved, result.Outcome);
        var link = result.Link!;
        Assert.Equal(
            (new NonPlayerEntitySummary(human.Id, NonPlayerEntityType.HumanNpc, "Mr. Knott"), "The landlord", Description),
            (link.NonPlayerEntity, link.PlayerFacingName, link.PlayerFacingDescription));
        Assert.Equal(link, Assert.Single(await StoredLinksAsync(scenarioId, sceneId)));
    }

    [Fact]
    public async Task Given_the_Keeper_When_linking_a_mythos_creature_with_no_description_Then_the_description_is_null()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var creature = await _builder.CreateMythosCreatureAsync(_builder.CampaignId, "Ghoul");

        var result = await LinkAsync(scenarioId, sceneId, NonPlayerEntityType.MythosCreature, creature.Id);

        Assert.Equal(
            ("Ghoul", NonPlayerEntityType.MythosCreature, null),
            (result.Link!.NonPlayerEntity.Name, result.Link.NonPlayerEntity.Type, result.Link.PlayerFacingDescription));
    }

    [Fact]
    public async Task Given_the_same_entity_When_linking_it_twice_Then_two_links_with_their_own_ids_are_stored()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var creature = await _builder.CreateMythosCreatureAsync(_builder.CampaignId);

        var first = await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.MythosCreature, creature.Id, "First");
        var second = await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.MythosCreature, creature.Id, "Second");

        Assert.NotEqual(first.Id, second.Id);
        Assert.Equal(["First", "Second"], (await StoredLinksAsync(scenarioId, sceneId)).Select(link => link.PlayerFacingName));
    }

    [Theory]
    [InlineData("Player")]
    [InlineData("OtherKeeper")]
    [InlineData("Stranger")]
    public async Task Given_a_caller_who_is_not_the_Keeper_When_using_links_Then_everything_is_NotFound_before_any_Scene_is_read(string caller)
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        var link = await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id);
        var (campaignId, accountId) = caller switch
        {
            "Player" => (_builder.CampaignId, ScenarioPreparationTestBuilder.PlayerAccountId),
            "OtherKeeper" => (_builder.CampaignId, ScenarioPreparationTestBuilder.OtherKeeperAccountId),
            _ => (Guid.NewGuid(), Keeper),
        };
        using var context = _builder.Fixture.CreateContext();
        var recording = new RecordingSceneRepository(new EfSceneRepository(context));
        var service = _builder.CreateLinkService(context, recording);

        var linked = await service.LinkAsync(campaignId, accountId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id, "X", null, CancellationToken.None);
        var edited = await service.EditAsync(campaignId, accountId, scenarioId, sceneId, link.Id, "X", null, CancellationToken.None);
        var unlinked = await service.UnlinkAsync(campaignId, accountId, scenarioId, sceneId, link.Id, CancellationToken.None);

        Assert.Equal(NonPlayerEntityLinkWriteOutcome.NotFound, linked.Outcome);
        Assert.Equal(NonPlayerEntityLinkWriteOutcome.NotFound, edited.Outcome);
        Assert.Equal(NonPlayerEntityUnlinkOutcome.NotFound, unlinked);
        Assert.Empty(recording.Calls);
        Assert.Equal(1, await _builder.StoredLinkCountAsync());
    }

    [Fact]
    public async Task Given_a_scene_of_another_scenario_or_campaign_When_using_its_id_Then_everything_is_NotFound()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (otherScenarioId, _) = await SceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        var link = await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id);

        var wrongScenario = await LinkAsync(otherScenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id);
        var wrongCampaign = await EditAsync(scenarioId, sceneId, link.Id, campaignId: _builder.OtherCampaignOfSameKeeperId);
        var unknownScene = await UnlinkAsync(scenarioId, Guid.NewGuid(), link.Id);

        Assert.Equal(NonPlayerEntityLinkWriteOutcome.NotFound, wrongScenario.Outcome);
        Assert.Equal(NonPlayerEntityLinkWriteOutcome.NotFound, wrongCampaign.Outcome);
        Assert.Equal(NonPlayerEntityUnlinkOutcome.NotFound, unknownScene);
        Assert.Equal(1, await _builder.StoredLinkCountAsync());
    }

    [Fact]
    public async Task Given_an_entity_outside_the_Campaign_or_a_wrong_type_or_a_missing_reference_When_linking_Then_it_is_refused_and_nothing_is_stored()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        var elsewhere = await _builder.CreateHumanNpcAsync(_builder.OtherCampaignOfSameKeeperId, "Elsewhere");

        var results = new[]
        {
            await LinkAsync(scenarioId, sceneId, NonPlayerEntityType.HumanNpc, elsewhere.Id),
            await LinkAsync(scenarioId, sceneId, NonPlayerEntityType.HumanNpc, Guid.NewGuid()),
            await LinkAsync(scenarioId, sceneId, NonPlayerEntityType.MythosCreature, human.Id),
            await LinkAsync(scenarioId, sceneId, null, human.Id),
            await LinkAsync(scenarioId, sceneId, NonPlayerEntityType.HumanNpc, null),
        };

        Assert.All(results, result => Assert.Equal(NonPlayerEntityLinkWriteOutcome.NonPlayerEntityNotInCampaign, result.Outcome));
        Assert.Equal(0, await _builder.StoredLinkCountAsync());
    }

    [Fact]
    public async Task Given_an_invalid_name_or_description_When_linking_Then_the_matching_outcome_is_returned_and_nothing_is_stored()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId);

        var emptyName = await LinkAsync(scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id, "  ");
        var badDescription = await LinkAsync(scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id, "Name", Image);

        Assert.Equal(NonPlayerEntityLinkWriteOutcome.InvalidPlayerFacingName, emptyName.Outcome);
        Assert.Equal(NonPlayerEntityLinkWriteOutcome.InvalidPlayerFacingDescription, badDescription.Outcome);
        Assert.Equal(0, await _builder.StoredLinkCountAsync());
    }

    [Fact]
    public async Task Given_an_active_scene_When_linking_editing_and_unlinking_Then_all_three_are_accepted()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        await _builder.PlayAsync(sceneId, SceneStatus.Active);

        var linked = await LinkAsync(scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id);
        var edited = await EditAsync(scenarioId, sceneId, linked.Link!.Id);
        var unlinked = await UnlinkAsync(scenarioId, sceneId, linked.Link.Id);

        Assert.Equal(
            (NonPlayerEntityLinkWriteOutcome.Saved, NonPlayerEntityLinkWriteOutcome.Saved, NonPlayerEntityUnlinkOutcome.Unlinked),
            (linked.Outcome, edited.Outcome, unlinked));
    }

    [Fact]
    public async Task Given_a_finished_scene_When_linking_editing_and_unlinking_Then_Finished_is_returned_and_the_links_are_unchanged()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        var existing = await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id, "Before");
        await _builder.PlayAsync(sceneId, SceneStatus.Finished);

        var linked = await LinkAsync(scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id);
        var edited = await EditAsync(scenarioId, sceneId, existing.Id);
        var unlinked = await UnlinkAsync(scenarioId, sceneId, existing.Id);

        Assert.Equal(
            (NonPlayerEntityLinkWriteOutcome.Finished, NonPlayerEntityLinkWriteOutcome.Finished, NonPlayerEntityUnlinkOutcome.Finished),
            (linked.Outcome, edited.Outcome, unlinked));
        Assert.Equal(existing, Assert.Single(await StoredLinksAsync(scenarioId, sceneId)));
    }

    [Fact]
    public async Task Given_a_link_When_editing_it_Then_the_new_fields_are_stored_and_the_entity_is_unchanged()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var creature = await _builder.CreateMythosCreatureAsync(_builder.CampaignId, "Ghoul");
        var link = await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.MythosCreature, creature.Id, "Before", Description);

        var result = await EditAsync(scenarioId, sceneId, link.Id, " After ", null);

        Assert.Equal(NonPlayerEntityLinkWriteOutcome.Saved, result.Outcome);
        var stored = Assert.Single(await StoredLinksAsync(scenarioId, sceneId));
        Assert.Equal(
            (link.Id, "Ghoul", "After", null),
            (stored.Id, stored.NonPlayerEntity.Name, stored.PlayerFacingName, stored.PlayerFacingDescription));
        Assert.Equal(stored, result.Link);
    }

    [Fact]
    public async Task Given_invalid_fields_or_an_unknown_link_When_editing_Then_it_is_refused_and_the_link_is_unchanged()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        var link = await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id, "Before");

        var emptyName = await EditAsync(scenarioId, sceneId, link.Id, string.Empty);
        var badDescription = await EditAsync(scenarioId, sceneId, link.Id, "After", Image);
        var unknown = await EditAsync(scenarioId, sceneId, Guid.NewGuid());

        Assert.Equal(
            (NonPlayerEntityLinkWriteOutcome.InvalidPlayerFacingName, NonPlayerEntityLinkWriteOutcome.InvalidPlayerFacingDescription, NonPlayerEntityLinkWriteOutcome.NotFound),
            (emptyName.Outcome, badDescription.Outcome, unknown.Outcome));
        Assert.Equal(link, Assert.Single(await StoredLinksAsync(scenarioId, sceneId)));
    }

    [Fact]
    public async Task Given_two_links_When_unlinking_one_Then_only_it_is_removed_and_the_profile_is_untouched()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        var kept = await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id, "Kept");
        var removed = await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id, "Removed");

        var outcome = await UnlinkAsync(scenarioId, sceneId, removed.Id);
        var again = await UnlinkAsync(scenarioId, sceneId, removed.Id);

        Assert.Equal((NonPlayerEntityUnlinkOutcome.Unlinked, NonPlayerEntityUnlinkOutcome.NotFound), (outcome, again));
        Assert.Equal(kept, Assert.Single(await StoredLinksAsync(scenarioId, sceneId)));
        Assert.Equal(1, await _builder.StoredHumanNpcCountAsync());
    }

    [Fact]
    public async Task Given_a_profile_renamed_after_linking_When_reading_the_scene_Then_the_link_shows_the_live_profile_name()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId, "Mr. Knott");
        await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id);
        using (var context = _builder.Fixture.CreateContext())
        {
            var edit = await _builder.CreateHumanNpcService(context).EditAsync(_builder.CampaignId, Keeper, human.Id, "Mr. Knott Jr.", NpcProfileSamples.Narrative(62), CancellationToken.None);
            Assert.Equal(HumanNpcWriteOutcome.Saved, edit.Outcome);
        }

        var link = Assert.Single(await StoredLinksAsync(scenarioId, sceneId));

        Assert.Equal("Mr. Knott Jr.", link.NonPlayerEntity.Name);
    }
}
