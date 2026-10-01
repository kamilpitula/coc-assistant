namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>Shared base that resolves the authenticated caller to a persistent Account id for CampaignPlay controllers.</summary>
[ApiController]
[Authorize]
public abstract class CampaignPlayControllerBase : ControllerBase
{
    private readonly AccountService _accountService;

    protected CampaignPlayControllerBase(AccountService accountService)
    {
        _accountService = accountService;
    }

    /// <summary>Resolves the caller's Entra identity to an Account id, provisioning on first contact; null when unidentifiable.</summary>
    protected async Task<Guid?> ResolveCallerAccountIdAsync(CancellationToken cancellationToken)
    {
        var entraObjectId = User.FindFirstValue("oid") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(entraObjectId))
        {
            return null;
        }

        var displayName = User.FindFirstValue("name") ?? User.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
        var email = User.FindFirstValue("emails") ?? User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

        var account = await _accountService.ProvisionAccountAsync(entraObjectId, displayName, email, cancellationToken);
        return account.Id;
    }
}
