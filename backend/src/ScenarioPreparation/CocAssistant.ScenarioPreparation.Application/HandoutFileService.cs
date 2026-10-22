namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Adds, replaces, and opens the file of an Image, Document, or Map Handout for its Campaign's Keeper (specs/scenario-preparation/spec.md,
/// File storage). The Keeper check runs first, so anyone else ends as NotFound before any Scene or blob is read (ADR 0013, ADR 0016).
/// A write validates in the domain first, uploads under a new never-reused key, and only then commits; a failed commit deletes
/// the new blob, and the replaced blob is deleted only after the commit and only when the Scene is Prepared (PBI-SP-007 D5, D6; ADR 0021).
/// </summary>
public class HandoutFileService
{
    private readonly ICampaignKeepers _keepers;
    private readonly ISceneRepository _scenes;
    private readonly IHandoutFileStore _store;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<HandoutFileService> _logger;

    public HandoutFileService(ICampaignKeepers keepers, ISceneRepository scenes, IHandoutFileStore store, TimeProvider timeProvider, ILogger<HandoutFileService> logger)
    {
        _keepers = keepers;
        _scenes = scenes;
        _store = store;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    /// <summary>Adds an Image, Document, or Map Handout after the Scene's others.</summary>
    public async Task<HandoutWriteResult> CreateAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid scenarioId,
        Guid sceneId,
        HandoutKind? kind,
        HandoutVisibility? visibility,
        string title,
        HandoutUpload? upload,
        CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        if (scene is null)
        {
            return new HandoutWriteResult(HandoutWriteOutcome.NotFound, null);
        }

        var file = await DescribeAsync(upload, kind, cancellationToken);
        var result = scene.AddFileHandout(kind, visibility, title, file, _timeProvider.GetUtcNow());
        return await StoreAndSaveAsync(result.Outcome, result.Handout, upload, file, null, cancellationToken);
    }

    /// <summary>Replaces a file Handout's kind, visibility, title, and, when given, its file; its place in the order is unchanged.</summary>
    public async Task<HandoutWriteResult> EditAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid scenarioId,
        Guid sceneId,
        Guid handoutId,
        HandoutKind? kind,
        HandoutVisibility? visibility,
        string title,
        HandoutUpload? upload,
        CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        if (scene is null)
        {
            return new HandoutWriteResult(HandoutWriteOutcome.NotFound, null);
        }

        var file = await DescribeAsync(upload, kind, cancellationToken);
        var result = scene.EditFileHandout(handoutId, kind, visibility, title, file);
        return await StoreAndSaveAsync(result.Outcome, result.Handout, upload, file, result.ReplacedKey, cancellationToken);
    }

    /// <summary>The Handout's stored bytes and details; NotFound for a non-Keeper, an unknown id, and a rich-text Handout.</summary>
    public async Task<HandoutFileOpenResult> OpenAsync(Guid campaignId, Guid callerAccountId, Guid scenarioId, Guid sceneId, Guid handoutId, CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        var file = scene?.Handouts.FirstOrDefault(candidate => candidate.Id == handoutId)?.File;
        if (file is null)
        {
            return new HandoutFileOpenResult(HandoutFileOpenOutcome.NotFound, null);
        }

        try
        {
            var content = await _store.OpenReadAsync(file.Key, cancellationToken);
            return new HandoutFileOpenResult(HandoutFileOpenOutcome.Opened, new HandoutFileDownload(new HandoutFileView(file.Name, file.MediaType, file.SizeBytes), content));
        }
        catch (HandoutFileStoreException)
        {
            return new HandoutFileOpenResult(HandoutFileOpenOutcome.StorageFailed, null);
        }
    }

    private async Task<HandoutWriteResult> StoreAndSaveAsync(
        HandoutOutcome outcome,
        Handout? handout,
        HandoutUpload? upload,
        HandoutFile? file,
        string? replacedKey,
        CancellationToken cancellationToken)
    {
        if (handout is null)
        {
            return new HandoutWriteResult(HandoutWriteOutcomes.From(outcome), null);
        }

        if (upload is not null && !await TryUploadAsync(upload, file!, cancellationToken))
        {
            return new HandoutWriteResult(HandoutWriteOutcome.StorageFailed, null);
        }

        await CommitAsync(file?.Key, cancellationToken);
        if (replacedKey is not null)
        {
            await _store.TryDeleteAsync(_logger, replacedKey);
        }

        return new HandoutWriteResult(HandoutWriteOutcome.Saved, HandoutViews.ToView(handout));
    }

    private async Task<bool> TryUploadAsync(HandoutUpload upload, HandoutFile file, CancellationToken cancellationToken)
    {
        try
        {
            upload.Content.Position = 0;
            await _store.SaveAsync(file.Key, upload.Content, file.MediaType, cancellationToken);
            return true;
        }
        catch (HandoutFileStoreException)
        {
            return false;
        }
    }

    // A failed commit leaves no row, so the blob uploaded for it is deleted (best effort) and the failure propagates.
    private async Task CommitAsync(string? newKey, CancellationToken cancellationToken)
    {
        try
        {
            await _scenes.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            if (newKey is not null)
            {
                await _store.TryDeleteAsync(_logger, newKey);
            }

            throw;
        }
    }

    // The media type comes from the leading bytes, never from the client; an unknown type is passed on as empty so the domain refuses it.
    private static async Task<HandoutFile?> DescribeAsync(HandoutUpload? upload, HandoutKind? kind, CancellationToken cancellationToken)
    {
        if (upload is null || kind is null)
        {
            return null;
        }

        var header = new byte[HandoutMediaTypes.SignatureLength];
        upload.Content.Position = 0;
        var read = await upload.Content.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, cancellationToken);
        var mediaType = HandoutMediaTypes.Detect(header.AsSpan(0, read)) ?? string.Empty;
        return new HandoutFile(Guid.NewGuid().ToString("N"), HandoutFileNames.Clean(upload.FileName, kind.Value), mediaType, upload.Length);
    }

    private async Task<Scene?> FindSceneAsync(Guid campaignId, Guid callerAccountId, Guid scenarioId, Guid sceneId, CancellationToken cancellationToken) =>
        await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken)
            ? await _scenes.FindByIdAsync(campaignId, scenarioId, sceneId, cancellationToken)
            : null;
}
