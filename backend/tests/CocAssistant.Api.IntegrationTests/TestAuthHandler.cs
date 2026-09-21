namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// Replaces real Entra JWT validation in tests: authenticates every request unless the
/// "X-Test-Unauthenticated" header is present, using claims supplied via "X-Test-Oid"/"X-Test-Name"/"X-Test-Email".
/// </summary>
public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "TestScheme";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (Request.Headers.ContainsKey("X-Test-Unauthenticated"))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var oid = Request.Headers["X-Test-Oid"].FirstOrDefault() ?? "test-oid";
        var name = Request.Headers["X-Test-Name"].FirstOrDefault() ?? "Test Account";
        var email = Request.Headers["X-Test-Email"].FirstOrDefault() ?? "test@example.com";

        var claims = new[]
        {
            new Claim("oid", oid),
            new Claim("name", name),
            new Claim("emails", email),
        };
        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
