namespace CocAssistant.ScenePlay.Controllers;

/// <summary>The material to reveal: <c>type</c> is <c>Handout</c>, <c>NonPlayerEntity</c>, or <c>Item</c>, and <c>id</c> is a Handout id, a Non-Player Entity link id, or an Item id of the Active Scene.</summary>
public record RevealSubjectRequest(string? Type, Guid Id);

/// <summary>Reveals a subject. A missing <c>investigatorIds</c> means every Investigator present.</summary>
public record RevealRequest(RevealSubjectRequest? Subject, IReadOnlyList<Guid>? InvestigatorIds);

public record RevealFileResponse(string Name, string MediaType, long SizeBytes);

/// <summary>A Reveal as a Player sees it. It carries no subject id and no recipients (PBI-SPL-002 D5).</summary>
public record PlayerRevealResponse(
    Guid RevealId,
    DateTimeOffset RevealedAt,
    string SubjectType,
    string Title,
    string? HandoutKind,
    JsonElement? Content,
    RevealFileResponse? File,
    string? ImageDescription);

public record RevealRecipientResponse(Guid Id, string? Name);

/// <summary>A Reveal as the Keeper sees it: the Player view plus the subject id and the recipients.</summary>
public record KeeperRevealResponse(
    Guid RevealId,
    DateTimeOffset RevealedAt,
    string SubjectType,
    string Title,
    string? HandoutKind,
    JsonElement? Content,
    RevealFileResponse? File,
    string? ImageDescription,
    Guid SubjectId,
    IReadOnlyList<RevealRecipientResponse> Recipients);

public record ClueSceneResponse(Guid Id, string Title);

/// <summary>A Clue: the Player view of a Reveal plus the Scene it was made on.</summary>
public record ClueResponse(
    Guid RevealId,
    DateTimeOffset RevealedAt,
    string SubjectType,
    string Title,
    string? HandoutKind,
    JsonElement? Content,
    RevealFileResponse? File,
    string? ImageDescription,
    ClueSceneResponse Scene);

public record CluesResponse(string? InvestigatorName, IReadOnlyList<ClueResponse> Clues);

/// <summary>The titles and field messages of the Reveal problems (ADR 0018).</summary>
internal static class RevealProblems
{
    public const string SubjectTypeKey = "subject.type";
    public const string SubjectIdKey = "subject.id";
    public const string InvestigatorIdsKey = "investigatorIds";
    public const string UnknownTypeMessage = "Choose a Handout, a Non-Player Entity, or an Item to reveal.";
    public const string SubjectNotFoundMessage = "This isn't a Handout, a Non-Player Entity, or an Item of the Active Scene.";
    public const string KeeperFacingMessage = "This Handout is Keeper-facing and can't be revealed.";
    public const string NoRecipientMessage = "Choose at least one Investigator.";
    public const string DuplicateRecipientMessage = "Each Investigator can be chosen only once.";
    public const string RecipientNotPresentMessage = "Only Investigators present can receive a Reveal.";
    public const string StorageFailedTitle = "The revealed file couldn't be read. Try again.";
}
