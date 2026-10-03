namespace CocAssistant.Identity.Application;

/// <summary>JIT-provisions an Account: creates it on first sign-in, refreshes its snapshot on later ones.</summary>
public class AccountService
{
    private readonly IAccountRepository _accounts;
    private readonly TimeProvider _timeProvider;

    public AccountService(IAccountRepository accounts, TimeProvider timeProvider)
    {
        _accounts = accounts;
        _timeProvider = timeProvider;
    }

    /// <summary>Creates the Account on first sign-in, otherwise refreshes its snapshot (GET /api/account/me).</summary>
    public async Task<Account> ProvisionAccountAsync(EntraIdentity identity, CancellationToken cancellationToken)
    {
        var now = _timeProvider.GetUtcNow();
        var account = await _accounts.FindByEntraObjectIdAsync(identity.EntraObjectId, cancellationToken);

        if (account is null)
        {
            account = Create(identity, now);
        }
        else
        {
            account.Touch(identity.DisplayName, identity.Email, now);
        }

        await _accounts.SaveChangesAsync(cancellationToken);
        return account;
    }

    /// <summary>Returns the existing Account unchanged, creating it only on first contact.</summary>
    public async Task<Account> FindOrCreateAccountAsync(EntraIdentity identity, CancellationToken cancellationToken)
    {
        var account = await _accounts.FindByEntraObjectIdAsync(identity.EntraObjectId, cancellationToken);
        if (account is not null)
        {
            return account;
        }

        account = Create(identity, _timeProvider.GetUtcNow());
        await _accounts.SaveChangesAsync(cancellationToken);
        return account;
    }

    private Account Create(EntraIdentity identity, DateTimeOffset now)
    {
        var account = new Account(identity.EntraObjectId, identity.DisplayName, identity.Email, now);
        _accounts.Add(account);
        return account;
    }
}
