namespace CocAssistant.ScenarioPreparation.Infrastructure;

public class ScenarioPreparationDbContext : DbContext
{
    public ScenarioPreparationDbContext(DbContextOptions<ScenarioPreparationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Scenario> Scenarios => Set<Scenario>();

    public DbSet<Scene> Scenes => Set<Scene>();

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

        // A Scene keeps its Campaign id beside its Scenario id (ADR 0016). The foreign key to Scenarios is allowed
        // because both tables share this context; ADR 0013 forbids only keys across contexts.
        modelBuilder.Entity<Scene>(builder =>
        {
            builder.HasKey(scene => scene.Id);
            builder.Property(scene => scene.Id).ValueGeneratedNever();
            builder.Property(scene => scene.CampaignId).IsRequired();
            builder.HasOne<Scenario>().WithMany().HasForeignKey(scene => scene.ScenarioId).OnDelete(DeleteBehavior.Restrict);
            builder.Property(scene => scene.Title).IsRequired().HasMaxLength(Scene.TitleMaxLength);
            builder.Property(scene => scene.Location).IsRequired().HasMaxLength(Scene.LocationMaxLength);
            builder.Property(scene => scene.KeeperNotes);
            builder.Property(scene => scene.Position).IsRequired();
            builder.Property(scene => scene.Status).IsRequired().HasConversion<string>().HasMaxLength(20);
            builder.Property(scene => scene.StartedAt).HasConversion(NullableUtc);
            builder.Property(scene => scene.FinishedAt).HasConversion(NullableUtc);
            builder.Property(scene => scene.CreatedAt).IsRequired().HasConversion(
                createdAt => createdAt.UtcDateTime,
                stored => new DateTimeOffset(DateTime.SpecifyKind(stored, DateTimeKind.Utc)));

            // Serves the prepared-order read; deliberately not unique (ADR 0014).
            builder.HasIndex(scene => new { scene.ScenarioId, scene.Position });
        });
    }

    private static readonly ValueConverter<DateTimeOffset?, DateTime?> NullableUtc = new(
        value => value.HasValue ? value.Value.UtcDateTime : null,
        stored => stored.HasValue ? new DateTimeOffset(DateTime.SpecifyKind(stored.Value, DateTimeKind.Utc)) : null);
}
