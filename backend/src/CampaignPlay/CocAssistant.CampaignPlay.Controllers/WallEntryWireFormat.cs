namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>The wire names of Wall Entry visibility: "Public" and "KeeperOnly".</summary>
public static class WallEntryWireFormat
{
    public static string ToWire(WallEntryVisibility visibility) => visibility.ToString();

    /// <summary>Reads a wire name; a missing name means Public and an unknown one is not accepted.</summary>
    public static bool TryParseVisibility(string? wire, out WallEntryVisibility visibility)
    {
        visibility = WallEntryVisibility.Public;
        return wire is null || (Enum.TryParse(wire, ignoreCase: false, out visibility) && Enum.IsDefined(visibility));
    }

    public static WallEntryResponse ToResponse(WallEntryView entry) =>
        new(entry.Id, entry.Text, ToWire(entry.Visibility), entry.CreatedAt, entry.AuthorDisplayName);
}
