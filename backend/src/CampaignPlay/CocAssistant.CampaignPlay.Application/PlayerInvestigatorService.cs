namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// The Player's use cases for their own Investigator. Only a Player of the Campaign reaches their Investigator;
/// everyone else gets NotFound (specs/campaign-play/spec.md, Investigator visibility).
/// </summary>
public class PlayerInvestigatorService
{
    private readonly ICampaignRepository _campaigns;
    private readonly IInvestigatorRepository _investigators;
    private readonly IAccountDisplayNames _displayNames;
    private readonly CharacterSheetEvaluator _evaluator;
    private readonly IRollSource _rollSource;
    private readonly TimeProvider _timeProvider;

    public PlayerInvestigatorService(
        ICampaignRepository campaigns,
        IInvestigatorRepository investigators,
        IAccountDisplayNames displayNames,
        CharacterSheetEvaluator evaluator,
        IRollSource rollSource,
        TimeProvider timeProvider)
    {
        _campaigns = campaigns;
        _investigators = investigators;
        _displayNames = displayNames;
        _evaluator = evaluator;
        _rollSource = rollSource;
        _timeProvider = timeProvider;
    }

    public async Task<InvestigatorResult> CreateAsync(Guid campaignId, Guid playerAccountId, CancellationToken cancellationToken)
    {
        var campaign = await FindCampaignForPlayerAsync(campaignId, playerAccountId, cancellationToken);
        if (campaign is null)
        {
            return new InvestigatorResult(InvestigatorCommandOutcome.NotFound);
        }

        if (!SupportedCreationMethods.AnyAllowedBy(campaign.AllowedCreationMethods))
        {
            return new InvestigatorResult(InvestigatorCommandOutcome.CreationMethodsUnavailable);
        }

        if (await _investigators.FindForPlayerAsync(campaignId, playerAccountId, cancellationToken) is not null)
        {
            return new InvestigatorResult(InvestigatorCommandOutcome.AlreadyExists);
        }

        var investigator = Investigator.Create(campaignId, playerAccountId, _timeProvider.GetUtcNow());
        _investigators.Add(investigator);
        return await SaveAsync(investigator, InvestigatorCommandOutcome.AlreadyExists, cancellationToken);
    }

    public async Task<Investigator?> GetMineAsync(Guid campaignId, Guid playerAccountId, CancellationToken cancellationToken) =>
        (await FindMineAsync(campaignId, playerAccountId, cancellationToken))?.Investigator;

    public async Task<InvestigatorCommandOutcome> DeleteMineAsync(Guid campaignId, Guid playerAccountId, CancellationToken cancellationToken)
    {
        var mine = await FindMineAsync(campaignId, playerAccountId, cancellationToken);
        if (mine is null)
        {
            return InvestigatorCommandOutcome.NotFound;
        }

        if (!mine.Value.Investigator.CanStartOver)
        {
            return InvestigatorCommandOutcome.StatusConflict;
        }

        _investigators.Remove(mine.Value.Investigator);
        return (await SaveAsync(mine.Value.Investigator, InvestigatorCommandOutcome.StatusConflict, cancellationToken)).Outcome;
    }

    public async Task<CharacterSheetView?> GetMyCharacterSheetAsync(Guid campaignId, Guid playerAccountId, CancellationToken cancellationToken)
    {
        var mine = await FindMineAsync(campaignId, playerAccountId, cancellationToken);
        return mine is null ? null : await ViewAsync(mine.Value.Investigator, mine.Value.Campaign, cancellationToken);
    }

    public async Task<CharacterSheetResult> ReplaceMyCharacterSheetAsync(
        Guid campaignId,
        Guid playerAccountId,
        CharacterSheetInputs inputs,
        CancellationToken cancellationToken)
    {
        var mine = await FindMineAsync(campaignId, playerAccountId, cancellationToken);
        if (mine is null)
        {
            return new CharacterSheetResult(InvestigatorCommandOutcome.NotFound);
        }

        var (investigator, campaign) = mine.Value;
        if (!investigator.ReplaceCharacterSheet(inputs.ToCharacterSheet(_rollSource), _timeProvider.GetUtcNow()))
        {
            return new CharacterSheetResult(InvestigatorCommandOutcome.StatusConflict);
        }

        var saved = await SaveAsync(investigator, InvestigatorCommandOutcome.StatusConflict, cancellationToken);
        return saved.Outcome == InvestigatorCommandOutcome.Succeeded
            ? new CharacterSheetResult(saved.Outcome, await ViewAsync(investigator, campaign, cancellationToken))
            : new CharacterSheetResult(saved.Outcome);
    }

    public async Task<InvestigatorResult> SubmitMineAsync(Guid campaignId, Guid playerAccountId, CancellationToken cancellationToken)
    {
        var mine = await FindMineAsync(campaignId, playerAccountId, cancellationToken);
        if (mine is null)
        {
            return new InvestigatorResult(InvestigatorCommandOutcome.NotFound);
        }

        var (investigator, campaign) = mine.Value;
        if (!investigator.CanBeEditedByPlayer)
        {
            return new InvestigatorResult(InvestigatorCommandOutcome.StatusConflict);
        }

        var (_, errors) = _evaluator.Evaluate(investigator.CharacterSheet, campaign.AllowedCreationMethods);
        if (!investigator.Submit(errors, _timeProvider.GetUtcNow()))
        {
            return new InvestigatorResult(InvestigatorCommandOutcome.ValidationFailed, investigator, errors);
        }

        return await SaveAsync(investigator, InvestigatorCommandOutcome.StatusConflict, cancellationToken);
    }

    private async Task<Campaign?> FindCampaignForPlayerAsync(Guid campaignId, Guid playerAccountId, CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        return campaign is not null && campaign.IsPlayer(playerAccountId) ? campaign : null;
    }

    private async Task<(Investigator Investigator, Campaign Campaign)?> FindMineAsync(
        Guid campaignId,
        Guid playerAccountId,
        CancellationToken cancellationToken)
    {
        var campaign = await FindCampaignForPlayerAsync(campaignId, playerAccountId, cancellationToken);
        var investigator = campaign is null
            ? null
            : await _investigators.FindForPlayerAsync(campaignId, playerAccountId, cancellationToken);
        return investigator is null ? null : (investigator, campaign!);
    }

    private async Task<CharacterSheetView> ViewAsync(Investigator investigator, Campaign campaign, CancellationToken cancellationToken)
    {
        var names = await _displayNames.GetDisplayNamesAsync([investigator.PlayerAccountId], cancellationToken);
        return _evaluator.View(investigator, campaign, names.GetValueOrDefault(investigator.PlayerAccountId));
    }

    private async Task<InvestigatorResult> SaveAsync(
        Investigator investigator,
        InvestigatorCommandOutcome onConflict,
        CancellationToken cancellationToken)
    {
        try
        {
            await _investigators.SaveChangesAsync(cancellationToken);
            return new InvestigatorResult(InvestigatorCommandOutcome.Succeeded, investigator);
        }
        catch (InvestigatorConflictException)
        {
            return new InvestigatorResult(onConflict);
        }
    }
}
