namespace CocAssistant.CampaignPlay.Infrastructure;

public static class CampaignPlayInfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddCampaignPlayInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<CampaignPlayDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("CampaignPlayDb"),
                sql => sql.MigrationsHistoryTable("__CampaignPlayMigrationsHistory")));

        services.AddScoped<ICampaignRepository, EfCampaignRepository>();
        services.AddScoped<CampaignService>();
        services.TryAddSingleton(TimeProvider.System);

        return services;
    }
}
