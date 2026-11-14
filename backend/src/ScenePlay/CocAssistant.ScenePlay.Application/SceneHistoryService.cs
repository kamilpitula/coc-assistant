namespace CocAssistant.ScenePlay.Application;

/// <summary>
/// Reads the Scene History for a Campaign Member (specs/scene-play/spec.md, Scene History; PBI-SPL-004 D1). The authorization is
/// here and nowhere else: a non-member gets a NotAMember read before any port is called, the Keeper sees every played Scene with
/// every Reveal and Roll Request, and a Player sees only the Reveals that reached their own Approved Investigator and the Public
/// Roll Requests (specs/roll-requests/spec.md, Scene History).
/// </summary>
public class SceneHistoryService
{
    private readonly ICampaignRoles _roles;
    private readonly IApprovedInvestigators _approved;
    private readonly ISceneHistory _history;
    private readonly IAccountNames _names;

    public SceneHistoryService(ICampaignRoles roles, IApprovedInvestigators approved, ISceneHistory history, IAccountNames names)
    {
        _roles = roles;
        _approved = approved;
        _history = history;
        _names = names;
    }

    /// <summary>The Campaign's played Scenes for the caller; a NotAMember read for a caller who is not a member.</summary>
    public async Task<SceneHistoryRead> ListAsync(Guid campaignId, Guid callerAccountId, CancellationToken cancellationToken)
    {
        var role = await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken);
        if (role is null)
        {
            return new NotAMemberHistoryRead();
        }

        var approved = await _approved.ListAsync(campaignId, cancellationToken);
        var played = await _history.ListPlayedAsync(campaignId, cancellationToken);
        var rollerNames = await RollerNames.ResolveAsync(_names, played.SelectMany(scene => scene.RollRequests.SelectMany(request => request.RequestedRolls)), cancellationToken);
        return role == CampaignMemberRole.Keeper
            ? new KeeperSceneHistoryRead(played.Select(scene => SceneHistoryProjection.ForKeeper(scene, approved, rollerNames)).ToList())
            : ForPlayer(played, approved, approved.FirstOrDefault(investigator => investigator.PlayerAccountId == callerAccountId), rollerNames);
    }

    private static PlayerSceneHistoryRead ForPlayer(
        IReadOnlyList<PlayedScene> played,
        IReadOnlyList<ApprovedInvestigatorRef> approved,
        ApprovedInvestigatorRef? mine,
        IReadOnlyDictionary<Guid, string> rollerNames) =>
        new(mine?.Name, played.Select(scene => SceneHistoryProjection.ForPlayer(scene, approved, mine?.InvestigatorId, rollerNames)).ToList());
}
