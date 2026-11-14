namespace CocAssistant.ScenePlay.Application;

/// <summary>
/// Whether the role may see the Roll Request: everyone sees a Public one, only the Keeper sees any other, so Unknown
/// fails closed (specs/roll-requests/spec.md, Visibility of results). One rule for GET-by-id and the Scene History.
/// </summary>
internal static class RollRequestVisibilityRule
{
    public static bool IsVisibleTo(RollRequestRecord request, CampaignMemberRole role) =>
        request.Visibility == RollRequestVisibility.Public || role == CampaignMemberRole.Keeper;
}
