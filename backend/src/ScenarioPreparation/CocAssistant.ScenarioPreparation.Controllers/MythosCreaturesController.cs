namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// A Campaign's Mythos Creatures for its Keeper (specs/scenario-preparation/spec.md). Everyone else, and every id from
/// another Campaign or of another type, gets the same 404 (ADR 0013). A refused write is a 400 keyed by request path
/// (ADR 0018).
/// </summary>
[Route("api/campaigns/{campaignId:guid}/mythos-creatures")]
public class MythosCreaturesController : ScenarioPreparationControllerBase
{
    private readonly MythosCreatureService _mythosCreatureService;

    public MythosCreaturesController(MythosCreatureService mythosCreatureService, AccountService accountService)
        : base(accountService)
    {
        _mythosCreatureService = mythosCreatureService;
    }

    /// <summary>Creates a Mythos Creature from its name; the profile starts empty.</summary>
    [HttpPost]
    public async Task<ActionResult<MythosCreatureResponse>> Create(Guid campaignId, MythosCreatureCreateRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _mythosCreatureService.CreateAsync(campaignId, accountId.Value, request.Name, cancellationToken);
        return result.Outcome == MythosCreatureWriteOutcome.Saved
            ? StatusCode(StatusCodes.Status201Created, MythosCreatureMapping.ToResponse(result.MythosCreature!))
            : Failure(result);
    }

    /// <summary>One Mythos Creature with its Monster Profile and worked-out values.</summary>
    [HttpGet("{mythosCreatureId:guid}")]
    public async Task<ActionResult<MythosCreatureResponse>> Get(Guid campaignId, Guid mythosCreatureId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var view = await _mythosCreatureService.GetAsync(campaignId, accountId.Value, mythosCreatureId, cancellationToken);
        return view is null ? NotFound() : Ok(MythosCreatureMapping.ToResponse(view));
    }

    /// <summary>Replaces the name and the whole Monster Profile.</summary>
    [HttpPut("{mythosCreatureId:guid}")]
    public async Task<ActionResult<MythosCreatureResponse>> Edit(Guid campaignId, Guid mythosCreatureId, MythosCreatureRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _mythosCreatureService.EditAsync(
            campaignId,
            accountId.Value,
            mythosCreatureId,
            request.Name,
            MythosCreatureMapping.ToProfile(request),
            cancellationToken);
        return result.Outcome == MythosCreatureWriteOutcome.Saved ? Ok(MythosCreatureMapping.ToResponse(result.MythosCreature!)) : Failure(result);
    }

    /// <summary>Duplicates a MythosCreature within its Campaign: 201 with the copy, or 404 for every refused caller.</summary>
    [HttpPost("{mythosCreatureId:guid}/duplicate")]
    public async Task<ActionResult<MythosCreatureResponse>> Duplicate(Guid campaignId, Guid mythosCreatureId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var view = await _mythosCreatureService.DuplicateAsync(campaignId, accountId.Value, mythosCreatureId, cancellationToken);
        return view is null ? NotFound() : StatusCode(StatusCodes.Status201Created, MythosCreatureMapping.ToResponse(view));
    }

    /// <summary>Deletes a Mythos Creature. 409 when it is linked to an Active or Finished Scene.</summary>
    [HttpDelete("{mythosCreatureId:guid}")]
    public async Task<IActionResult> Delete(Guid campaignId, Guid mythosCreatureId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var outcome = await _mythosCreatureService.DeleteAsync(campaignId, accountId.Value, mythosCreatureId, cancellationToken);
        return outcome switch
        {
            MythosCreatureDeleteOutcome.Deleted => NoContent(),
            MythosCreatureDeleteOutcome.LinkedToPlayedScene => Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: NonPlayerEntityLinkProblemMessages.LinkedToPlayedSceneTitle),
            _ => NotFound(),
        };
    }

    private ActionResult Failure(MythosCreatureWriteResult result)
    {
        if (result.Outcome != MythosCreatureWriteOutcome.Invalid)
        {
            return NotFound();
        }

        foreach (var problem in result.Problems)
        {
            ModelState.AddModelError(problem.Path, MonsterProfileProblemMessages.For(problem));
        }

        return ValidationProblem(ModelState);
    }
}
