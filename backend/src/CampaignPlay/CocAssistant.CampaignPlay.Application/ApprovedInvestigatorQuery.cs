namespace CocAssistant.CampaignPlay.Application;

/// <summary>An Approved Investigator as Scene Play needs it: its id, its Player's Account, and its name from the Character Sheet.</summary>
public sealed record ApprovedInvestigator(Guid InvestigatorId, Guid PlayerAccountId, string Name);

/// <summary>
/// Provider query for Scene Play (ADR 0008, ADR 0024): the Approved Investigators of one Campaign. The name comes from the
/// Character Sheet identity, as the roster does.
/// </summary>
public class ApprovedInvestigatorQuery
{
    private readonly IInvestigatorRepository _investigators;

    public ApprovedInvestigatorQuery(IInvestigatorRepository investigators)
    {
        _investigators = investigators;
    }

    public async Task<IReadOnlyList<ApprovedInvestigator>> ListAsync(Guid campaignId, CancellationToken cancellationToken) =>
        (await _investigators.ListForCampaignAsync(campaignId, cancellationToken))
            .Where(investigator => investigator.Status == InvestigatorStatus.Approved)
            .OrderBy(investigator => investigator.Id)
            .Select(investigator => new ApprovedInvestigator(investigator.Id, investigator.PlayerAccountId, investigator.CharacterSheet.Identity.Name))
            .ToList();
}
