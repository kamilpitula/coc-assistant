namespace CocAssistant.Identity.Tests;

public class AccountServiceTests : IDisposable
{
    private readonly SqliteIdentityDbContextFixture _fixture = new();
    private readonly FakeTimeProvider _timeProvider = new(DateTimeOffset.Parse("2026-01-01T00:00:00Z"));

    [Fact]
    public async Task Given_no_existing_account_When_provisioning_Then_a_new_account_is_created()
    {
        using var dbContext = _fixture.CreateContext();
        var service = new Application.AccountService(_fixture.CreateRepository(dbContext), _timeProvider);

        var account = await service.ProvisionAccountAsync("entra-oid-1", "Keeper One", "keeper@example.com", CancellationToken.None);

        Assert.Equal("entra-oid-1", account.EntraObjectId);
        Assert.Equal("Keeper One", account.DisplayName);
        Assert.Equal(_timeProvider.GetUtcNow(), account.CreatedAt);
        Assert.Equal(_timeProvider.GetUtcNow(), account.LastSignedInAt);
    }

    [Fact]
    public async Task Given_an_existing_account_When_provisioning_again_Then_its_snapshot_is_updated_not_duplicated()
    {
        using var firstContext = _fixture.CreateContext();
        var firstService = new Application.AccountService(_fixture.CreateRepository(firstContext), _timeProvider);
        await firstService.ProvisionAccountAsync("entra-oid-2", "Old Name", "old@example.com", CancellationToken.None);

        _timeProvider.Advance(TimeSpan.FromDays(1));

        using var secondContext = _fixture.CreateContext();
        var secondService = new Application.AccountService(_fixture.CreateRepository(secondContext), _timeProvider);
        var updated = await secondService.ProvisionAccountAsync("entra-oid-2", "New Name", "new@example.com", CancellationToken.None);

        Assert.Equal("New Name", updated.DisplayName);
        Assert.Equal("new@example.com", updated.Email);
        Assert.Equal(_timeProvider.GetUtcNow(), updated.LastSignedInAt);

        using var verifyContext = _fixture.CreateContext();
        Assert.Single(verifyContext.Accounts, a => a.EntraObjectId == "entra-oid-2");
    }

    public void Dispose() => _fixture.Dispose();
}
