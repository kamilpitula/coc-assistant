namespace CocAssistant.Identity.Tests;

/// <summary>The application query other functionalities use to show Account display names (ADR 0008).</summary>
public class AccountDisplayNameQueryTests : IDisposable
{
    private readonly SqliteIdentityDbContextFixture _fixture = new();
    private readonly FakeTimeProvider _timeProvider = new(DateTimeOffset.Parse("2026-10-02T00:00:00Z"));

    private async Task<Guid> ProvisionAsync(string entraObjectId, string displayName)
    {
        using var dbContext = _fixture.CreateContext();
        var service = new AccountService(_fixture.CreateRepository(dbContext), _timeProvider);
        var account = await service.ProvisionAccountAsync(new EntraIdentity(entraObjectId, displayName, $"{entraObjectId}@example.com"), CancellationToken.None);
        return account.Id;
    }

    [Fact]
    public async Task Given_known_accounts_When_reading_their_display_names_Then_each_is_returned_by_account_id()
    {
        var adaId = await ProvisionAsync("oid-ada", "Ada Lovelace");
        var harveyId = await ProvisionAsync("oid-harvey", "Harvey Walters");
        await ProvisionAsync("oid-other", "Someone Else");
        using var dbContext = _fixture.CreateContext();
        var query = new AccountDisplayNameQuery(_fixture.CreateRepository(dbContext));

        var names = await query.GetDisplayNamesAsync([adaId, harveyId], CancellationToken.None);

        Assert.Equal(2, names.Count);
        Assert.Equal("Ada Lovelace", names[adaId]);
        Assert.Equal("Harvey Walters", names[harveyId]);
    }

    [Fact]
    public async Task Given_an_unknown_account_id_When_reading_display_names_Then_it_is_omitted()
    {
        var adaId = await ProvisionAsync("oid-ada", "Ada Lovelace");
        using var dbContext = _fixture.CreateContext();
        var query = new AccountDisplayNameQuery(_fixture.CreateRepository(dbContext));

        var names = await query.GetDisplayNamesAsync([adaId, Guid.NewGuid()], CancellationToken.None);

        Assert.Equal("Ada Lovelace", Assert.Single(names).Value);
    }

    public void Dispose() => _fixture.Dispose();
}
