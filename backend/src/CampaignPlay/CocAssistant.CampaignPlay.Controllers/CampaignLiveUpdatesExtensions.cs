namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>Registers and maps the Campaign hub; the composition root adds SignalR itself (ADR 0009).</summary>
public static class CampaignLiveUpdatesExtensions
{
    public static IServiceCollection AddCampaignPlayLiveUpdates(this IServiceCollection services)
    {
        services.AddScoped<CallerAccountResolver>();
        services.AddSingleton<ICampaignLiveUpdates, HubCampaignLiveUpdates>();
        return services;
    }

    /// <summary>Maps the hub; connections close when the access token expires.</summary>
    public static HubEndpointConventionBuilder MapCampaignHub(this IEndpointRouteBuilder endpoints) =>
        endpoints.MapHub<CampaignHub>(CampaignHub.Path, options => options.CloseOnAuthenticationExpiration = true);
}
