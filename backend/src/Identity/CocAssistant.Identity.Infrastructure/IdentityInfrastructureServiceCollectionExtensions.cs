namespace CocAssistant.Identity.Infrastructure;

public static class IdentityInfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddIdentityInfrastructure(this IServiceCollection services, IConfiguration configuration, Action<SqlServerDbContextOptionsBuilder> configureSqlServer)
    {
        services.AddDbContext<IdentityDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("IdentityDb"),
                sql => configureSqlServer(sql)));

        services.AddScoped<IAccountRepository, EfAccountRepository>();
        services.AddScoped<AccountService>();
        services.AddScoped<AccountDisplayNameQuery>();
        services.AddSingleton(TimeProvider.System);

        return services;
    }
}
