namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>One roster entry: an opaque memberId, never an Account id, and no Investigator data.</summary>
public sealed record CampaignMemberResponse(string MemberId, string DisplayName, string Role, bool IsYou);
