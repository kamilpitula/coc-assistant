namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// A Campaign's Human NPCs for its Keeper (specs/scenario-preparation/spec.md). Everyone else, and every id from another
/// Campaign, gets the same 404 (ADR 0013). A refused write is a 400 keyed by request path (ADR 0018).
/// </summary>
[Route("api/campaigns/{campaignId:guid}/human-npcs")]
public class HumanNpcsController : ScenarioPreparationControllerBase
{
    private readonly HumanNpcService _humanNpcService;

    public HumanNpcsController(HumanNpcService humanNpcService, AccountService accountService)
        : base(accountService)
    {
        _humanNpcService = humanNpcService;
    }

    /// <summary>Creates a Human NPC from its name and age; the profile starts narrative-only.</summary>
    [HttpPost]
    public async Task<ActionResult<HumanNpcResponse>> Create(Guid campaignId, HumanNpcCreateRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _humanNpcService.CreateAsync(campaignId, accountId.Value, request.Name, request.Age, cancellationToken);
        return result.Outcome == HumanNpcWriteOutcome.Saved
            ? StatusCode(StatusCodes.Status201Created, HumanNpcMapping.ToResponse(result.HumanNpc!))
            : Failure(result);
    }

    /// <summary>One Human NPC with its NPC Profile and worked-out values.</summary>
    [HttpGet("{humanNpcId:guid}")]
    public async Task<ActionResult<HumanNpcResponse>> Get(Guid campaignId, Guid humanNpcId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var view = await _humanNpcService.GetAsync(campaignId, accountId.Value, humanNpcId, cancellationToken);
        return view is null ? NotFound() : Ok(HumanNpcMapping.ToResponse(view));
    }

    /// <summary>Replaces the name and the whole NPC Profile.</summary>
    [HttpPut("{humanNpcId:guid}")]
    public async Task<ActionResult<HumanNpcResponse>> Edit(Guid campaignId, Guid humanNpcId, HumanNpcRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _humanNpcService.EditAsync(
            campaignId,
            accountId.Value,
            humanNpcId,
            request.Name,
            HumanNpcMapping.ToProfile(request),
            cancellationToken);
        return result.Outcome == HumanNpcWriteOutcome.Saved ? Ok(HumanNpcMapping.ToResponse(result.HumanNpc!)) : Failure(result);
    }

    /// <summary>Deletes a Human NPC.</summary>
    [HttpDelete("{humanNpcId:guid}")]
    public async Task<IActionResult> Delete(Guid campaignId, Guid humanNpcId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var outcome = await _humanNpcService.DeleteAsync(campaignId, accountId.Value, humanNpcId, cancellationToken);
        return outcome == HumanNpcDeleteOutcome.Deleted ? NoContent() : NotFound();
    }

    private ActionResult Failure(HumanNpcWriteResult result)
    {
        if (result.Outcome != HumanNpcWriteOutcome.Invalid)
        {
            return NotFound();
        }

        foreach (var problem in result.Problems)
        {
            ModelState.AddModelError(problem.Path, NpcProfileProblemMessages.For(problem));
        }

        return ValidationProblem(ModelState);
    }
}
