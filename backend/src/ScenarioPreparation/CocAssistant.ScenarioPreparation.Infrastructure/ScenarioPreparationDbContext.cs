namespace CocAssistant.ScenarioPreparation.Infrastructure;

public class ScenarioPreparationDbContext : DbContext
{
    public ScenarioPreparationDbContext(DbContextOptions<ScenarioPreparationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Scenario> Scenarios => Set<Scenario>();

    public DbSet<Scene> Scenes => Set<Scene>();

    public DbSet<NonPlayerEntityLink> NonPlayerEntityLinks => Set<NonPlayerEntityLink>();

    public DbSet<Item> Items => Set<Item>();

    public DbSet<ItemLink> ItemLinks => Set<ItemLink>();

    public DbSet<HumanNpc> HumanNpcs => Set<HumanNpc>();

    public DbSet<MythosCreature> MythosCreatures => Set<MythosCreature>();

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        DeleteOrphanedHandouts();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        DeleteOrphanedHandouts();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

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

        // A link is a child of its Scene, reached through the Scene's backing field. Its Human NPC and Mythos Creature keys are
        // in-context foreign keys (ADR 0019) that cascade, so deleting a profile or a Prepared Scene removes its links atomically.
        modelBuilder.Entity<Scene>().HasMany(scene => scene.NonPlayerEntityLinks)
            .WithOne()
            .HasForeignKey(link => link.SceneId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Scene>().Navigation(scene => scene.NonPlayerEntityLinks).UsePropertyAccessMode(PropertyAccessMode.Field);

        modelBuilder.Entity<NonPlayerEntityLink>(builder =>
        {
            builder.HasKey(link => link.Id);
            builder.Property(link => link.Id).ValueGeneratedNever();
            builder.Property<Guid?>("HumanNpcId");
            builder.Property<Guid?>("MythosCreatureId");
            builder.HasOne<HumanNpc>().WithMany().HasForeignKey("HumanNpcId").OnDelete(DeleteBehavior.Cascade);
            builder.HasOne<MythosCreature>().WithMany().HasForeignKey("MythosCreatureId").OnDelete(DeleteBehavior.Cascade);
            builder.Ignore(link => link.Type);
            builder.Ignore(link => link.NonPlayerEntityId);
            builder.Property(link => link.PlayerFacingName).IsRequired().HasMaxLength(NonPlayerEntityLink.PlayerFacingNameMaxLength);
            builder.Property(link => link.PlayerFacingDescription);
            builder.Property(link => link.CreatedAt).IsRequired().HasConversion(
                createdAt => createdAt.UtcDateTime,
                stored => new DateTimeOffset(DateTime.SpecifyKind(stored, DateTimeKind.Utc)));

            // Exactly one of the two keys is set; portable to SQLite and SQL Server.
            builder.ToTable(table => table.HasCheckConstraint(
                "CK_NonPlayerEntityLinks_OneNonPlayerEntity",
                "(HumanNpcId IS NOT NULL AND MythosCreatureId IS NULL) OR (HumanNpcId IS NULL AND MythosCreatureId IS NOT NULL)"));

            builder.HasIndex("HumanNpcId");
            builder.HasIndex("MythosCreatureId");
        });

        // An Item is its own aggregate and table, referencing its Campaign by id only (ADR 0013, ADR 0022). It has no holder column:
        // who holds an Item is read through a port.
        modelBuilder.Entity<Item>(builder =>
        {
            builder.HasKey(item => item.Id);
            builder.Property(item => item.Id).ValueGeneratedNever();
            builder.Property(item => item.CampaignId).IsRequired();
            builder.Property(item => item.Name).IsRequired().HasMaxLength(Item.NameMaxLength);
            builder.Property(item => item.PlayerFacingDescription).IsRequired();
            builder.Property(item => item.KeeperNotes);
            builder.Property(item => item.CreatedAt).IsRequired().HasConversion(
                createdAt => createdAt.UtcDateTime,
                stored => new DateTimeOffset(DateTime.SpecifyKind(stored, DateTimeKind.Utc)));

            // Serves the Campaign list read.
            builder.HasIndex(item => item.CampaignId);
        });

        // An Item link is a child of its Scene in its own table (ADR 0022). Its Scene and Item keys are in-context foreign keys that
        // cascade, so removing a Prepared Scene or deleting an Item removes its links atomically.
        modelBuilder.Entity<Scene>().HasMany(scene => scene.ItemLinks)
            .WithOne()
            .HasForeignKey(link => link.SceneId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Scene>().Navigation(scene => scene.ItemLinks).UsePropertyAccessMode(PropertyAccessMode.Field);

        modelBuilder.Entity<ItemLink>(builder =>
        {
            builder.HasKey(link => link.Id);
            builder.Property(link => link.Id).ValueGeneratedNever();
            builder.HasOne<Item>().WithMany().HasForeignKey(link => link.ItemId).OnDelete(DeleteBehavior.Cascade);
            builder.Property(link => link.CreatedAt).IsRequired().HasConversion(
                createdAt => createdAt.UtcDateTime,
                stored => new DateTimeOffset(DateTime.SpecifyKind(stored, DateTimeKind.Utc)));

            // A Scene links an Item at most once.
            builder.HasIndex(link => new { link.SceneId, link.ItemId }).IsUnique();
            builder.HasIndex(link => link.ItemId);
        });

        // A Handout is a child of its Scene or of its Item in one Handouts table (ADR 0020); removing a Prepared Scene or deleting an
        // Item removes its Handouts.
        modelBuilder.Entity<Scene>().HasMany(scene => scene.Handouts)
            .WithOne()
            .HasForeignKey(handout => handout.SceneId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Scene>().Navigation(scene => scene.Handouts).UsePropertyAccessMode(PropertyAccessMode.Field);
        modelBuilder.Entity<Item>().HasMany(item => item.Handouts)
            .WithOne()
            .HasForeignKey(handout => handout.ItemId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Item>().Navigation(item => item.Handouts).UsePropertyAccessMode(PropertyAccessMode.Field);

        modelBuilder.Entity<Handout>(builder =>
        {
            builder.ToTable("Handouts");
            builder.HasKey(handout => handout.Id);
            builder.Property(handout => handout.Id).ValueGeneratedNever();
            builder.Property(handout => handout.Kind).IsRequired().HasConversion<string>().HasMaxLength(20);
            builder.Property(handout => handout.Visibility).IsRequired().HasConversion<string>().HasMaxLength(20);
            builder.Property(handout => handout.Title).IsRequired().HasMaxLength(Handout.TitleMaxLength);
            builder.Property(handout => handout.Content);
            builder.Property(handout => handout.FileKey).HasMaxLength(32);
            builder.Property(handout => handout.FileName).HasMaxLength(255);
            builder.Property(handout => handout.FileMediaType).HasMaxLength(50);
            builder.Property(handout => handout.FileSizeBytes);
            builder.Ignore(handout => handout.File);
            builder.Property(handout => handout.Position).IsRequired();
            builder.Property(handout => handout.CreatedAt).IsRequired().HasConversion(
                createdAt => createdAt.UtcDateTime,
                stored => new DateTimeOffset(DateTime.SpecifyKind(stored, DateTimeKind.Utc)));

            // A rich-text Handout has content and no file; a file Handout has all four file columns and no content (ADR 0021).
            builder.ToTable(table => table.HasCheckConstraint(
                "CK_Handouts_Content",
                "(Kind IN ('ReadAloud', 'Text') AND Content IS NOT NULL AND FileKey IS NULL AND FileName IS NULL AND FileMediaType IS NULL AND FileSizeBytes IS NULL) "
                + "OR (Kind IN ('Image', 'Document', 'Map') AND Content IS NULL AND FileKey IS NOT NULL AND FileName IS NOT NULL AND FileMediaType IS NOT NULL AND FileSizeBytes IS NOT NULL)"));

            // Every Handout has exactly one owner, a Scene or an Item (ADR 0020).
            builder.ToTable(table => table.HasCheckConstraint(
                "CK_Handouts_OneOwner",
                "(SceneId IS NOT NULL AND ItemId IS NULL) OR (SceneId IS NULL AND ItemId IS NOT NULL)"));

            // Serve the owner's order read; deliberately not unique (ADR 0014).
            builder.HasIndex(handout => new { handout.SceneId, handout.Position });
            builder.HasIndex(handout => new { handout.ItemId, handout.Position });
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

    // A Handout has two optional owner keys (ADR 0020), so removing one from its owner's list would only null its owner key and
    // break CK_Handouts_OneOwner. A Handout that lost its only owner is deleted instead, as a required relationship would do.
    private void DeleteOrphanedHandouts()
    {
        ChangeTracker.DetectChanges();
        var orphans = ChangeTracker.Entries<Handout>()
            .Where(entry => entry.State == EntityState.Modified && entry.Entity.SceneId is null && entry.Entity.ItemId is null)
            .ToList();
        foreach (var orphan in orphans)
        {
            orphan.State = EntityState.Deleted;
        }
    }

    private static readonly ValueConverter<DateTimeOffset?, DateTime?> NullableUtc = new(
        value => value.HasValue ? value.Value.UtcDateTime : null,
        stored => stored.HasValue ? new DateTimeOffset(DateTime.SpecifyKind(stored.Value, DateTimeKind.Utc)) : null);
}
