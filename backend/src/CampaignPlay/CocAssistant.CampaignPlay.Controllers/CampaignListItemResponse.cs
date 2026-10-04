namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>
/// A Campaign List item the caller runs as its Keeper (specs/campaign-list/spec.md, API); carries exactly these
/// properties.
/// </summary>
public sealed record KeeperCampaignListItemResponse(
    Guid Id,
    string Name,
    string Era,
    string Role,
    int PlayerCount,
    int PlayerLimit,
    int ApprovedInvestigatorCount,
    int AwaitingReviewCount)
{
    public static KeeperCampaignListItemResponse From(KeeperCampaignListItem item) =>
        new(
            item.Id,
            item.Name,
            item.Era.Code,
            nameof(CampaignRole.Keeper),
            item.PlayerCount,
            item.PlayerLimit,
            item.ApprovedInvestigatorCount,
            item.AwaitingReviewCount);
}

/// <summary>
/// A Campaign List item the caller plays in (specs/campaign-list/spec.md, API); never carries the Player limit, the
/// awaiting-review count, or any id other than the Campaign's.
/// </summary>
public sealed record PlayerCampaignListItemResponse(
    Guid Id,
    string Name,
    string Era,
    string Role,
    string KeeperName,
    int PlayerCount,
    int ApprovedInvestigatorCount,
    MyInvestigatorResponse? MyInvestigator)
{
    public static PlayerCampaignListItemResponse From(PlayerCampaignListItem item) =>
        new(
            item.Id,
            item.Name,
            item.Era.Code,
            nameof(CampaignRole.Player),
            item.KeeperName,
            item.PlayerCount,
            item.ApprovedInvestigatorCount,
            item.MyInvestigator is null ? null : new MyInvestigatorResponse(item.MyInvestigator.Status.ToString(), item.MyInvestigator.Name));
}

/// <summary>The caller's own Investigator on a Player item; Name is null while unnamed.</summary>
public sealed record MyInvestigatorResponse(string Status, string? Name);
