namespace CocAssistant.CampaignPlay.Infrastructure;

public class CampaignPlayDbContext : DbContext
{
    public const string ActiveInviteIndexName = "IX_CampaignInvite_CampaignId_Active";

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
            builder.Property(campaign => campaign.PlayerLimit).IsRequired();
            builder.Property(campaign => campaign.MembershipVersion).IsConcurrencyToken();
            builder.HasIndex(campaign => campaign.KeeperAccountId);

            builder.HasMany(campaign => campaign.Invites)
                .WithOne()
                .HasForeignKey(invite => invite.CampaignId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Metadata.FindNavigation(nameof(Campaign.Invites))!
                .SetPropertyAccessMode(PropertyAccessMode.Field);

            builder.HasMany(campaign => campaign.Players)
                .WithOne()
                .HasForeignKey(player => player.CampaignId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Metadata.FindNavigation(nameof(Campaign.Players))!
                .SetPropertyAccessMode(PropertyAccessMode.Field);
        });

        modelBuilder.Entity<CampaignInvite>(builder =>
        {
            builder.HasKey(invite => invite.Id);
            builder.Property(invite => invite.Id).ValueGeneratedNever();
            builder.Property(invite => invite.Token).IsRequired().HasMaxLength(64);
            builder.Property(invite => invite.Status).IsRequired().HasConversion<string>().HasMaxLength(20);
            builder.HasIndex(invite => invite.Token).IsUnique();
            builder.HasIndex(invite => invite.CampaignId, "IX_CampaignInvite_CampaignId");

            // Enforces exactly one active Campaign Invite per Campaign, even under concurrent issue/replace.
            builder.HasIndex(invite => invite.CampaignId, ActiveInviteIndexName)
                .IsUnique()
                .HasFilter($"[Status] = '{nameof(CampaignInviteStatus.Active)}'");
        });

        modelBuilder.Entity<CampaignPlayer>(builder =>
        {
            builder.HasKey(player => player.Id);
            builder.Property(player => player.Id).ValueGeneratedNever();
            builder.Property(player => player.AccountId).IsRequired();
            builder.Property(player => player.InviteId).IsRequired();
            builder.HasIndex(player => new { player.CampaignId, player.AccountId }).IsUnique();
        });
    }
}
