namespace CocAssistant.ScenePlay.Application;

/// <summary>How giving an Item ended. NotFound is for a caller who is not the Keeper; the other refusals are the provider's, in its order.</summary>
public enum GiveItemOutcome
{
    Given,
    NotFound,
    ItemNotFound,
    NoActiveScene,
    NotLinked,
    RecipientNotPresent,
    AlreadyHolder,
    Conflict,
}

/// <summary>The created give Reveal as the Keeper sees it, and the former holder when the Item moved, when <see cref="GiveItemOutcome.Given"/>.</summary>
public sealed record GiveItemResult(GiveItemOutcome Outcome, KeeperRevealView? Reveal, Guid? FormerHolderId);

/// <summary>How taking back an Item ended. NotFound is for a caller who is not the Keeper.</summary>
public enum TakeBackItemOutcome
{
    TakenBack,
    NotFound,
    ItemNotFound,
    NotHeld,
    Conflict,
}

/// <summary>The former holder when <see cref="TakeBackItemOutcome.TakenBack"/>; otherwise null.</summary>
public sealed record TakeBackItemResult(TakeBackItemOutcome Outcome, Guid? FormerHolderId);

/// <summary>A held Item: its id and the Player view of the give Reveal snapshot that set the holder.</summary>
public sealed record HeldItemView(Guid ItemId, PlayerRevealView Reveal);

/// <summary>An Investigator's held Items, newest first, with the Investigator's name.</summary>
public sealed record HeldItemsResult(string? InvestigatorName, IReadOnlyList<HeldItemView> Items);

/// <summary>
/// Gives and takes back Items for its Keeper, and reads an Investigator's held Items (specs/scene-play/spec.md; PBI-SPL-003 D5).
/// The authorization is here and nowhere else: the Keeper check runs first on a write, so a Player or non-member gets NotFound
/// before any port is touched, and a Player reads only their own Approved Investigator's Items, with Item ids for the Keeper only
/// at the controller boundary. After a holder change commits, the live signal follows; a failure of it is logged and never fails
/// the call (ADR 0024).
/// </summary>
public class ItemHolderService
{
    private readonly ICampaignRoles _roles;
    private readonly ISceneItemHolders _holders;
    private readonly IApprovedInvestigators _approved;
    private readonly IItemHolderSignals _signals;
    private readonly ILogger<ItemHolderService> _logger;

    public ItemHolderService(
        ICampaignRoles roles,
        ISceneItemHolders holders,
        IApprovedInvestigators approved,
        IItemHolderSignals signals,
        ILogger<ItemHolderService> logger)
    {
        _roles = roles;
        _holders = holders;
        _approved = approved;
        _signals = signals;
        _logger = logger;
    }

    /// <summary>Gives the Item to the Investigator; returns the created give Reveal as the Keeper sees it.</summary>
    public async Task<GiveItemResult> GiveAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid itemId,
        Guid investigatorId,
        CancellationToken cancellationToken)
    {
        if (await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken) != CampaignMemberRole.Keeper)
        {
            return new GiveItemResult(GiveItemOutcome.NotFound, null, null);
        }

        var result = await _holders.GiveAsync(campaignId, itemId, investigatorId, cancellationToken);
        if (result.Outcome != ItemGiveOutcome.Given)
        {
            return new GiveItemResult(Enum.Parse<GiveItemOutcome>(result.Outcome.ToString()), null, null);
        }

        var approved = await _approved.ListAsync(campaignId, cancellationToken);
        await TrySignalAsync(campaignId, AccountOf(approved, investigatorId), AccountOf(approved, result.FormerHolderId), cancellationToken);
        return new GiveItemResult(GiveItemOutcome.Given, RevealProjection.ForKeeper(result.Reveal!, approved), result.FormerHolderId);
    }

    /// <summary>Takes the Item back; taking back an unheld Item changes nothing and signals nothing.</summary>
    public async Task<TakeBackItemResult> TakeBackAsync(Guid campaignId, Guid callerAccountId, Guid itemId, CancellationToken cancellationToken)
    {
        if (await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken) != CampaignMemberRole.Keeper)
        {
            return new TakeBackItemResult(TakeBackItemOutcome.NotFound, null);
        }

        var result = await _holders.TakeBackAsync(campaignId, itemId, cancellationToken);
        if (result.Outcome != ItemTakeBackOutcome.TakenBack)
        {
            return new TakeBackItemResult(Enum.Parse<TakeBackItemOutcome>(result.Outcome.ToString()), null);
        }

        var approved = await _approved.ListAsync(campaignId, cancellationToken);
        await TrySignalAsync(campaignId, null, AccountOf(approved, result.FormerHolderId), cancellationToken);
        return new TakeBackItemResult(TakeBackItemOutcome.TakenBack, result.FormerHolderId);
    }

    /// <summary>The calling Player's held Items; null unless the caller is a Player with an Approved Investigator in the Campaign.</summary>
    public async Task<HeldItemsResult?> ListMyItemsAsync(Guid campaignId, Guid callerAccountId, CancellationToken cancellationToken)
    {
        if (await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken) != CampaignMemberRole.Player)
        {
            return null;
        }

        var mine = (await _approved.ListAsync(campaignId, cancellationToken)).FirstOrDefault(investigator => investigator.PlayerAccountId == callerAccountId);
        return mine is null ? null : await ReadHeldAsync(campaignId, mine, cancellationToken);
    }

    /// <summary>An Approved Investigator's held Items for the Keeper; null for anyone else or for an Investigator who is not Approved in the Campaign.</summary>
    public async Task<HeldItemsResult?> ListInvestigatorItemsAsync(Guid campaignId, Guid callerAccountId, Guid investigatorId, CancellationToken cancellationToken)
    {
        if (await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken) != CampaignMemberRole.Keeper)
        {
            return null;
        }

        var investigator = (await _approved.ListAsync(campaignId, cancellationToken)).FirstOrDefault(candidate => candidate.InvestigatorId == investigatorId);
        return investigator is null ? null : await ReadHeldAsync(campaignId, investigator, cancellationToken);
    }

    private async Task<HeldItemsResult> ReadHeldAsync(Guid campaignId, ApprovedInvestigatorRef investigator, CancellationToken cancellationToken)
    {
        var held = await _holders.ListHeldAsync(campaignId, investigator.InvestigatorId, cancellationToken);
        return new HeldItemsResult(investigator.Name, held.Select(item => new HeldItemView(item.ItemId, RevealProjection.ForPlayer(item.GiveReveal))).ToList());
    }

    private static Guid? AccountOf(IReadOnlyList<ApprovedInvestigatorRef> approved, Guid? investigatorId) =>
        investigatorId is null ? null : approved.FirstOrDefault(candidate => candidate.InvestigatorId == investigatorId)?.PlayerAccountId;

    private async Task TrySignalAsync(Guid campaignId, Guid? gainerAccountId, Guid? loserAccountId, CancellationToken cancellationToken)
    {
        try
        {
            await _signals.ItemHolderChangedAsync(campaignId, gainerAccountId, loserAccountId, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(exception, "The Item holder signal for Campaign {CampaignId} could not be published.", campaignId);
        }
    }
}
