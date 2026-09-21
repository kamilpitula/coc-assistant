namespace CocAssistant.Identity.Infrastructure;

public static class IdentityInfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddIdentityInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<IdentityDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("IdentityDb")));

        services.AddScoped<IAccountRepository, EfAccountRepository>();
        services.AddScoped<AccountService>();
        services.AddSingleton(TimeProvider.System);

        return services;
    }
}
