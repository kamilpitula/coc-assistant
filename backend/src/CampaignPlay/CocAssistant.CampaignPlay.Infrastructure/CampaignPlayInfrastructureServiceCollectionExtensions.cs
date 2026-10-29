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
        services.AddScoped<CampaignMemberService>();
        services.AddScoped<CampaignListService>();
        services.AddScoped<CampaignPresenceService>();
        services.AddSingleton<IPresenceTracker, InMemoryPresenceTracker>();
        services.AddScoped<IDomainEventHandler<PlayerJoinedCampaign>, PublishMembersChangedOnPlayerJoined>();
        services.AddScoped<IDomainEventHandler<WallEntryAdded>, PublishWallEntryChanges>();
        services.AddScoped<IDomainEventHandler<WallEntryRemoved>, PublishWallEntryChanges>();
        services.AddScoped<IDomainEventHandler<InvestigatorCreated>, PublishInvestigatorChanges>();
        services.AddScoped<IDomainEventHandler<InvestigatorSubmitted>, PublishInvestigatorChanges>();
        services.AddScoped<IDomainEventHandler<InvestigatorApproved>, PublishInvestigatorChanges>();
        services.AddScoped<IDomainEventHandler<InvestigatorChangesRequested>, PublishInvestigatorChanges>();
        services.AddScoped<IDomainEventHandler<InvestigatorStartedOver>, PublishInvestigatorChanges>();
        services.AddScoped<IAccountDisplayNames, IdentityAccountDisplayNames>();
        services.AddScoped<IInvestigatorRepository, EfInvestigatorRepository>();
        services.AddScoped<IWallEntryRepository, EfWallEntryRepository>();
        services.AddScoped<WallEntryService>();
        services.AddScoped<ApprovedInvestigatorQuery>();
        services.AddScoped<PublishActiveSceneChanged>();
        services.AddScoped<PlayerInvestigatorService>();
        services.AddScoped<KeeperInvestigatorService>();
        services.AddSingleton<CreationRuleSets>();
        services.AddSingleton<CharacterSheetEvaluator>();
        services.AddSingleton<IRollSource, PlayerEnteredRollSource>();
        services.AddSingleton<IEraRuleData>(EmbeddedResourceEraRuleData.For1920s());
        services.AddSingleton<ICreationRuleData, EmbeddedResourceCreationRuleData>();
        services.TryAddSingleton(TimeProvider.System);

        return services;
    }
}
