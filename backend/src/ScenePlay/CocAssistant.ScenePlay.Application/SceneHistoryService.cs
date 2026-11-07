namespace CocAssistant.ScenePlay.Application;

/// <summary>
/// Reads the Scene History for a Campaign Member (specs/scene-play/spec.md, Scene History; PBI-SPL-004 D1). The authorization is
/// here and nowhere else: a non-member gets a NotAMember read before any port is called, the Keeper sees every played Scene with
/// every Reveal, and a Player sees only the Reveals that reached their own Approved Investigator.
/// </summary>
public class SceneHistoryService
{
    private readonly ICampaignRoles _roles;
    private readonly IApprovedInvestigators _approved;
    private readonly ISceneHistory _history;

    public SceneHistoryService(ICampaignRoles roles, IApprovedInvestigators approved, ISceneHistory history)
    {
        _roles = roles;
        _approved = approved;
        _history = history;
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
        return role == CampaignMemberRole.Keeper
            ? new KeeperSceneHistoryRead(played.Select(scene => SceneHistoryProjection.ForKeeper(scene, approved)).ToList())
            : ForPlayer(played, approved.FirstOrDefault(investigator => investigator.PlayerAccountId == callerAccountId));
    }

    private static PlayerSceneHistoryRead ForPlayer(IReadOnlyList<PlayedScene> played, ApprovedInvestigatorRef? mine) =>
        new(mine?.Name, played.Select(scene => SceneHistoryProjection.ForPlayer(scene, mine?.InvestigatorId)).ToList());
}
