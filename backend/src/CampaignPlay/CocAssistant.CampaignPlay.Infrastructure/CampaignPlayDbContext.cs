namespace CocAssistant.CampaignPlay.Infrastructure;

public class CampaignPlayDbContext : DbContext
{
    public const string ActiveInviteIndexName = "IX_CampaignInvite_CampaignId_Active";

    public CampaignPlayDbContext(DbContextOptions<CampaignPlayDbContext> options)
        : base(options)
    {
    }

    /// <summary>Enforces one Investigator per Player per Campaign (ADR 0005, ADR 0007).</summary>
    public const string OneInvestigatorPerPlayerIndexName = "IX_Investigator_CampaignId_PlayerAccountId";

    public DbSet<Campaign> Campaigns => Set<Campaign>();

    public DbSet<Investigator> Investigators => Set<Investigator>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Campaign>(builder =>
        {
            builder.HasKey(campaign => campaign.Id);
            builder.Ignore(campaign => campaign.DomainEvents);
            builder.Property(campaign => campaign.Name).IsRequired().HasMaxLength(200);
            builder.Property(campaign => campaign.KeeperAccountId).IsRequired();
            builder.Property(campaign => campaign.PlayerLimit).IsRequired();
            builder.Property(campaign => campaign.MembershipVersion).IsConcurrencyToken();
            builder.Property(campaign => campaign.Era)
                .IsRequired()
                .HasMaxLength(CampaignRulesOptionsStorage.EraMaxLength)
                .HasConversion(era => CampaignRulesOptionsStorage.ToStorage(era), code => CampaignRulesOptionsStorage.ToEra(code));
            builder.Property(campaign => campaign.AllowedCreationMethods)
                .IsRequired()
                .HasMaxLength(CampaignRulesOptionsStorage.AllowedCreationMethodsMaxLength)
                .HasConversion(
                    methods => CampaignRulesOptionsStorage.ToStorage(methods),
                    stored => CampaignRulesOptionsStorage.ToAllowedCreationMethods(stored));
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

        modelBuilder.Entity<Investigator>(builder =>
        {
            builder.HasKey(investigator => investigator.Id);
            builder.Ignore(investigator => investigator.DomainEvents);
            builder.Property(investigator => investigator.Id).ValueGeneratedNever();
            builder.Property(investigator => investigator.PlayerAccountId).IsRequired();
            builder.Property(investigator => investigator.Status).IsRequired().HasConversion<string>().HasMaxLength(20);
            builder.Property(investigator => investigator.ChangeRequestComment).HasMaxLength(Investigator.ChangeRequestCommentMaxLength);
            builder.Property(investigator => investigator.Version).IsConcurrencyToken();
            builder.Property(investigator => investigator.CharacterSheet)
                .IsRequired()
                .HasConversion(
                    sheet => CharacterSheetJsonStorage.ToStorage(sheet),
                    stored => CharacterSheetJsonStorage.FromStorage(stored),
                    new ValueComparer<CharacterSheet>(
                        (left, right) => CharacterSheetJsonStorage.ToStorage(left!) == CharacterSheetJsonStorage.ToStorage(right!),
                        sheet => CharacterSheetJsonStorage.ToStorage(sheet).GetHashCode(),
                        sheet => CharacterSheetJsonStorage.FromStorage(CharacterSheetJsonStorage.ToStorage(sheet))));

            // A separate aggregate (ADR 0005) that still belongs to exactly one Campaign.
            builder.HasOne<Campaign>()
                .WithMany()
                .HasForeignKey(investigator => investigator.CampaignId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(investigator => new { investigator.CampaignId, investigator.PlayerAccountId }, OneInvestigatorPerPlayerIndexName)
                .IsUnique();
        });
    }
}
