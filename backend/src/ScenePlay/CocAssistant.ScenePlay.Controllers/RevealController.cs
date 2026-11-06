namespace CocAssistant.ScenePlay.Controllers;

/// <summary>
/// Revealing material of the Active Scene and reading a Reveal's file (specs/scene-play/spec.md, API Contracts; PBI-SPL-002 D3, D5).
/// Campaign members only: non-members and missing Campaigns get 404 on every call, a Player gets 404 on a Reveal, and a file is
/// served only to the Keeper and to a Player whose Approved Investigator received the Reveal.
/// </summary>
[Route("api/campaigns/{campaignId:guid}")]
public class RevealController : ScenePlayControllerBase
{
    private readonly RevealService _reveals;

    public RevealController(RevealService reveals, AccountService accountService)
        : base(accountService)
    {
        _reveals = reveals;
    }

    /// <summary>Reveals Player-facing material of the Active Scene: a Handout, a Non-Player Entity link, or an Item. Returns the created Reveal as the Keeper sees it.</summary>
    [HttpPost("active-scene/reveals")]
    public async Task<ActionResult<KeeperRevealResponse>> Reveal(Guid campaignId, RevealRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var kind = ParseKind(request.Subject?.Type);
        var result = await _reveals.RevealAsync(campaignId, accountId.Value, kind, request.Subject?.Id ?? Guid.Empty, request.InvestigatorIds, cancellationToken);
        return result.Reveal is not null ? Ok(RevealMapping.ToResponse(result.Reveal)) : Failure(result.Outcome);
    }

    /// <summary>The Reveal's snapshotted file as an attachment with its stored media type; 404 for anyone who did not receive it; 503 when storage fails.</summary>
    [HttpGet("reveals/{revealId:guid}/file")]
    public async Task<IActionResult> DownloadFile(Guid campaignId, Guid revealId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _reveals.OpenFileAsync(campaignId, accountId.Value, revealId, cancellationToken);
        return result.Outcome switch
        {
            RevealFileOutcome.Opened => this.DownloadRevealFile(result.Download!),
            RevealFileOutcome.StorageFailed => Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: RevealProblems.StorageFailedTitle),
            _ => NotFound(),
        };
    }

    // A missing or unknown type is Unknown, so the 409 for no Active Scene still wins over it.
    private static RevealSubjectKind ParseKind(string? type) =>
        Enum.TryParse<RevealSubjectKind>(type, ignoreCase: true, out var kind) && kind != RevealSubjectKind.Unknown && Enum.IsDefined(kind)
            ? kind
            : RevealSubjectKind.Unknown;

    private ActionResult Failure(RevealSceneOutcome outcome) =>
        outcome switch
        {
            RevealSceneOutcome.NoActiveScene => Problem(statusCode: StatusCodes.Status409Conflict, title: ActiveSceneProblems.NoActiveSceneTitle),
            RevealSceneOutcome.SubjectNotRevealable => Invalid(RevealProblems.SubjectTypeKey, RevealProblems.UnknownTypeMessage),
            RevealSceneOutcome.SubjectNotFound => Invalid(RevealProblems.SubjectIdKey, RevealProblems.SubjectNotFoundMessage),
            RevealSceneOutcome.SubjectKeeperFacing => Invalid(RevealProblems.SubjectIdKey, RevealProblems.KeeperFacingMessage),
            RevealSceneOutcome.NoRecipient => Invalid(RevealProblems.InvestigatorIdsKey, RevealProblems.NoRecipientMessage),
            RevealSceneOutcome.DuplicateRecipient => Invalid(RevealProblems.InvestigatorIdsKey, RevealProblems.DuplicateRecipientMessage),
            RevealSceneOutcome.RecipientNotPresent => Invalid(RevealProblems.InvestigatorIdsKey, RevealProblems.RecipientNotPresentMessage),
            RevealSceneOutcome.Conflict => Problem(statusCode: StatusCodes.Status409Conflict, title: ItemHolderProblems.ConflictTitle),
            _ => NotFound(),
        };

    private ActionResult Invalid(string key, string message)
    {
        ModelState.AddModelError(key, message);
        return ValidationProblem(ModelState);
    }
}

/// <summary>
/// The download headers of a Reveal's file. They repeat the three lines of the Scenario Preparation download on purpose: that helper is
/// internal to its Controllers project and Scene Play may not reference it (ADR 0013, PBI-SPL-002 D3), so this is a documented DRY exception.
/// </summary>
internal static class RevealFileResults
{
    public static IActionResult DownloadRevealFile(this ControllerBase controller, RevealFileDownload download)
    {
        controller.Response.Headers.XContentTypeOptions = "nosniff";
        controller.Response.Headers.CacheControl = "private, no-store";
        return controller.File(download.Content, download.File.MediaType, download.File.Name);
    }
}
