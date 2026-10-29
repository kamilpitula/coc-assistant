namespace CocAssistant.ScenePlay.Infrastructure;

/// <summary>
/// Adapts Scenario Preparation's <see cref="CocAssistant.ScenarioPreparation.Application.SceneRevealService"/> to Scene Play's Reveal port
/// (ADR 0024, PBI-SPL-002 D1). Subject kinds and outcomes carry the same names on both sides, so they map by name; a test proves every
/// member maps.
/// </summary>
public sealed class ScenarioPreparationSceneReveals : ISceneReveals
{
    private readonly CocAssistant.ScenarioPreparation.Application.SceneRevealService _reveals;

    public ScenarioPreparationSceneReveals(CocAssistant.ScenarioPreparation.Application.SceneRevealService reveals)
    {
        _reveals = reveals;
    }

    public async Task<RevealRecordResult> RevealAsync(
        Guid campaignId,
        RevealSubjectKind subjectKind,
        Guid subjectId,
        IReadOnlyCollection<Guid>? recipientIds,
        CancellationToken cancellationToken)
    {
        var result = await _reveals.RevealAsync(
            campaignId,
            ScenarioPreparationPlayableScenes.Map<CocAssistant.ScenarioPreparation.Domain.RevealSubjectType>(subjectKind),
            subjectId,
            recipientIds,
            cancellationToken);
        return new RevealRecordResult(ScenarioPreparationPlayableScenes.Map<RevealOutcome>(result.Outcome), result.Reveal is null ? null : ToRecord(result.Reveal));
    }

    public async Task<IReadOnlyList<ClueRecord>> ListCluesAsync(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken) =>
        (await _reveals.ListCluesAsync(campaignId, investigatorId, cancellationToken))
            .Select(clue => new ClueRecord(ToRecord(clue.Reveal), clue.SceneId, clue.SceneTitle))
            .ToList();

    public async Task<RevealFileRecord?> FindFileAsync(Guid campaignId, Guid revealId, CancellationToken cancellationToken)
    {
        var file = await _reveals.FindRevealFileAsync(campaignId, revealId, cancellationToken);
        return file is null ? null : new RevealFileRecord(file.Key, file.Name, file.MediaType, file.SizeBytes, file.RecipientIds);
    }

    internal static SceneRevealRecord ToRecord(CocAssistant.ScenarioPreparation.Application.RevealView reveal) =>
        new(
            reveal.Id,
            ScenarioPreparationPlayableScenes.Map<RevealSubjectKind>(reveal.SubjectType),
            reveal.SubjectId,
            reveal.RevealedAt,
            reveal.Title,
            reveal.HandoutKind?.ToString(),
            reveal.Content,
            reveal.File is null ? null : new RevealedFileDetails(reveal.File.Name, reveal.File.MediaType, reveal.File.SizeBytes),
            reveal.ImageDescription,
            reveal.RecipientIds);
}

/// <summary>
/// Adapts Scenario Preparation's Handout file store to Scene Play's port for revealed files (ADR 0026): it opens a Reveal's snapshotted key
/// and maps every storage failure to <see cref="RevealedFileStorageException"/>.
/// </summary>
public sealed class ScenarioPreparationRevealedFiles : IRevealedFiles
{
    private readonly CocAssistant.ScenarioPreparation.Application.IHandoutFileStore _store;

    public ScenarioPreparationRevealedFiles(CocAssistant.ScenarioPreparation.Application.IHandoutFileStore store)
    {
        _store = store;
    }

    public async Task<Stream> OpenReadAsync(string fileKey, CancellationToken cancellationToken)
    {
        try
        {
            return await _store.OpenReadAsync(fileKey, cancellationToken);
        }
        catch (CocAssistant.ScenarioPreparation.Application.HandoutFileStoreException exception)
        {
            throw new RevealedFileStorageException("The revealed file could not be read.", exception);
        }
    }
}
