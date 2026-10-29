namespace CocAssistant.ScenePlay.Infrastructure;

public static class ScenePlayInfrastructureServiceCollectionExtensions
{
    /// <summary>Registers Scene Play. It owns no <c>DbContext</c>: it reaches Scenes and Campaign Play through ports (ADR 0024).</summary>
    public static IServiceCollection AddScenePlayInfrastructure(this IServiceCollection services)
    {
        services.AddScoped<ICampaignRoles, CampaignPlayCampaignRoles>();
        services.AddScoped<IApprovedInvestigators, CampaignPlayApprovedInvestigators>();
        services.AddScoped<IPlayableScenes, ScenarioPreparationPlayableScenes>();
        services.AddScoped<ISceneWallEntries, CampaignPlaySceneWallEntries>();
        services.AddScoped<IActiveSceneSignals, CampaignPlayActiveSceneSignals>();
        services.AddScoped<ActiveSceneService>();

        return services;
    }
}
