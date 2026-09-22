namespace CocAssistant.CampaignPlay.Infrastructure;

public class CampaignPlayDbContext : DbContext
{
    public CampaignPlayDbContext(DbContextOptions<CampaignPlayDbContext> options)
        : base(options)
    {
    }

    public DbSet<Campaign> Campaigns => Set<Campaign>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Campaign>(builder =>
        {
            builder.HasKey(campaign => campaign.Id);
            builder.Property(campaign => campaign.Name).IsRequired().HasMaxLength(200);
            builder.Property(campaign => campaign.KeeperAccountId).IsRequired();
            builder.HasIndex(campaign => campaign.KeeperAccountId);
        });
    }
}
