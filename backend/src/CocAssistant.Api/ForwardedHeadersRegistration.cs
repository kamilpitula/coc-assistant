namespace CocAssistant.Api;

/// <summary>
/// Trusts X-Forwarded-For and X-Forwarded-Proto from any proxy (specs/deployment/spec.md, Application changes;
/// PBI-DEP-002 D4): the Container Apps ingress, which terminates TLS, is the only path to the API, and no code reads
/// the client IP or the scheme. Locally and in E2E no proxy sends these headers, so behavior is unchanged.
/// </summary>
public static class ForwardedHeadersRegistration
{
    public static IServiceCollection AddIngressForwardedHeaders(this IServiceCollection services)
    {
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.KnownIPNetworks.Clear();
            options.KnownProxies.Clear();
        });
        return services;
    }
}
