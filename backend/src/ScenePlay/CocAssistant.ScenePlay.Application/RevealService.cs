namespace CocAssistant.ScenePlay.Application;

/// <summary>How revealing ended. NotFound is for a caller who is not the Keeper; the other refusals are the provider's, in its order.</summary>
public enum RevealSceneOutcome
{
    Revealed,
    NotFound,
    NoActiveScene,
    SubjectNotRevealable,
    SubjectNotFound,
    SubjectKeeperFacing,
    NoRecipient,
    DuplicateRecipient,
    RecipientNotPresent,
}

/// <summary>The created Reveal as the Keeper sees it, when <see cref="RevealSceneOutcome.Revealed"/>; otherwise null.</summary>
public sealed record RevealSceneResult(RevealSceneOutcome Outcome, KeeperRevealView? Reveal);

/// <summary>An Investigator's Clues, newest first, with the Investigator's name.</summary>
public sealed record CluesResult(string? InvestigatorName, IReadOnlyList<ClueView> Clues);

/// <summary>How opening a Reveal's file ended. NotFound covers every case the caller may not distinguish (ADR 0013).</summary>
public enum RevealFileOutcome
{
    Opened,
    NotFound,
    StorageFailed,
}

/// <summary>A Reveal's stored bytes with their details; the caller disposes <see cref="Content"/>.</summary>
public sealed record RevealFileDownload(RevealedFileDetails File, Stream Content);

/// <summary>The download when <see cref="RevealFileOutcome.Opened"/>, otherwise null.</summary>
public sealed record RevealFileResult(RevealFileOutcome Outcome, RevealFileDownload? Download);

/// <summary>
/// Reveals material of the Active Scene to Investigators present, lists Clues, and serves a Reveal's file (specs/scene-play/spec.md;
/// PBI-SPL-002 D3, D5, D6). The authorization is here and nowhere else: the Keeper check runs first on a Reveal, so a Player or
/// non-member gets NotFound before any port is touched, and a Player reads only what reached their own Approved Investigator. After
/// a Reveal commits, the live signal follows; a failure of it is logged and never fails the Reveal.
/// </summary>
public class RevealService
{
    private readonly ICampaignRoles _roles;
    private readonly ISceneReveals _reveals;
    private readonly IPlayableScenes _scenes;
    private readonly IApprovedInvestigators _approved;
    private readonly IRevealedFiles _files;
    private readonly IRevealSignals _signals;
    private readonly ILogger<RevealService> _logger;

    public RevealService(
        ICampaignRoles roles,
        ISceneReveals reveals,
        IPlayableScenes scenes,
        IApprovedInvestigators approved,
        IRevealedFiles files,
        IRevealSignals signals,
        ILogger<RevealService> logger)
    {
        _roles = roles;
        _reveals = reveals;
        _scenes = scenes;
        _approved = approved;
        _files = files;
        _signals = signals;
        _logger = logger;
    }

    /// <summary>Reveals a subject of the Active Scene; null <paramref name="investigatorIds"/> means every Investigator present.</summary>
    public async Task<RevealSceneResult> RevealAsync(
        Guid campaignId,
        Guid callerAccountId,
        RevealSubjectKind subjectKind,
        Guid subjectId,
        IReadOnlyCollection<Guid>? investigatorIds,
        CancellationToken cancellationToken)
    {
        if (await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken) != CampaignMemberRole.Keeper)
        {
            return new RevealSceneResult(RevealSceneOutcome.NotFound, null);
        }

        var result = subjectKind == RevealSubjectKind.Unknown
            ? await RefuseUnknownSubjectAsync(campaignId, cancellationToken)
            : await _reveals.RevealAsync(campaignId, subjectKind, subjectId, investigatorIds, cancellationToken);
        if (result.Outcome != RevealOutcome.Revealed)
        {
            return new RevealSceneResult(Enum.Parse<RevealSceneOutcome>(result.Outcome.ToString()), null);
        }

