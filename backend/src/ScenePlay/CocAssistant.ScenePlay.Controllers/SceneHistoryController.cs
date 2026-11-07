namespace CocAssistant.ScenePlay.Controllers;

/// <summary>
/// The Campaign's Scene History: the played Scenes of every Scenario, newest started first (specs/scene-play/spec.md, Scene
/// History; PBI-SPL-004). A Player sees only the Reveals that reached their Investigator; everyone else gets 404.
/// </summary>
[Route("api/campaigns/{campaignId:guid}/scene-history")]
public class SceneHistoryController : ScenePlayControllerBase
{
    private readonly SceneHistoryService _history;

    public SceneHistoryController(SceneHistoryService history, AccountService accountService)
        : base(accountService)
    {
        _history = history;
    }

    /// <summary>The Campaign's played Scenes as the caller may see them.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        return await _history.ListAsync(campaignId, accountId.Value, cancellationToken) switch
        {
            KeeperSceneHistoryRead keeper => Ok(new KeeperSceneHistoryResponse(keeper.Scenes.Select(ToResponse).ToList())),
            PlayerSceneHistoryRead player => Ok(new PlayerSceneHistoryResponse(player.InvestigatorName, player.Scenes.Select(ToResponse).ToList())),
            _ => NotFound(),
        };
    }

    private static KeeperHistorySceneResponse ToResponse(KeeperHistorySceneView view) =>
        new(
            view.SceneId,
            view.ScenarioId,
            view.ScenarioTitle,
            view.Title,
            view.StartedAt,
            view.FinishedAt,
            view.InvestigatorsPresent.Select(investigator => new InvestigatorPresentResponse(investigator.Id, investigator.Name)).ToList(),
            view.Reveals.Select(RevealMapping.ToResponse).ToList());

    private static PlayerHistorySceneResponse ToResponse(PlayerHistorySceneView view) =>
        new(
            view.SceneId,
            view.ScenarioTitle,
            view.Title,
            view.StartedAt,
            view.FinishedAt,
            view.Reveals.Select(RevealMapping.ToResponse).ToList());
}
