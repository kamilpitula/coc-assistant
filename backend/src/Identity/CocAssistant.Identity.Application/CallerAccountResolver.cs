namespace CocAssistant.Identity.Application;

/// <summary>
/// Resolves an authenticated Entra identity to a persistent Account id, creating the Account on first contact.
/// Shared by every functionality's controllers and the Campaign hub so all map claims the same way.
/// </summary>
public sealed class CallerAccountResolver
{
    private readonly AccountService _accountService;

    public CallerAccountResolver(AccountService accountService)
    {
        _accountService = accountService;
    }

    /// <summary>The caller's Account id; null when the identity carries no object id. Never refreshes the Account snapshot.</summary>
    public async Task<Guid?> ResolveAsync(ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var identity = EntraIdentity.FromClaims(user);
        if (identity is null)
        {
            return null;
        }

        var account = await _accountService.FindOrCreateAccountAsync(identity, cancellationToken);
        return account.Id;
    }
}
