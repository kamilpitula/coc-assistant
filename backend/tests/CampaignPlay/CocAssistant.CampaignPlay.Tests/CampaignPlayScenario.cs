namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Use-case helper that sets up Campaigns and their Players through the real application services,
/// each step in its own DbContext like a separate request.
/// </summary>
public sealed class CampaignPlayScenario : IDisposable
{
    public static readonly Guid KeeperAccountId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid PlayerAccountId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid OtherPlayerAccountId = Guid.Parse("33333333-3333-3333-3333-333333333333");
    public static readonly Guid StrangerAccountId = Guid.Parse("44444444-4444-4444-4444-444444444444");

    public SqliteCampaignPlayDbContextFixture Fixture { get; } = new();

    public FakeTimeProvider TimeProvider { get; } = new(new DateTimeOffset(2026, 10, 2, 12, 0, 0, TimeSpan.Zero));

    /// <summary>Creates a Campaign owned by <see cref="KeeperAccountId"/> unless another Keeper is given.</summary>
    public async Task<Guid> CreateCampaignAsync(AllowedCreationMethods? allowedCreationMethods = null, Guid? keeperAccountId = null)
    {
        using var context = Fixture.CreateContext();
        var service = new CampaignService(Fixture.CreateRepository(context), TimeProvider);
        var campaign = await service.CreateCampaignAsync(
            "The Haunting", keeperAccountId ?? KeeperAccountId, null, null, allowedCreationMethods, CancellationToken.None);
        return campaign.Id;
    }

    /// <summary>Admits the Account as a Player through a fresh Invite issued by the Campaign's Keeper.</summary>
    public async Task JoinAsPlayerAsync(Guid campaignId, Guid playerAccountId, Guid? keeperAccountId = null)
    {
        using var context = Fixture.CreateContext();
        var membership = new CampaignMembershipService(Fixture.CreateRepository(context), TimeProvider);
        var invite = await membership.IssueInviteAsync(campaignId, keeperAccountId ?? KeeperAccountId, CancellationToken.None);
        await membership.JoinAsync(invite!.Token, playerAccountId, CancellationToken.None);
    }

    /// <summary>Replaces the allowed Creation Methods as the Campaign's Keeper.</summary>
    public async Task ChangeAllowedCreationMethodsAsync(Guid campaignId, AllowedCreationMethods allowedCreationMethods)
    {
        using var context = Fixture.CreateContext();
        var service = new CampaignService(Fixture.CreateRepository(context), TimeProvider);
        await service.ChangeAllowedCreationMethodsAsync(campaignId, KeeperAccountId, allowedCreationMethods, CancellationToken.None);
    }

    public static readonly ICreationRuleData RuleData = new EmbeddedResourceCreationRuleData();

    public PlayerInvestigatorService PlayerService(
        CampaignPlayDbContext context,
        IInvestigatorRepository? investigators = null,
        IDiceRoller? roller = null)
    {
        var ruleSets = new CreationRuleSets(RuleData, [EmbeddedResourceEraRuleData.For1920s()]);
        return new(
            Fixture.CreateRepository(context),
            investigators ?? Fixture.CreateInvestigatorRepository(context),
            new InMemoryAccountDisplayNames(),
            new CharacterSheetEvaluator(ruleSets),
            ruleSets,
            roller ?? new ScriptedDiceRoller([]),
            TimeProvider);
    }

    public KeeperInvestigatorService KeeperService(CampaignPlayDbContext context) =>
        new(
            Fixture.CreateRepository(context),
            Fixture.CreateInvestigatorRepository(context),
            new InMemoryAccountDisplayNames(),
            new CharacterSheetEvaluator(new CreationRuleSets(RuleData, [EmbeddedResourceEraRuleData.For1920s()])),
            TimeProvider);

    /// <summary>Creates the Player's Draft Investigator and returns its id.</summary>
    public async Task<Guid> CreateDraftAsync(Guid campaignId, Guid playerAccountId)
    {
        using var context = Fixture.CreateContext();
        var result = await PlayerService(context).CreateAsync(campaignId, playerAccountId, CancellationToken.None);
        return result.Investigator!.Id;
    }

    /// <summary>Saves the Character Sheet inputs as the Player.</summary>
    public async Task<CharacterSheetResult> SaveCharacterSheetAsync(Guid campaignId, Guid playerAccountId, CharacterSheetInputs inputs)
    {
        using var context = Fixture.CreateContext();
        return await PlayerService(context).ReplaceMyCharacterSheetAsync(campaignId, playerAccountId, inputs, CancellationToken.None);
    }

    /// <summary>Rolls the Player's Luck and next EDU improvement check with scripted faces.</summary>
    public async Task RollLuckAndEduAsync(Guid campaignId, Guid playerAccountId, IDiceRoller roller)
    {
        using var luckContext = Fixture.CreateContext();
        await PlayerService(luckContext, roller: roller).RollMyLuckAsync(campaignId, playerAccountId, CancellationToken.None);
        using var eduContext = Fixture.CreateContext();
        await PlayerService(eduContext, roller: roller).RollMyEduImprovementCheckAsync(campaignId, playerAccountId, CancellationToken.None);
    }

    /// <summary>Creates a Draft with a valid Point Buy sheet and submits it; returns the Investigator id.</summary>
    public async Task<Guid> CreateSubmittedAsync(Guid campaignId, Guid playerAccountId)
    {
        var investigatorId = await CreateDraftAsync(campaignId, playerAccountId);
        await SaveCharacterSheetAsync(campaignId, playerAccountId, new CharacterSheetBuilder().BuildInputs());
        // A 25-year-old rolls one Luck (3D6) and one EDU check (D100); 30 is no improvement, so no gain is rolled.
        await RollLuckAndEduAsync(campaignId, playerAccountId, new ScriptedDiceRoller([4, 5, 6, 30]));
        using var context = Fixture.CreateContext();
        await PlayerService(context).SubmitMineAsync(campaignId, playerAccountId, CancellationToken.None);
        return investigatorId;
    }

    /// <summary>Approves a Submitted Investigator as the Campaign's Keeper.</summary>
    public async Task ApproveAsync(Guid campaignId, Guid investigatorId)
    {
        using var context = Fixture.CreateContext();
        await KeeperService(context).ApproveAsync(campaignId, investigatorId, KeeperAccountId, CancellationToken.None);
    }

    /// <summary>Requests changes to a Submitted Investigator as the Campaign's Keeper.</summary>
    public async Task RequestChangesAsync(Guid campaignId, Guid investigatorId, string comment)
    {
        using var context = Fixture.CreateContext();
        await KeeperService(context).RequestChangesAsync(campaignId, investigatorId, KeeperAccountId, comment, CancellationToken.None);
    }

    /// <summary>Reads the Investigator as stored.</summary>
    public async Task<Investigator?> LoadInvestigatorAsync(Guid campaignId, Guid investigatorId)
    {
        using var context = Fixture.CreateContext();
        return await Fixture.CreateInvestigatorRepository(context).FindByIdAsync(campaignId, investigatorId, CancellationToken.None);
    }

    public void Dispose() => Fixture.Dispose();
}
