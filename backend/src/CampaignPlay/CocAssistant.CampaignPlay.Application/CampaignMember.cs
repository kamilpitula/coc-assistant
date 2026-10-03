namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// One Campaign Member as listed in the roster. It carries a memberId instead of an Account id, and only the
/// Investigator data the caller may see (specs/campaign-overview/spec.md, Roster with Investigators).
/// </summary>
public sealed record CampaignMember(Guid MemberId, string DisplayName, CampaignRole Role, bool IsYou, RosterInvestigator? Investigator);
