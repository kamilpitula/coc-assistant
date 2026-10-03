namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>
/// Resolves an authenticated Entra identity to a persistent Account id, provisioning the Account on first contact.
/// Shared by the CampaignPlay controllers and the Campaign hub so both map claims the same way.
/// </summary>
public sealed class CallerAccountResolver
{
    private readonly AccountService _accountService;

    public CallerAccountResolver(AccountService accountService)
    {
        _accountService = accountService;
    }

    /// <summary>The caller's Account id; null when the identity carries no object id.</summary>
    public async Task<Guid?> ResolveAsync(ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var entraObjectId = user.FindFirstValue("oid") ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(entraObjectId))
        {
            return null;
        }

        var displayName = user.FindFirstValue("name") ?? user.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
        var email = user.FindFirstValue("emails") ?? user.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

        var account = await _accountService.ProvisionAccountAsync(entraObjectId, displayName, email, cancellationToken);
        return account.Id;
    }
}
