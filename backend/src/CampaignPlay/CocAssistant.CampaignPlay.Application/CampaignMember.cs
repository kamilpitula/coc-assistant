namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// One Campaign Member as listed in the roster. It carries a memberId instead of an Account id and no Investigator
/// data (specs/campaign-play/spec.md, Campaign members API).
/// </summary>
public sealed record CampaignMember(Guid MemberId, string DisplayName, CampaignRole Role, bool IsYou);
