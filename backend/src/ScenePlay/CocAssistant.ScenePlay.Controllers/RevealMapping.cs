namespace CocAssistant.ScenePlay.Controllers;

/// <summary>Maps Reveal views to responses. A stored Lexical document is sent as JSON, not as a string.</summary>
internal static class RevealMapping
{
    public static PlayerRevealResponse ToResponse(PlayerRevealView view) =>
        new(view.RevealId, view.RevealedAt, view.SubjectType.ToString(), view.Title, view.HandoutKind, ParseContent(view.Content), ToResponse(view.File), view.ImageDescription);

    public static KeeperRevealResponse ToResponse(KeeperRevealView view) =>
        new(
            view.Reveal.RevealId,
            view.Reveal.RevealedAt,
            view.Reveal.SubjectType.ToString(),
            view.Reveal.Title,
            view.Reveal.HandoutKind,
            ParseContent(view.Reveal.Content),
            ToResponse(view.Reveal.File),
            view.Reveal.ImageDescription,
            view.SubjectId,
            view.Recipients.Select(recipient => new RevealRecipientResponse(recipient.Id, recipient.Name)).ToList());

    public static ClueResponse ToResponse(ClueView view) =>
        new(
            view.Reveal.RevealId,
            view.Reveal.RevealedAt,
            view.Reveal.SubjectType.ToString(),
            view.Reveal.Title,
            view.Reveal.HandoutKind,
            ParseContent(view.Reveal.Content),
            ToResponse(view.Reveal.File),
            view.Reveal.ImageDescription,
            new ClueSceneResponse(view.SceneId, view.SceneTitle));

    public static CluesResponse ToResponse(CluesResult result) =>
        new(result.InvestigatorName, result.Clues.Select(ToResponse).ToList());

    private static RevealFileResponse? ToResponse(RevealedFileDetails? file) =>
        file is null ? null : new RevealFileResponse(file.Name, file.MediaType, file.SizeBytes);

    private static JsonElement? ParseContent(string? storedJson)
    {
        if (storedJson is null)
        {
            return null;
        }

        using var document = JsonDocument.Parse(storedJson);
        return document.RootElement.Clone();
    }
}
