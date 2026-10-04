namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// One Campaign in the caller's Campaign List, projected for the caller's role (specs/campaign-list/spec.md, Item
/// content by role). It carries no Account ids, Investigator ids, or Character Sheet data.
/// </summary>
public abstract record CampaignListItem(Guid Id, string Name, Era Era, int PlayerCount, int ApprovedInvestigatorCount);

/// <summary>A Campaign the caller runs as its Keeper.</summary>
public sealed record KeeperCampaignListItem(
    Guid Id,
    string Name,
    Era Era,
    int PlayerCount,
    int PlayerLimit,
    int ApprovedInvestigatorCount,
    int AwaitingReviewCount)
    : CampaignListItem(Id, Name, Era, PlayerCount, ApprovedInvestigatorCount);

/// <summary>A Campaign the caller plays in; never carries the Player limit or counts of others' unapproved work.</summary>
public sealed record PlayerCampaignListItem(
    Guid Id,
    string Name,
    Era Era,
    string KeeperName,
    int PlayerCount,
    int ApprovedInvestigatorCount,
    OwnInvestigator? MyInvestigator)
    : CampaignListItem(Id, Name, Era, PlayerCount, ApprovedInvestigatorCount);

/// <summary>The caller's own Investigator in a Campaign they play in; Name is null while unnamed.</summary>
public sealed record OwnInvestigator(InvestigatorStatus Status, string? Name);
