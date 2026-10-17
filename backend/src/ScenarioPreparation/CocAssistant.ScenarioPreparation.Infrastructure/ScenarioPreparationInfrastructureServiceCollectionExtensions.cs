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
        services.AddScoped<INonPlayerEntityDirectory, EfNonPlayerEntityDirectory>();
        services.AddScoped<ICampaignKeepers, CampaignPlayCampaignKeepers>();
        services.AddSingleton<INonPlayerEntityRuleData, CampaignPlayNonPlayerEntityRuleData>();
        services.AddScoped<ScenarioService>();
        services.AddScoped<SceneService>();
        services.TryAddSingleton(TimeProvider.System);

        return services;
    }
}
