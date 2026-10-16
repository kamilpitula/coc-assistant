namespace CocAssistant.ScenarioPreparation.Infrastructure;

public class ScenarioPreparationDbContext : DbContext
{
    public ScenarioPreparationDbContext(DbContextOptions<ScenarioPreparationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Scenario> Scenarios => Set<Scenario>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // No Campaign entity and no foreign key: a Scenario references its Campaign by id only (ADR 0013).
        modelBuilder.Entity<Scenario>(builder =>
        {
            builder.HasKey(scenario => scenario.Id);
            builder.Property(scenario => scenario.Id).ValueGeneratedNever();
            builder.Property(scenario => scenario.CampaignId).IsRequired();
            builder.Property(scenario => scenario.Title).IsRequired().HasMaxLength(Scenario.TitleMaxLength);
            builder.Property(scenario => scenario.KeeperNotes).IsRequired().HasMaxLength(Scenario.KeeperNotesMaxLength);
            builder.Property(scenario => scenario.Position).IsRequired();

            // Stored as a UTC datetime2 so every provider can order and compare it (the tie-break in ADR 0014).
            builder.Property(scenario => scenario.CreatedAt)
                .IsRequired()
                .HasConversion(
                    createdAt => createdAt.UtcDateTime,
                    stored => new DateTimeOffset(DateTime.SpecifyKind(stored, DateTimeKind.Utc)));

            // Serves the Campaign-order read; deliberately not unique (ADR 0014).
            builder.HasIndex(scenario => new { scenario.CampaignId, scenario.Position });
        });
    }
}
