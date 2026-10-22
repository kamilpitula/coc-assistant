namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// A Scene's Non-Player Entity links for its Campaign's Keeper (specs/scenario-preparation/spec.md). Everyone else, and every id
/// from another Scenario or Campaign, gets the same 404 (ADR 0013, ADR 0016). There is no GET: the Scene response carries the links.
/// </summary>
[Route("api/campaigns/{campaignId:guid}/scenarios/{scenarioId:guid}/scenes/{sceneId:guid}/non-player-entity-links")]
public class NonPlayerEntityLinksController : ScenarioPreparationControllerBase
{
    private readonly NonPlayerEntityLinkService _linkService;

    public NonPlayerEntityLinksController(NonPlayerEntityLinkService linkService, AccountService accountService)
        : base(accountService)
    {
        _linkService = linkService;
    }

    /// <summary>Links an entity of the Campaign to the Scene. 409 when the Scene is Finished.</summary>
    [HttpPost]
    public async Task<ActionResult<NonPlayerEntityLinkResponse>> Link(
        Guid campaignId,
        Guid scenarioId,
        Guid sceneId,
        NonPlayerEntityLinkRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _linkService.LinkAsync(
            campaignId,
            accountId.Value,
            scenarioId,
            sceneId,
            ParseType(request.NonPlayerEntity?.Type),
            request.NonPlayerEntity?.Id,
            request.PlayerFacingName ?? string.Empty,
            request.PlayerFacingDescription?.GetRawText(),
            cancellationToken);
        return result.Outcome == NonPlayerEntityLinkWriteOutcome.Saved
            ? StatusCode(StatusCodes.Status201Created, ToResponse(result.Link!))
            : Failure(result.Outcome, request.PlayerFacingName);
    }

    /// <summary>Replaces the link's Player-facing name and description. 409 when the Scene is Finished.</summary>
    [HttpPut("{linkId:guid}")]
    public async Task<ActionResult<NonPlayerEntityLinkResponse>> Edit(
        Guid campaignId,
        Guid scenarioId,
        Guid sceneId,
        Guid linkId,
        NonPlayerEntityLinkEditRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _linkService.EditAsync(
            campaignId,
            accountId.Value,
            scenarioId,
            sceneId,
            linkId,
            request.PlayerFacingName ?? string.Empty,
            request.PlayerFacingDescription?.GetRawText(),
            cancellationToken);
        return result.Outcome == NonPlayerEntityLinkWriteOutcome.Saved
            ? Ok(ToResponse(result.Link!))
            : Failure(result.Outcome, request.PlayerFacingName);
    }

    /// <summary>Removes the link; the profile is untouched. 409 when the Scene is Finished.</summary>
    [HttpDelete("{linkId:guid}")]
    public async Task<IActionResult> Unlink(Guid campaignId, Guid scenarioId, Guid sceneId, Guid linkId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var outcome = await _linkService.UnlinkAsync(campaignId, accountId.Value, scenarioId, sceneId, linkId, cancellationToken);
        return outcome switch
        {
            NonPlayerEntityUnlinkOutcome.Unlinked => NoContent(),
            NonPlayerEntityUnlinkOutcome.Finished => Problem(statusCode: StatusCodes.Status409Conflict, title: SceneProblemTitles.Finished),
            _ => NotFound(),
        };
    }

    internal static NonPlayerEntityLinkResponse ToResponse(NonPlayerEntityLinkView view) =>
        new(
            view.Id,
            new NonPlayerEntitySummaryResponse(view.NonPlayerEntity.Id, view.NonPlayerEntity.Type.ToString(), view.NonPlayerEntity.Name),
            view.PlayerFacingName,
            RichTextJson.Parse(view.PlayerFacingDescription));

    // Only the two wire names are accepted, case-sensitively, so numbers and odd casings are not types.
    private static NonPlayerEntityType? ParseType(string? type) => type switch
    {
        nameof(NonPlayerEntityType.HumanNpc) => NonPlayerEntityType.HumanNpc,
        nameof(NonPlayerEntityType.MythosCreature) => NonPlayerEntityType.MythosCreature,
        _ => null,
    };

    private ActionResult Failure(NonPlayerEntityLinkWriteOutcome outcome, string? submittedName) =>
        outcome switch
        {
            NonPlayerEntityLinkWriteOutcome.NonPlayerEntityNotInCampaign => Invalid(
                NonPlayerEntityLinkProblemMessages.NonPlayerEntityKey,
                NonPlayerEntityLinkProblemMessages.NonPlayerEntity),
            NonPlayerEntityLinkWriteOutcome.InvalidPlayerFacingName => Invalid(
                NonPlayerEntityLinkProblemMessages.PlayerFacingNameKey,
                NonPlayerEntityLinkProblemMessages.PlayerFacingName(submittedName)),
            NonPlayerEntityLinkWriteOutcome.InvalidPlayerFacingDescription => Invalid(
                NonPlayerEntityLinkProblemMessages.PlayerFacingDescriptionKey,
                NonPlayerEntityLinkProblemMessages.PlayerFacingDescription),
            NonPlayerEntityLinkWriteOutcome.Finished => Problem(statusCode: StatusCodes.Status409Conflict, title: SceneProblemTitles.Finished),
            _ => NotFound(),
        };

    private ActionResult Invalid(string field, string message)
    {
        ModelState.AddModelError(field, message);
        return ValidationProblem(ModelState);
    }
}
