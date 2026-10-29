namespace CocAssistant.ScenarioPreparation.Infrastructure;

public static class ScenarioPreparationInfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddScenarioPreparationInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ScenarioPreparationDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("ScenarioPreparationDb"),
                sql => sql.MigrationsHistoryTable("__ScenarioPreparationMigrationsHistory")));

        services.AddScoped<IScenarioRepository, EfScenarioRepository>();
        services.AddScoped<ISceneRepository, EfSceneRepository>();
        services.AddScoped<IHumanNpcRepository, EfHumanNpcRepository>();
        services.AddScoped<IMythosCreatureRepository, EfMythosCreatureRepository>();
        services.AddScoped<INonPlayerEntityDirectory, EfNonPlayerEntityDirectory>();
        services.AddScoped<INonPlayerEntityUsage, EfNonPlayerEntityUsage>();
        services.AddScoped<IItemRepository, EfItemRepository>();
        services.AddScoped<IItemDirectory, EfItemDirectory>();
        services.AddScoped<IItemUsage, EfItemUsage>();
        // Scene Play owns who holds an Item; PBI-SPL-003 replaces this placeholder with its adapter (ADR 0022).
        services.AddScoped<IItemHolders, NoItemHolders>();
        services.AddScoped<ICampaignKeepers, CampaignPlayCampaignKeepers>();
        services.AddSingleton<INonPlayerEntityRuleData, CampaignPlayNonPlayerEntityRuleData>();
        // Resolved on first use, not at registration, so EF design-time tooling works without storage settings.
        services.AddSingleton(provider => HandoutFileStoreRegistration.Create(provider.GetRequiredService<IConfiguration>()));
        services.AddScoped<ScenarioService>();
        services.AddScoped<SceneService>();
        services.AddScoped<SceneLifecycleService>();
        services.AddScoped<LinkedSceneGuard>();
        services.AddScoped<NonPlayerEntityLinkService>();
        services.AddScoped<ItemService>();
        services.AddScoped<ItemLinkService>();
        services.AddScoped<HandoutOwnerLocator>();
        services.AddScoped<HandoutService>();
        services.AddScoped<HandoutFileService>();
        services.AddScoped<HumanNpcService>();
        services.AddScoped<MythosCreatureService>();
        services.AddScoped<NonPlayerEntityService>();
        services.TryAddSingleton(TimeProvider.System);

        return services;
    }
}
