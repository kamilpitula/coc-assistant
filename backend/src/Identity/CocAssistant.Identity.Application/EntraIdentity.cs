namespace CocAssistant.Identity.Application;

/// <summary>The Entra identity carried by a caller's token, read the same way by every entry point.</summary>
public sealed record EntraIdentity(string EntraObjectId, string DisplayName, string Email)
{
    // Entra External ID assigns this displayName when the sign-up user flow does not collect one.
    private const string EntraDefaultDisplayName = "unknown";

    /// <summary>The caller's identity; null when the token carries no object id.</summary>
    public static EntraIdentity? FromClaims(ClaimsPrincipal user)
    {
        var entraObjectId = FirstNonEmpty(user, "oid", ClaimTypes.NameIdentifier);
        if (entraObjectId.Length == 0)
        {
            return null;
        }

        return new EntraIdentity(entraObjectId, ReadDisplayName(user), FirstNonEmpty(user, "email", "emails", ClaimTypes.Email));
    }

    private static string ReadDisplayName(ClaimsPrincipal user)
    {
        var name = FirstNonEmpty(user, "name", ClaimTypes.Name);
        if (name.Length > 0 && !name.Equals(EntraDefaultDisplayName, StringComparison.OrdinalIgnoreCase))
        {
            return name;
        }

        var givenName = FirstNonEmpty(user, "given_name", ClaimTypes.GivenName);
        var familyName = FirstNonEmpty(user, "family_name", ClaimTypes.Surname);
        return $"{givenName} {familyName}".Trim();
    }

    private static string FirstNonEmpty(ClaimsPrincipal user, params string[] claimTypes) =>
        claimTypes
            .Select(claimType => user.FindFirst(claimType)?.Value.Trim())
            .FirstOrDefault(value => !string.IsNullOrEmpty(value)) ?? string.Empty;
}
