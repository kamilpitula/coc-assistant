namespace CocAssistant.Identity.Controllers;

[ApiController]
[Route("api/account")]
[Authorize]
public class AccountController : ControllerBase
{
    private readonly AccountService _accountService;

    public AccountController(AccountService accountService)
    {
        _accountService = accountService;
    }

    /// <summary>JIT-provisions the caller's Account from their bearer token claims and returns it.</summary>
    [HttpGet("me")]
    public async Task<ActionResult<AccountResponse>> GetMe(CancellationToken cancellationToken)
    {
        var identity = EntraIdentity.FromClaims(User);
        if (identity is null)
        {
            return Unauthorized();
        }

        var account = await _accountService.ProvisionAccountAsync(identity, cancellationToken);

        return Ok(new AccountResponse(account.Id, account.DisplayName, account.Email));
    }
}
