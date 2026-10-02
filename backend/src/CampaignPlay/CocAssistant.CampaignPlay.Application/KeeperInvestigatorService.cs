namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// The Keeper's use cases for a Campaign's Investigators: the list, the review read, Character Approval, and Change
/// Requests. A Draft is visible to the Keeper only as a list row; anyone but the Campaign's Keeper gets NotFound.
/// </summary>
public class KeeperInvestigatorService
{
    private readonly ICampaignRepository _campaigns;
    private readonly IInvestigatorRepository _investigators;
    private readonly IAccountDisplayNames _displayNames;
    private readonly CharacterSheetEvaluator _evaluator;
    private readonly TimeProvider _timeProvider;

    public KeeperInvestigatorService(
        ICampaignRepository campaigns,
        IInvestigatorRepository investigators,
        IAccountDisplayNames displayNames,
        CharacterSheetEvaluator evaluator,
        TimeProvider timeProvider)
    {
        _campaigns = campaigns;
        _investigators = investigators;
        _displayNames = displayNames;
        _evaluator = evaluator;
        _timeProvider = timeProvider;
    }

    /// <summary>Every Investigator in the Campaign with its Player's name; null when the caller is not the Keeper.</summary>
    public async Task<IReadOnlyList<InvestigatorListItem>?> ListAsync(Guid campaignId, Guid keeperAccountId, CancellationToken cancellationToken)
    {
        if (await FindCampaignForKeeperAsync(campaignId, keeperAccountId, cancellationToken) is null)
        {
            return null;
        }

        var investigators = await _investigators.ListForCampaignAsync(campaignId, cancellationToken);
        var names = await _displayNames.GetDisplayNamesAsync(
            investigators.Select(investigator => investigator.PlayerAccountId).ToList(), cancellationToken);
        return investigators
            .Select(investigator => new InvestigatorListItem(investigator, names.GetValueOrDefault(investigator.PlayerAccountId)))
            .ToList();
    }

    /// <summary>A non-Draft Investigator of the Keeper's Campaign; null for anything outside the Keeper's visibility.</summary>
    public async Task<CharacterSheetView?> GetAsync(Guid campaignId, Guid investigatorId, Guid keeperAccountId, CancellationToken cancellationToken)
    {
        var found = await FindVisibleAsync(campaignId, investigatorId, keeperAccountId, cancellationToken);
        return found is null ? null : await ViewAsync(found.Value.Investigator, found.Value.Campaign, cancellationToken);
    }

    public Task<CharacterSheetResult> ApproveAsync(Guid campaignId, Guid investigatorId, Guid keeperAccountId, CancellationToken cancellationToken) =>
        ChangeAsync(campaignId, investigatorId, keeperAccountId, investigator => investigator.Approve(_timeProvider.GetUtcNow()), cancellationToken);

    public Task<CharacterSheetResult> RequestChangesAsync(
        Guid campaignId,
        Guid investigatorId,
        Guid keeperAccountId,
        string comment,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(comment) || comment.Length > Investigator.ChangeRequestCommentMaxLength)
        {
            return Task.FromResult(new CharacterSheetResult(InvestigatorCommandOutcome.InvalidChangeRequestComment));
        }

        return ChangeAsync(
            campaignId,
            investigatorId,
            keeperAccountId,
            investigator => investigator.RequestChanges(comment, _timeProvider.GetUtcNow()),
            cancellationToken);
    }

    private async Task<CharacterSheetResult> ChangeAsync(
        Guid campaignId,
        Guid investigatorId,
        Guid keeperAccountId,
        Func<Investigator, bool> change,
        CancellationToken cancellationToken)
    {
        var found = await FindVisibleAsync(campaignId, investigatorId, keeperAccountId, cancellationToken);
        if (found is null)
        {
            return new CharacterSheetResult(InvestigatorCommandOutcome.NotFound);
        }

        var (investigator, campaign) = found.Value;
        if (!change(investigator))
        {
            return new CharacterSheetResult(InvestigatorCommandOutcome.StatusConflict);
        }

        try
        {
            await _investigators.SaveChangesAsync(cancellationToken);
        }
        catch (InvestigatorConflictException)
        {
            return new CharacterSheetResult(InvestigatorCommandOutcome.StatusConflict);
        }

        return new CharacterSheetResult(InvestigatorCommandOutcome.Succeeded, await ViewAsync(investigator, campaign, cancellationToken));
    }

    private async Task<Campaign?> FindCampaignForKeeperAsync(Guid campaignId, Guid keeperAccountId, CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        return campaign is not null && campaign.IsKeeper(keeperAccountId) ? campaign : null;
    }

    private async Task<(Investigator Investigator, Campaign Campaign)?> FindVisibleAsync(
        Guid campaignId,
        Guid investigatorId,
        Guid keeperAccountId,
        CancellationToken cancellationToken)
    {
        var campaign = await FindCampaignForKeeperAsync(campaignId, keeperAccountId, cancellationToken);
        var investigator = campaign is null
            ? null
            : await _investigators.FindByIdAsync(campaignId, investigatorId, cancellationToken);
        return investigator is { IsVisibleToKeeper: true } ? (investigator, campaign!) : null;
    }

    private async Task<CharacterSheetView> ViewAsync(Investigator investigator, Campaign campaign, CancellationToken cancellationToken)
    {
        var names = await _displayNames.GetDisplayNamesAsync([investigator.PlayerAccountId], cancellationToken);
        return _evaluator.View(investigator, campaign, names.GetValueOrDefault(investigator.PlayerAccountId));
    }
}
