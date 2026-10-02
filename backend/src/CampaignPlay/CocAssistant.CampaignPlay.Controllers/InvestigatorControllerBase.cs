namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>Maps Investigator use-case outcomes to HTTP results (specs/campaign-play/spec.md, Investigator API shapes).</summary>
public abstract class InvestigatorControllerBase : CampaignPlayControllerBase
{
    protected InvestigatorControllerBase(AccountService accountService)
        : base(accountService)
    {
    }

    /// <summary>The HTTP result for an outcome other than success.</summary>
    protected ActionResult Failure(InvestigatorCommandOutcome outcome, IReadOnlyList<ValidationError>? validationErrors = null) =>
        outcome switch
        {
            InvestigatorCommandOutcome.StatusConflict => Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "The Investigator's status does not allow this action."),
            InvestigatorCommandOutcome.AlreadyExists => Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "You already have an Investigator in this Campaign."),
            InvestigatorCommandOutcome.CreationMethodsUnavailable => Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "None of this Campaign's allowed creation methods is available yet."),
            InvestigatorCommandOutcome.ValidationFailed => ValidationFailed(validationErrors ?? []),
            InvestigatorCommandOutcome.InvalidChangeRequestComment => Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "A Change Request needs a comment of at most 2000 characters."),
            _ => NotFound(),
        };

    private ObjectResult ValidationFailed(IReadOnlyList<ValidationError> validationErrors)
    {
        var problem = ProblemDetailsFactory.CreateProblemDetails(
            HttpContext,
            StatusCodes.Status422UnprocessableEntity,
            "The Character Sheet has validation errors.");
        problem.Extensions["validationErrors"] = validationErrors.Select(CharacterSheetWireFormat.ToResponse).ToList();
        return new ObjectResult(problem)
        {
            StatusCode = StatusCodes.Status422UnprocessableEntity,
            ContentTypes = { "application/problem+json" },
        };
    }
}
