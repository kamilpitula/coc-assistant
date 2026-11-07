namespace CocAssistant.ScenePlay.Infrastructure;

/// <summary>Adapts Campaign Play's member read to Scene Play's <see cref="ICampaignRoles"/> port (ADR 0008).</summary>
public sealed class CampaignPlayCampaignRoles : ICampaignRoles
{
    private readonly CocAssistant.CampaignPlay.Application.CampaignService _campaigns;

    public CampaignPlayCampaignRoles(CocAssistant.CampaignPlay.Application.CampaignService campaigns)
    {
        _campaigns = campaigns;
    }

    public async Task<CampaignMemberRole?> RoleOfAsync(Guid campaignId, Guid accountId, CancellationToken cancellationToken)
    {
        var member = await _campaigns.GetForMemberAsync(campaignId, accountId, cancellationToken);
        return member is null ? null : member.Role == CampaignRole.Keeper ? CampaignMemberRole.Keeper : CampaignMemberRole.Player;
    }
}

/// <summary>Adapts Campaign Play's <see cref="CocAssistant.CampaignPlay.Application.ApprovedInvestigatorQuery"/> to Scene Play's port.</summary>
public sealed class CampaignPlayApprovedInvestigators : IApprovedInvestigators
{
    private readonly CocAssistant.CampaignPlay.Application.ApprovedInvestigatorQuery _query;

    public CampaignPlayApprovedInvestigators(CocAssistant.CampaignPlay.Application.ApprovedInvestigatorQuery query)
    {
        _query = query;
    }

    public async Task<IReadOnlyList<ApprovedInvestigatorRef>> ListAsync(Guid campaignId, CancellationToken cancellationToken) =>
        (await _query.ListAsync(campaignId, cancellationToken))
            .Select(investigator => new ApprovedInvestigatorRef(investigator.InvestigatorId, investigator.PlayerAccountId, investigator.Name))
            .ToList();
}

/// <summary>Creates the Public Wall Entry through Campaign Play's Wall Entry behavior, authored by the Keeper (ADR 0024).</summary>
public sealed class CampaignPlaySceneWallEntries : ISceneWallEntries
{
    private readonly CocAssistant.CampaignPlay.Application.WallEntryService _wallEntries;

    public CampaignPlaySceneWallEntries(CocAssistant.CampaignPlay.Application.WallEntryService wallEntries)
    {
        _wallEntries = wallEntries;
    }

    public async Task AddPublicAsync(Guid campaignId, Guid keeperAccountId, string text, CancellationToken cancellationToken)
    {
        var result = await _wallEntries.AddAsync(campaignId, keeperAccountId, text, CocAssistant.CampaignPlay.Domain.Wall.WallEntryVisibility.Public, cancellationToken);
        if (result.Outcome != CocAssistant.CampaignPlay.Domain.Wall.WallEntryAuthoringOutcome.Created)
        {
            throw new InvalidOperationException($"The Wall Entry was refused: {result.Outcome}.");
        }
    }
}

/// <summary>Publishes sceneReveals to the Keeper and myClues to each recipient account, never to the Campaign (ADR 0009, PBI-SPL-002 D6).</summary>
public sealed class CampaignPlayRevealSignals : IRevealSignals
{
    private readonly CocAssistant.CampaignPlay.Application.PublishRevealMade _publisher;

    public CampaignPlayRevealSignals(CocAssistant.CampaignPlay.Application.PublishRevealMade publisher)
    {
        _publisher = publisher;
    }

    public Task RevealMadeAsync(Guid campaignId, IReadOnlyCollection<Guid> recipientAccountIds, CancellationToken cancellationToken) =>
        _publisher.PublishAsync(campaignId, recipientAccountIds, cancellationToken);
}

/// <summary>Publishes myItems (and myClues to the gaining account) when an Item's holder changes, never to the Campaign (ADR 0009, PBI-SPL-003 D5).</summary>
public sealed class CampaignPlayItemHolderSignals : IItemHolderSignals
{
    private readonly CocAssistant.CampaignPlay.Application.PublishItemHolderChanged _publisher;

    public CampaignPlayItemHolderSignals(CocAssistant.CampaignPlay.Application.PublishItemHolderChanged publisher)
    {
        _publisher = publisher;
    }

    public Task ItemHolderChangedAsync(Guid campaignId, Guid? gainerAccountId, Guid? loserAccountId, CancellationToken cancellationToken) =>
        _publisher.PublishAsync(campaignId, gainerAccountId, loserAccountId, cancellationToken);
}

/// <summary>Publishes the activeScene topic through Campaign Play's publisher, which uses the publication policy (ADR 0009, ADR 0024).</summary>
public sealed class CampaignPlayActiveSceneSignals : IActiveSceneSignals
{
    private readonly CocAssistant.CampaignPlay.Application.PublishActiveSceneChanged _publisher;

    public CampaignPlayActiveSceneSignals(CocAssistant.CampaignPlay.Application.PublishActiveSceneChanged publisher)
    {
        _publisher = publisher;
    }

    public Task ActiveSceneChangedAsync(Guid campaignId, CancellationToken cancellationToken) =>
        _publisher.PublishAsync(campaignId, cancellationToken);
}
