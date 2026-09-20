using CocAssistant.Identity.Domain;

namespace CocAssistant.Identity.Application;

/// <summary>Application port for Account persistence, implemented by Infrastructure.</summary>
public interface IAccountRepository
{
    Task<Account?> FindByEntraObjectIdAsync(string entraObjectId, CancellationToken cancellationToken);

    void Add(Account account);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
