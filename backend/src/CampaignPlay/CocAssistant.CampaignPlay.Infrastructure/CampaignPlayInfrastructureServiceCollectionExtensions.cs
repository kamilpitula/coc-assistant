namespace CocAssistant.CampaignPlay.Infrastructure;

public static class CampaignPlayInfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddCampaignPlayInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IDomainEventDispatcher, ServiceProviderDomainEventDispatcher>();
        services.AddScoped<DomainEventDispatchInterceptor>();
        services.AddDbContext<CampaignPlayDbContext>((serviceProvider, options) =>
            options
                .UseSqlServer(
                    configuration.GetConnectionString("CampaignPlayDb"),
                    sql => sql.MigrationsHistoryTable("__CampaignPlayMigrationsHistory"))
                .AddInterceptors(serviceProvider.GetRequiredService<DomainEventDispatchInterceptor>()));

        services.AddScoped<ICampaignRepository, EfCampaignRepository>();
        services.AddScoped<CampaignService>();
        services.AddScoped<CampaignMembershipService>();
        services.AddScoped<CampaignRuleDataService>();
        services.AddScoped<IAccountDisplayNames, IdentityAccountDisplayNames>();
        services.AddScoped<IInvestigatorRepository, EfInvestigatorRepository>();
        services.AddScoped<PlayerInvestigatorService>();
        services.AddScoped<KeeperInvestigatorService>();
        services.AddSingleton<CharacterSheetEvaluator>();
        services.AddSingleton<IRollSource, PlayerEnteredRollSource>();
        services.AddSingleton<IEraRuleData>(EmbeddedResourceEraRuleData.For1920s());
        services.AddSingleton<ICreationRuleData, EmbeddedResourceCreationRuleData>();
        services.TryAddSingleton(TimeProvider.System);

        return services;
    }
}
