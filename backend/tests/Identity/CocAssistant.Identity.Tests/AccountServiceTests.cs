namespace CocAssistant.Identity.Tests;

public class AccountServiceTests : IDisposable
{
    private readonly SqliteIdentityDbContextFixture _fixture = new();
    private readonly FakeTimeProvider _timeProvider = new(DateTimeOffset.Parse("2026-01-01T00:00:00Z"));

    private AccountService CreateService(IdentityDbContext dbContext) =>
        new(_fixture.CreateRepository(dbContext), _timeProvider);

    private async Task SignInAsync(string entraObjectId, string displayName, string email)
    {
        using var dbContext = _fixture.CreateContext();
        await CreateService(dbContext).ProvisionAccountAsync(new EntraIdentity(entraObjectId, displayName, email), CancellationToken.None);
    }

    [Fact]
    public async Task Given_no_existing_account_When_provisioning_Then_a_new_account_is_created()
    {
        using var dbContext = _fixture.CreateContext();

        var account = await CreateService(dbContext).ProvisionAccountAsync(
            new EntraIdentity("entra-oid-1", "Keeper One", "keeper@example.com"), CancellationToken.None);

        Assert.Equal("entra-oid-1", account.EntraObjectId);
        Assert.Equal("Keeper One", account.DisplayName);
        Assert.Equal(_timeProvider.GetUtcNow(), account.CreatedAt);
        Assert.Equal(_timeProvider.GetUtcNow(), account.LastSignedInAt);
    }

    [Fact]
    public async Task Given_an_existing_account_When_provisioning_again_Then_its_snapshot_is_updated_not_duplicated()
    {
        await SignInAsync("entra-oid-2", "Old Name", "old@example.com");
        _timeProvider.Advance(TimeSpan.FromDays(1));

        using var secondContext = _fixture.CreateContext();
        var updated = await CreateService(secondContext).ProvisionAccountAsync(
            new EntraIdentity("entra-oid-2", "New Name", "new@example.com"), CancellationToken.None);

        Assert.Equal("New Name", updated.DisplayName);
        Assert.Equal("new@example.com", updated.Email);
        Assert.Equal(_timeProvider.GetUtcNow(), updated.LastSignedInAt);

        using var verifyContext = _fixture.CreateContext();
        Assert.Single(verifyContext.Accounts, a => a.EntraObjectId == "entra-oid-2");
    }

    [Fact]
    public async Task Given_an_existing_account_When_provisioning_with_empty_claims_Then_the_stored_snapshot_is_kept()
    {
        await SignInAsync("entra-oid-3", "Keeper Three", "three@example.com");
        _timeProvider.Advance(TimeSpan.FromDays(1));

        using var secondContext = _fixture.CreateContext();
        var updated = await CreateService(secondContext).ProvisionAccountAsync(
            new EntraIdentity("entra-oid-3", string.Empty, string.Empty), CancellationToken.None);

        Assert.Equal("Keeper Three", updated.DisplayName);
        Assert.Equal("three@example.com", updated.Email);
        Assert.Equal(_timeProvider.GetUtcNow(), updated.LastSignedInAt);
    }

    [Fact]
    public async Task Given_no_existing_account_When_finding_or_creating_Then_a_new_account_is_created()
    {
        using var dbContext = _fixture.CreateContext();

        var account = await CreateService(dbContext).FindOrCreateAccountAsync(
            new EntraIdentity("entra-oid-4", "Player Four", "four@example.com"), CancellationToken.None);

        Assert.Equal("Player Four", account.DisplayName);
        using var verifyContext = _fixture.CreateContext();
        Assert.Single(verifyContext.Accounts, a => a.EntraObjectId == "entra-oid-4");
    }

    [Fact]
    public async Task Given_an_existing_account_When_finding_or_creating_Then_its_snapshot_is_not_changed()
    {
        await SignInAsync("entra-oid-5", "Player Five", "five@example.com");
        var signedInAt = _timeProvider.GetUtcNow();
        _timeProvider.Advance(TimeSpan.FromDays(1));

        using var secondContext = _fixture.CreateContext();
        var account = await CreateService(secondContext).FindOrCreateAccountAsync(
            new EntraIdentity("entra-oid-5", "Other Name", "other@example.com"), CancellationToken.None);

        using var verifyContext = _fixture.CreateContext();
        var stored = Assert.Single(verifyContext.Accounts, a => a.EntraObjectId == "entra-oid-5");
        Assert.Equal(account.Id, stored.Id);
        Assert.Equal("Player Five", stored.DisplayName);
        Assert.Equal("five@example.com", stored.Email);
        Assert.Equal(signedInAt, stored.LastSignedInAt);
    }

    public void Dispose() => _fixture.Dispose();
}
