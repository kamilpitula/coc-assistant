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

    public async Task<Account> ProvisionAccountAsync(
        string entraObjectId,
        string displayName,
        string email,
        CancellationToken cancellationToken)
    {
        var now = _timeProvider.GetUtcNow();
        var account = await _accounts.FindByEntraObjectIdAsync(entraObjectId, cancellationToken);

        if (account is null)
        {
            account = new Account(entraObjectId, displayName, email, now);
            _accounts.Add(account);
        }
        else
        {
            account.Touch(displayName, email, now);
        }

        await _accounts.SaveChangesAsync(cancellationToken);
        return account;
    }
}
