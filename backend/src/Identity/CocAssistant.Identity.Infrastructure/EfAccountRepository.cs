namespace CocAssistant.Identity.Infrastructure;

public class EfAccountRepository : IAccountRepository
{
    private readonly IdentityDbContext _dbContext;

    public EfAccountRepository(IdentityDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<Account?> FindByEntraObjectIdAsync(string entraObjectId, CancellationToken cancellationToken) =>
        _dbContext.Accounts.SingleOrDefaultAsync(account => account.EntraObjectId == entraObjectId, cancellationToken);

    public void Add(Account account) => _dbContext.Accounts.Add(account);

    public Task SaveChangesAsync(CancellationToken cancellationToken) => _dbContext.SaveChangesAsync(cancellationToken);
}
