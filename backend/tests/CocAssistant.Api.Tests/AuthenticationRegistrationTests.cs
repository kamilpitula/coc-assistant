using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace CocAssistant.Api.Tests;

public class AuthenticationRegistrationTests
{
    [Fact]
    public async Task Given_the_composition_root_When_started_Then_the_Bearer_authentication_scheme_is_registered()
    {
        await using var factory = new WebApplicationFactory<Program>();
        using var scope = factory.Services.CreateScope();
        var schemeProvider = scope.ServiceProvider.GetRequiredService<IAuthenticationSchemeProvider>();

        var scheme = await schemeProvider.GetSchemeAsync(Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme);

        Assert.NotNull(scheme);
    }
}
