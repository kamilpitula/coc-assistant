namespace CocAssistant.Api;

/// <summary>
/// The SPA-origin CORS policy (specs/deployment/spec.md, Application changes; ADR 0031 amendment, PBI-DEP-002 D3):
/// one named policy from the Cors:AllowedOrigins array, attached to the controllers and the Campaign hub only, with
/// credentials. With no origins configured, no cross-origin request is allowed, exactly like today locally and in E2E.
/// </summary>
public static class CrossOriginRegistration
{
    public const string PolicyName = "Spa";

    public const string AllowedOriginsKey = "Cors:AllowedOrigins";

    /// <summary>Reads the allowed origins array, trimming whitespace and one trailing slash and dropping empties.</summary>
    public static IReadOnlyList<string> ReadAllowedOrigins(IConfiguration configuration)
    {
        var origins = configuration.GetSection(AllowedOriginsKey).Get<string[]>();
        if (origins is null)
        {
            return [];
        }

        return origins
            .Select(origin => origin.Trim())
            .Where(origin => origin.Length > 0)
            .Select(origin => origin.EndsWith('/') ? origin[..^1] : origin)
            .Where(origin => origin.Length > 0)
            .ToList();
    }

    public static IServiceCollection AddCrossOrigin(this IServiceCollection services, IConfiguration configuration)
    {
        var origins = ReadAllowedOrigins(configuration);
        return services.AddCors(options => options.AddPolicy(
            PolicyName,
            policy => policy
                .WithOrigins([.. origins])
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials()
                .SetPreflightMaxAge(TimeSpan.FromMinutes(10))));
    }
}
