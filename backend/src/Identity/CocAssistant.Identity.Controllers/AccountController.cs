using System.Security.Claims;
using CocAssistant.Identity.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
        var entraObjectId = User.FindFirstValue("oid") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(entraObjectId))
        {
            return Unauthorized();
        }

        var displayName = User.FindFirstValue("name") ?? User.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
        var email = User.FindFirstValue("emails") ?? User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

        var account = await _accountService.ProvisionAccountAsync(entraObjectId, displayName, email, cancellationToken);

        return Ok(new AccountResponse(account.Id, account.DisplayName, account.Email));
    }
}
