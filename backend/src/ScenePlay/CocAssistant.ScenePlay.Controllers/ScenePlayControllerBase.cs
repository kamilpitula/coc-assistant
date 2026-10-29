namespace CocAssistant.ScenePlay.Controllers;

/// <summary>Shared base that resolves the authenticated caller to a persistent Account id for Scene Play controllers.</summary>
[ApiController]
[Authorize]
public abstract class ScenePlayControllerBase : ControllerBase
{
    private readonly CallerAccountResolver _callerAccountResolver;

    protected ScenePlayControllerBase(AccountService accountService)
    {
        _callerAccountResolver = new CallerAccountResolver(accountService);
    }

    /// <summary>Resolves the caller's Entra identity to an Account id, provisioning on first contact; null when unidentifiable.</summary>
    protected Task<Guid?> ResolveCallerAccountIdAsync(CancellationToken cancellationToken) =>
        _callerAccountResolver.ResolveAsync(User, cancellationToken);
}
