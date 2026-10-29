namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// Maps the outcomes of the shared Handout services to HTTP results for all four Handout controllers (a Scene's and an Item's,
/// JSON and multipart), so the same 400, 409, 413, and 503 answers are written once (PBI-SP-008 D3). Extension methods keep the
/// controllers free of a shared base class.
/// </summary>
internal static class HandoutActionResults
{
    public static ActionResult JsonWriteFailure(this ControllerBase controller, HandoutWriteOutcome outcome, string? submittedTitle) =>
        outcome switch
        {
            HandoutWriteOutcome.InvalidTitle => controller.Invalid(HandoutProblemMessages.TitleKey, HandoutProblemMessages.Title(submittedTitle)),
            HandoutWriteOutcome.InvalidKind => controller.Invalid(HandoutProblemMessages.KindKey, HandoutProblemMessages.Kind),
            HandoutWriteOutcome.KindChangeNotAllowed => controller.Invalid(HandoutProblemMessages.KindKey, HandoutProblemMessages.KindChangeNotAllowed),
            HandoutWriteOutcome.InvalidVisibility => controller.Invalid(HandoutProblemMessages.VisibilityKey, HandoutProblemMessages.Visibility),
            HandoutWriteOutcome.MissingContent => controller.Invalid(HandoutProblemMessages.ContentKey, HandoutProblemMessages.MissingContent),
            HandoutWriteOutcome.InvalidContent => controller.Invalid(HandoutProblemMessages.ContentKey, HandoutProblemMessages.InvalidContent),
            HandoutWriteOutcome.Finished => controller.Problem(statusCode: StatusCodes.Status409Conflict, title: SceneProblemTitles.Finished),
            _ => controller.NotFound(),
        };

    public static ActionResult FileWriteFailure(this ControllerBase controller, HandoutWriteOutcome outcome, string? submittedTitle, HandoutKind? submittedKind)
    {
        var problem = HandoutFileProblemMessages.For(outcome, submittedTitle, submittedKind);
        if (problem is not null)
        {
            return controller.Invalid(problem.Key, problem.Message);
        }

        return outcome switch
        {
            HandoutWriteOutcome.Finished => controller.Problem(statusCode: StatusCodes.Status409Conflict, title: SceneProblemTitles.Finished),
            HandoutWriteOutcome.StorageFailed => controller.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: HandoutFileProblemMessages.StorageFailedTitle),
            HandoutWriteOutcome.InPlay => controller.Problem(statusCode: StatusCodes.Status409Conflict, title: ItemProblemMessages.HandoutsKeptTitle),
            _ => controller.NotFound(),
        };
    }

    public static IActionResult RemoveResult(this ControllerBase controller, HandoutRemoveOutcome outcome) =>
        outcome switch
        {
            HandoutRemoveOutcome.Removed => controller.NoContent(),
            HandoutRemoveOutcome.NotPrepared => controller.Problem(statusCode: StatusCodes.Status409Conflict, title: HandoutProblemMessages.NotPreparedTitle),
            HandoutRemoveOutcome.InPlay => controller.Problem(statusCode: StatusCodes.Status409Conflict, title: ItemProblemMessages.HandoutsKeptTitle),
            _ => controller.NotFound(),
        };

    public static ActionResult ReorderResult(this ControllerBase controller, HandoutReorderResult result) =>
        result.Outcome switch
        {
            HandoutReorderOutcome.Reordered => controller.Ok(new HandoutListResponse(result.Handouts!.Select(HandoutsController.ToSummaryResponse).ToList())),
            HandoutReorderOutcome.DuplicateIds => controller.Invalid(HandoutProblemMessages.HandoutIdsKey, HandoutProblemMessages.DuplicateIds),
            HandoutReorderOutcome.DoesNotMatchHandouts => controller.Problem(statusCode: StatusCodes.Status409Conflict, title: HandoutProblemMessages.StaleOrderTitle),
            HandoutReorderOutcome.Finished => controller.Problem(statusCode: StatusCodes.Status409Conflict, title: SceneProblemTitles.Finished),
            _ => controller.NotFound(),
        };

    /// <summary>The Handout's file as an attachment with its stored media type; 404 for a rich-text Handout; 503 when storage fails.</summary>
    public static IActionResult DownloadResult(this ControllerBase controller, HandoutFileOpenResult result)
    {
        if (result.Outcome != HandoutFileOpenOutcome.Opened)
        {
            return result.Outcome == HandoutFileOpenOutcome.NotFound
                ? controller.NotFound()
                : controller.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: HandoutFileProblemMessages.StorageFailedTitle);
        }

        controller.Response.Headers.XContentTypeOptions = "nosniff";
        controller.Response.Headers.CacheControl = "private, no-store";
        return controller.File(result.Download!.Content, result.Download.File.MediaType, result.Download.File.Name);
    }

    // A form over the multipart limit is a 413 (Kestrel's request limit throws BadHttpRequestException, the form limit InvalidDataException).
    public static async Task<IFormCollection?> ReadHandoutFormAsync(this ControllerBase controller, CancellationToken cancellationToken)
    {
        try
        {
            return await controller.Request.ReadFormAsync(cancellationToken);
        }
        catch (Exception exception) when (exception is InvalidDataException or BadHttpRequestException { StatusCode: StatusCodes.Status413PayloadTooLarge })
        {
            return null;
        }
    }

    public static OpenedUpload OpenUpload(IFormCollection form) =>
        form.Files.GetFile("file") is { } file ? new OpenedUpload(new HandoutUpload(file.FileName, file.Length, file.OpenReadStream())) : new OpenedUpload(null);

    private static ActionResult Invalid(this ControllerBase controller, string field, string message)
    {
        controller.ModelState.AddModelError(field, message);
        return controller.ValidationProblem(controller.ModelState);
    }

    /// <summary>The stream of an uploaded file, disposed after the service call.</summary>
    public readonly struct OpenedUpload : IAsyncDisposable
    {
        public OpenedUpload(HandoutUpload? upload) => Upload = upload;

        public HandoutUpload? Upload { get; }

        public ValueTask DisposeAsync() => Upload is null ? ValueTask.CompletedTask : Upload.Content.DisposeAsync();
    }
}
