namespace CocAssistant.ScenarioPreparation.Infrastructure;

public class ScenarioPreparationDbContext : DbContext
{
    public ScenarioPreparationDbContext(DbContextOptions<ScenarioPreparationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Scenario> Scenarios => Set<Scenario>();

    public DbSet<Scene> Scenes => Set<Scene>();

    public DbSet<HumanNpc> HumanNpcs => Set<HumanNpc>();

    public DbSet<MythosCreature> MythosCreatures => Set<MythosCreature>();

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

        // A Human NPC is its own aggregate and table (D6 of PBI-SP-003); the type is the table. The NPC Profile is a
        // versioned JSON column (ADR 0005, ADR 0007) and the Campaign is referenced by id only (ADR 0013).
        modelBuilder.Entity<HumanNpc>(builder =>
        {
            builder.HasKey(humanNpc => humanNpc.Id);
            builder.Property(humanNpc => humanNpc.Id).ValueGeneratedNever();
            builder.Property(humanNpc => humanNpc.CampaignId).IsRequired();
            builder.Property(humanNpc => humanNpc.Name).IsRequired().HasMaxLength(NpcProfileLimits.NameMaxLength);
            builder.Property(humanNpc => humanNpc.CreatedAt).IsRequired().HasConversion(
                createdAt => createdAt.UtcDateTime,
                stored => new DateTimeOffset(DateTime.SpecifyKind(stored, DateTimeKind.Utc)));
            builder.Property(humanNpc => humanNpc.Profile)
                .IsRequired()
                .HasConversion(
                    profile => HumanNpcProfileJsonStorage.ToStorage(profile),
                    stored => HumanNpcProfileJsonStorage.FromStorage(stored),
                    new ValueComparer<NpcProfile>(
                        (left, right) => HumanNpcProfileJsonStorage.ToStorage(left!) == HumanNpcProfileJsonStorage.ToStorage(right!),
                        profile => HumanNpcProfileJsonStorage.ToStorage(profile).GetHashCode(),
                        profile => HumanNpcProfileJsonStorage.FromStorage(HumanNpcProfileJsonStorage.ToStorage(profile))));

            // Serves the Campaign list read.
            builder.HasIndex(humanNpc => humanNpc.CampaignId);
        });

        // A Mythos Creature is its own aggregate and table (D1 of PBI-SP-009); the type is the table. The Monster Profile is
        // a versioned JSON column (ADR 0005, ADR 0007) and the Campaign is referenced by id only (ADR 0013).
        modelBuilder.Entity<MythosCreature>(builder =>
        {
            builder.HasKey(mythosCreature => mythosCreature.Id);
            builder.Property(mythosCreature => mythosCreature.Id).ValueGeneratedNever();
            builder.Property(mythosCreature => mythosCreature.CampaignId).IsRequired();
            builder.Property(mythosCreature => mythosCreature.Name).IsRequired().HasMaxLength(ProfileLimits.NameMaxLength);
            builder.Property(mythosCreature => mythosCreature.CreatedAt).IsRequired().HasConversion(
                createdAt => createdAt.UtcDateTime,
                stored => new DateTimeOffset(DateTime.SpecifyKind(stored, DateTimeKind.Utc)));
            builder.Property(mythosCreature => mythosCreature.Profile)
                .IsRequired()
                .HasConversion(
                    profile => MonsterProfileJsonStorage.ToStorage(profile),
                    stored => MonsterProfileJsonStorage.FromStorage(stored),
                    new ValueComparer<MonsterProfile>(
                        (left, right) => MonsterProfileJsonStorage.ToStorage(left!) == MonsterProfileJsonStorage.ToStorage(right!),
                        profile => MonsterProfileJsonStorage.ToStorage(profile).GetHashCode(),
                        profile => MonsterProfileJsonStorage.FromStorage(MonsterProfileJsonStorage.ToStorage(profile))));

            // Serves the Campaign list read.
            builder.HasIndex(mythosCreature => mythosCreature.CampaignId);
        });
    }

    private static readonly ValueConverter<DateTimeOffset?, DateTime?> NullableUtc = new(
        value => value.HasValue ? value.Value.UtcDateTime : null,
        stored => stored.HasValue ? new DateTimeOffset(DateTime.SpecifyKind(stored.Value, DateTimeKind.Utc)) : null);
}