        var approved = await _approved.ListAsync(campaignId, cancellationToken);
        await TrySignalAsync(campaignId, RecipientAccountIds(result.Reveal!, approved), cancellationToken);
        return new RevealSceneResult(RevealSceneOutcome.Revealed, RevealProjection.ForKeeper(result.Reveal!, approved));
    }

    /// <summary>The caller's own Clues; null unless the caller is a Player with an Approved Investigator in the Campaign.</summary>
    public async Task<CluesResult?> ListMyCluesAsync(Guid campaignId, Guid callerAccountId, CancellationToken cancellationToken)
    {
        if (await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken) != CampaignMemberRole.Player)
        {
            return null;
        }

        var mine = (await _approved.ListAsync(campaignId, cancellationToken)).FirstOrDefault(investigator => investigator.PlayerAccountId == callerAccountId);
        return mine is null ? null : await ReadCluesAsync(campaignId, mine, cancellationToken);
    }

    /// <summary>An Approved Investigator's Clues for the Keeper; null for anyone else or for an Investigator who is not Approved in the Campaign.</summary>
    public async Task<CluesResult?> ListInvestigatorCluesAsync(Guid campaignId, Guid callerAccountId, Guid investigatorId, CancellationToken cancellationToken)
    {
        if (await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken) != CampaignMemberRole.Keeper)
        {
            return null;
        }

        var investigator = (await _approved.ListAsync(campaignId, cancellationToken)).FirstOrDefault(candidate => candidate.InvestigatorId == investigatorId);
        return investigator is null ? null : await ReadCluesAsync(campaignId, investigator, cancellationToken);
    }

    /// <summary>The Reveal's snapshotted file for the Keeper, or for a Player whose Approved Investigator it reached.</summary>
    public async Task<RevealFileResult> OpenFileAsync(Guid campaignId, Guid callerAccountId, Guid revealId, CancellationToken cancellationToken)
    {
        var role = await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken);
        if (role is null)
        {
            return NotFound();
        }

        var mine = role == CampaignMemberRole.Player
            ? (await _approved.ListAsync(campaignId, cancellationToken)).FirstOrDefault(investigator => investigator.PlayerAccountId == callerAccountId)
            : null;
        if (role == CampaignMemberRole.Player && mine is null)
        {
            return NotFound();
        }

        var file = await _reveals.FindFileAsync(campaignId, revealId, cancellationToken);
        if (file is null || (mine is not null && !file.RecipientIds.Contains(mine.InvestigatorId)))
        {
            return NotFound();
        }

        return await OpenAsync(file, cancellationToken);
    }

    // An unnamed or unknown type is refused after the Active Scene check, as the provider would refuse an Item, so the error order holds.
    private async Task<RevealRecordResult> RefuseUnknownSubjectAsync(Guid campaignId, CancellationToken cancellationToken) =>
        new(await _scenes.FindActiveAsync(campaignId, cancellationToken) is null ? RevealOutcome.NoActiveScene : RevealOutcome.SubjectNotRevealable, null);

    private async Task<CluesResult> ReadCluesAsync(Guid campaignId, ApprovedInvestigatorRef investigator, CancellationToken cancellationToken)
    {
        var clues = await _reveals.ListCluesAsync(campaignId, investigator.InvestigatorId, cancellationToken);
        return new CluesResult(investigator.Name, clues.Select(RevealProjection.ForClue).ToList());
    }

    private async Task<RevealFileResult> OpenAsync(RevealFileRecord file, CancellationToken cancellationToken)
    {
        try
        {
            var content = await _files.OpenReadAsync(file.FileKey, cancellationToken);
            return new RevealFileResult(RevealFileOutcome.Opened, new RevealFileDownload(new RevealedFileDetails(file.Name, file.MediaType, file.SizeBytes), content));
        }
        catch (RevealedFileStorageException)
        {
            return new RevealFileResult(RevealFileOutcome.StorageFailed, null);
        }
    }

    private static RevealFileResult NotFound() => new(RevealFileOutcome.NotFound, null);

    private static List<Guid> RecipientAccountIds(SceneRevealRecord reveal, IReadOnlyList<ApprovedInvestigatorRef> approved) =>
        approved.Where(investigator => reveal.RecipientIds.Contains(investigator.InvestigatorId)).Select(investigator => investigator.PlayerAccountId).Distinct().ToList();

    private async Task TrySignalAsync(Guid campaignId, IReadOnlyCollection<Guid> recipientAccountIds, CancellationToken cancellationToken)
    {
        try
        {
            await _signals.RevealMadeAsync(campaignId, recipientAccountIds, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(exception, "The Reveal signal for Campaign {CampaignId} could not be published.", campaignId);
        }
    }
}
