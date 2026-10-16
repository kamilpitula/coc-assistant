namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>Shared base that resolves the authenticated caller to a persistent Account id for Scenario Preparation controllers.</summary>
[ApiController]
[Authorize]
public abstract class ScenarioPreparationControllerBase : ControllerBase
{
    private readonly CallerAccountResolver _callerAccountResolver;

    protected ScenarioPreparationControllerBase(AccountService accountService)
    {
        _callerAccountResolver = new CallerAccountResolver(accountService);
    }

    /// <summary>Resolves the caller's Entra identity to an Account id, provisioning on first contact; null when unidentifiable.</summary>
    protected Task<Guid?> ResolveCallerAccountIdAsync(CancellationToken cancellationToken) =>
        _callerAccountResolver.ResolveAsync(User, cancellationToken);
}
