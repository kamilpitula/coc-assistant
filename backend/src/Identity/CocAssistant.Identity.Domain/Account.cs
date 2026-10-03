namespace CocAssistant.Identity.Domain;

/// <summary>The Entra-issued identity for a person, independent of any Campaign.</summary>
public class Account
{
    public Guid Id { get; private set; }
    public string EntraObjectId { get; private set; }
    public string DisplayName { get; private set; }
    public string Email { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset LastSignedInAt { get; private set; }

    private Account()
    {
        EntraObjectId = string.Empty;
        DisplayName = string.Empty;
        Email = string.Empty;
    }

    public Account(string entraObjectId, string displayName, string email, DateTimeOffset signedInAt)
    {
        if (string.IsNullOrWhiteSpace(entraObjectId))
        {
            throw new ArgumentException("Entra object ID is required.", nameof(entraObjectId));
        }

        Id = Guid.NewGuid();
        EntraObjectId = entraObjectId;
        DisplayName = displayName;
        Email = email;
        CreatedAt = signedInAt;
        LastSignedInAt = signedInAt;
    }

    /// <summary>Refreshes the display name/email snapshot on a subsequent sign-in; empty values keep the stored ones.</summary>
    public void Touch(string displayName, string email, DateTimeOffset signedInAt)
    {
        if (!string.IsNullOrWhiteSpace(displayName))
        {
            DisplayName = displayName;
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            Email = email;
        }

        LastSignedInAt = signedInAt;
    }
}
