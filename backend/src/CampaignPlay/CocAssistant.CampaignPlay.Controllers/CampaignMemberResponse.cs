namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>
/// One roster entry: an opaque memberId, never an Account id, and the Investigator as projected for the caller
/// (specs/campaign-overview/spec.md, Roster with Investigators).
/// </summary>
public sealed record CampaignMemberResponse(string MemberId, string DisplayName, string Role, bool IsYou, RosterInvestigatorResponse? Investigator);

/// <summary>
/// A roster Investigator, shaped exactly as the projection table: the <c>visibility</c> discriminator alone for
/// InProgress and NotReady, and name and status (plus id, for the Keeper only) when Visible.
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "visibility")]
[JsonDerivedType(typeof(VisibleRosterInvestigatorResponse), nameof(InvestigatorVisibility.Visible))]
[JsonDerivedType(typeof(InProgressRosterInvestigatorResponse), nameof(InvestigatorVisibility.InProgress))]
[JsonDerivedType(typeof(NotReadyRosterInvestigatorResponse), nameof(InvestigatorVisibility.NotReady))]
public abstract record RosterInvestigatorResponse
{
    public static RosterInvestigatorResponse? From(RosterInvestigator? investigator) =>
        investigator?.Visibility switch
        {
            null => null,
            InvestigatorVisibility.InProgress => new InProgressRosterInvestigatorResponse(),
            InvestigatorVisibility.NotReady => new NotReadyRosterInvestigatorResponse(),
            _ => new VisibleRosterInvestigatorResponse(investigator.Id, investigator.Name, investigator.Status!.Value.ToString()),
        };
}

public sealed record VisibleRosterInvestigatorResponse(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] Guid? Id,
    string? Name,
    string Status) : RosterInvestigatorResponse;

public sealed record InProgressRosterInvestigatorResponse : RosterInvestigatorResponse;

public sealed record NotReadyRosterInvestigatorResponse : RosterInvestigatorResponse;
