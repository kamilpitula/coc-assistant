namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Saves a Scene's Keeper notes through their own version in every status, Finished included
/// (specs/scenario-preparation/spec.md, ADR 0037). The Keeper check runs first, so everyone else ends in NotFound before
/// any Scene is read (ADR 0013, ADR 0016). A stale version is refused with the current notes before any rich-text check;
/// the conditional update never touches the Scene version, so a notes save can never make a start or finish fail.
/// </summary>
public class SceneKeeperNotesService
{
    private readonly ICampaignKeepers _keepers;
    private readonly ISceneRepository _scenes;
    private readonly ISceneContentSignals _signals;

    public SceneKeeperNotesService(ICampaignKeepers keepers, ISceneRepository scenes, ISceneContentSignals signals)
    {
        _keepers = keepers;
        _scenes = scenes;
        _signals = signals;
    }

    /// <summary>
    /// Replaces the Keeper notes when <paramref name="notesVersion"/> is the current one. A missing version, a stale
    /// version, and invalid rich text are refused without changing or signalling anything.
    /// </summary>
    public async Task<SceneKeeperNotesWriteResult> SaveAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid scenarioId,
        Guid sceneId,
        string? keeperNotes,
        int? notesVersion,
        CancellationToken cancellationToken)
    {
        if (!await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken))
        {
            return new SceneKeeperNotesWriteResult(SceneKeeperNotesWriteOutcome.NotFound, null);
        }

        var scene = await _scenes.FindByIdAsync(campaignId, scenarioId, sceneId, cancellationToken);
        if (scene is null)
        {
            return new SceneKeeperNotesWriteResult(SceneKeeperNotesWriteOutcome.NotFound, null);
        }

        if (notesVersion is null)
        {
            return new SceneKeeperNotesWriteResult(SceneKeeperNotesWriteOutcome.MissingNotesVersion, null);
        }

        switch (scene.CheckKeeperNotesSave(keeperNotes, notesVersion.Value))
        {
            case KeeperNotesSaveOutcome.StaleNotesVersion:
                return new SceneKeeperNotesWriteResult(
                    SceneKeeperNotesWriteOutcome.StaleNotesVersion,
                    new SceneKeeperNotesView(scene.Id, scene.KeeperNotes, scene.NotesVersion));
            case KeeperNotesSaveOutcome.InvalidKeeperNotes:
                return new SceneKeeperNotesWriteResult(SceneKeeperNotesWriteOutcome.InvalidKeeperNotes, null);
        }

        if (await _scenes.TryReplaceKeeperNotesAsync(campaignId, scenarioId, sceneId, keeperNotes, notesVersion.Value, cancellationToken))
        {
            await _signals.ScenesChangedAsync(campaignId, cancellationToken);
            return new SceneKeeperNotesWriteResult(
                SceneKeeperNotesWriteOutcome.Saved,
                new SceneKeeperNotesView(scene.Id, keeperNotes, scene.NotesVersion + 1));
        }

        var current = await _scenes.FindKeeperNotesAsync(campaignId, scenarioId, sceneId, cancellationToken);
        return current is null
            ? new SceneKeeperNotesWriteResult(SceneKeeperNotesWriteOutcome.NotFound, null)
            : new SceneKeeperNotesWriteResult(SceneKeeperNotesWriteOutcome.StaleNotesVersion, current);
    }
}
