namespace CocAssistant.CampaignPlay.Application;

/// <summary>Where the next page of the Wall starts: just after an entry the caller has already been shown.</summary>
public sealed record WallEntryCursor(DateTimeOffset CreatedAt, Guid Id)
{
    /// <summary>The opaque token handed to clients.</summary>
    public string ToToken()
    {
        var raw = $"{CreatedAt.UtcTicks}:{Id:N}";
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(raw)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    /// <summary>Reads a token produced by <see cref="ToToken"/>; false for anything else.</summary>
    public static bool TryParse(string? token, [NotNullWhen(true)] out WallEntryCursor? cursor)
    {
        cursor = null;
        if (string.IsNullOrEmpty(token))
        {
            return false;
        }

        try
        {
            var parts = Encoding.UTF8.GetString(FromBase64Url(token)).Split(':');
            if (parts.Length == 2
                && long.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out var ticks)
                && ticks <= DateTimeOffset.MaxValue.UtcTicks
                && Guid.TryParseExact(parts[1], "N", out var id))
            {
                cursor = new WallEntryCursor(new DateTimeOffset(ticks, TimeSpan.Zero), id);
                return true;
            }
        }
        catch (FormatException)
        {
            return false;
        }

        return false;
    }

    private static byte[] FromBase64Url(string token)
    {
        var padded = token.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(padded.PadRight(padded.Length + ((4 - (padded.Length % 4)) % 4), '='));
    }
}
