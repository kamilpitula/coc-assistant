namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// A Campaign's Scenarios for its Keeper (specs/scenario-preparation/spec.md). Everyone else, and every id from another
/// Campaign, gets the same 404 (ADR 0013).
/// </summary>
[Route("api/campaigns/{campaignId:guid}/scenarios")]
public class ScenariosController : ScenarioPreparationControllerBase
{
    private readonly ScenarioService _scenarioService;

    public ScenariosController(ScenarioService scenarioService, AccountService accountService)
        : base(accountService)
    {
        _scenarioService = scenarioService;
    }

    /// <summary>The Campaign's Scenarios in Campaign order.</summary>
    [HttpGet]
    public async Task<ActionResult<ScenarioListResponse>> List(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var scenarios = await _scenarioService.ListAsync(campaignId, accountId.Value, cancellationToken);
        return scenarios is null ? NotFound() : Ok(ToListResponse(scenarios));
    }

    /// <summary>Appends a Scenario after the existing ones.</summary>
    [HttpPost]
    public async Task<ActionResult<ScenarioResponse>> Create(Guid campaignId, ScenarioRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _scenarioService.CreateAsync(campaignId, accountId.Value, request.Title ?? string.Empty, request.KeeperNotes, cancellationToken);
        return result.Outcome == ScenarioWriteOutcome.Saved
            ? StatusCode(StatusCodes.Status201Created, ToResponse(result.Scenario!))
            : Failure(result.Outcome);
    }

    /// <summary>One Scenario.</summary>
    [HttpGet("{scenarioId:guid}")]
    public async Task<ActionResult<ScenarioResponse>> Get(Guid campaignId, Guid scenarioId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var scenario = await _scenarioService.GetAsync(campaignId, accountId.Value, scenarioId, cancellationToken);
        return scenario is null ? NotFound() : Ok(ToResponse(scenario));
    }

    /// <summary>Replaces a Scenario's Title and Keeper notes; its place in the order is unchanged.</summary>
    [HttpPut("{scenarioId:guid}")]
    public async Task<ActionResult<ScenarioResponse>> Edit(
        Guid campaignId,
        Guid scenarioId,
        ScenarioRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _scenarioService.EditAsync(campaignId, accountId.Value, scenarioId, request.Title ?? string.Empty, request.KeeperNotes, cancellationToken);
        return result.Outcome == ScenarioWriteOutcome.Saved ? Ok(ToResponse(result.Scenario!)) : Failure(result.Outcome);
    }

    /// <summary>Replaces the order with the full list of the Campaign's Scenario ids; a stale or foreign list is a 409.</summary>
    [HttpPut("order")]
    public async Task<ActionResult<ScenarioListResponse>> Reorder(
        Guid campaignId,
        ScenarioOrderRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _scenarioService.ReorderAsync(campaignId, accountId.Value, request.ScenarioIds, cancellationToken);
        return result.Outcome switch
        {
            ScenarioReorderOutcome.Reordered => Ok(ToListResponse(result.Scenarios!)),
            ScenarioReorderOutcome.DuplicateIds => Invalid("scenarioIds", "The Scenario ids must not repeat."),
            ScenarioReorderOutcome.DoesNotMatchScenarios => Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "The order does not match the Campaign's current Scenarios."),
            _ => NotFound(),
        };
    }

    private ActionResult Failure(ScenarioWriteOutcome outcome) =>
        outcome switch
        {
            ScenarioWriteOutcome.InvalidTitle => Invalid("title", $"The title must be between 1 and {Scenario.TitleMaxLength} characters."),
            ScenarioWriteOutcome.InvalidKeeperNotes => Invalid("keeperNotes", $"The Keeper notes must be at most {Scenario.KeeperNotesMaxLength} characters."),
            _ => NotFound(),
        };

    private ActionResult Invalid(string field, string message)
    {
        ModelState.AddModelError(field, message);
        return ValidationProblem(ModelState);
    }

    private static ScenarioResponse ToResponse(ScenarioView view) => new(view.Id, view.Title, view.KeeperNotes);

    private static ScenarioListResponse ToListResponse(IReadOnlyList<ScenarioView> views) => new(views.Select(ToResponse).ToList());
}
