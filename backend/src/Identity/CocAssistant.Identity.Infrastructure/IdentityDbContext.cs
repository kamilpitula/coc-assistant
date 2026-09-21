namespace CocAssistant.Identity.Infrastructure;

public class IdentityDbContext : DbContext
{
    public IdentityDbContext(DbContextOptions<IdentityDbContext> options)
        : base(options)
    {
    }

    public DbSet<Account> Accounts => Set<Account>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Account>(builder =>
        {
            builder.HasKey(account => account.Id);
            builder.Property(account => account.EntraObjectId).IsRequired().HasMaxLength(255);
            builder.HasIndex(account => account.EntraObjectId).IsUnique();
            builder.Property(account => account.DisplayName).IsRequired().HasMaxLength(256);
            builder.Property(account => account.Email).IsRequired().HasMaxLength(320);
        });
    }
}
