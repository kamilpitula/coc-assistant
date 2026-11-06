namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// The provider side of Scene Play's Reveal port (PBI-SPL-002 D1, ADR 0024): makes a Reveal on the Campaign's Active Scene, lists the
/// Clues of one Investigator, and finds the snapshotted file of a Reveal. It performs no authorization; Scene Play checks the Keeper,
/// or the Player's recipient status, before it calls, and no Scenario Preparation endpoint calls it. A Reveal adds rows and does
/// not touch the Scene's version (PBI-SPL-002 D2). A Reveal of an Item or of one of its Handouts marks the owning Item in play
/// (ADR 0029).
/// </summary>
public class SceneRevealService
{
    private readonly ISceneRepository _scenes;
    private readonly IItemRepository _items;
    private readonly TimeProvider _timeProvider;

    public SceneRevealService(ISceneRepository scenes, IItemRepository items, TimeProvider timeProvider)
    {
        _scenes = scenes;
        _items = items;
        _timeProvider = timeProvider;
    }

    /// <summary>Reveals a Handout or Non-Player Entity link of the Active Scene; <paramref name="recipientIds"/> null means every Investigator present.</summary>
    public async Task<SceneRevealResult> RevealAsync(Guid campaignId, RevealSubjectType subjectType, Guid subjectId, IReadOnlyCollection<Guid>? recipientIds, CancellationToken cancellationToken)
    {
        var scene = await _scenes.FindActiveAsync(campaignId, cancellationToken);
        if (scene is null)
        {
            return new SceneRevealResult(SceneRevealOutcome.NoActiveScene, null);
        }

        var linked = subjectType is RevealSubjectType.Item or RevealSubjectType.Handout
            ? await _items.ListLinkedForSceneAsync(campaignId, scene.Id, cancellationToken)
            : [];
        var result = scene.Reveal(new RevealSubject(subjectType, subjectId), recipientIds, _timeProvider.GetUtcNow(), linked);
        if (result.Outcome != RevealOutcome.Revealed)
        {
            return new SceneRevealResult(ToOutcome(result.Outcome), null);
        }

        result.OwningItem?.MarkInPlay();
        try
        {
            await _scenes.SaveChangesAsync(cancellationToken);
        }
        catch (SceneConcurrencyException)
        {
            return new SceneRevealResult(SceneRevealOutcome.Conflict, null);
        }

        return new SceneRevealResult(SceneRevealOutcome.Revealed, RevealViews.ToView(result.Reveal!));
    }

    /// <summary>The Reveals that reached the Investigator across the Campaign's Scenes, newest first.</summary>
    public async Task<IReadOnlyList<ClueView>> ListCluesAsync(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken)
    {
        var reveals = await _scenes.ListRevealsForInvestigatorAsync(campaignId, investigatorId, cancellationToken);
        return reveals.Select(item => new ClueView(RevealViews.ToView(item.Reveal), item.SceneId, item.SceneTitle)).ToList();
    }

    /// <summary>The snapshotted file of a Reveal of the Campaign and the Investigators it reached; null when there is no such Reveal or it has no file.</summary>
    public async Task<RevealFileView?> FindRevealFileAsync(Guid campaignId, Guid revealId, CancellationToken cancellationToken)
    {
        var reveal = await _scenes.FindRevealAsync(campaignId, revealId, cancellationToken);
        return reveal?.File is { } file ? new RevealFileView(file.Key, file.Name, file.MediaType, file.SizeBytes, reveal.RecipientIds) : null;
    }

    private static SceneRevealOutcome ToOutcome(RevealOutcome outcome) => outcome switch
    {
        RevealOutcome.SubjectNotRevealable => SceneRevealOutcome.SubjectNotRevealable,
        RevealOutcome.SubjectNotFound => SceneRevealOutcome.SubjectNotFound,
        RevealOutcome.SubjectKeeperFacing => SceneRevealOutcome.SubjectKeeperFacing,
        RevealOutcome.NoRecipient => SceneRevealOutcome.NoRecipient,
        RevealOutcome.DuplicateRecipient => SceneRevealOutcome.DuplicateRecipient,
        RevealOutcome.RecipientNotPresent => SceneRevealOutcome.RecipientNotPresent,
        _ => SceneRevealOutcome.NoActiveScene,
    };
}
