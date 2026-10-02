namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// Verifies CampaignPlay migrations against data written under earlier schema versions. Uses its own SQL Server
/// database because each test migrates down and up, which would disturb the shared Respawn-managed database.
/// </summary>
public class CampaignPlayMigrationTests : IAsyncLifetime
{
    private static readonly string ConnectionString =
        SqlServerTestConnection.ForDatabase("CocAssistantCampaignPlayMigrationTests");

    private const string CreateCampaignMigration = "20260922072759_CreateCampaign";
    private const string AddCampaignInviteAndMembershipMigration = "20261001110509_AddCampaignInviteAndMembership";

    private static readonly DateTimeOffset CreatedAt = new(2026, 9, 22, 12, 0, 0, TimeSpan.Zero);

    private CampaignPlayDbContext _dbContext = null!;

    public async Task InitializeAsync()
    {
        var options = new DbContextOptionsBuilder<CampaignPlayDbContext>()
            .UseSqlServer(ConnectionString, sql => sql.MigrationsHistoryTable("__CampaignPlayMigrationsHistory"))
            .Options;
        _dbContext = new CampaignPlayDbContext(options);
        await _dbContext.Database.EnsureDeletedAsync();
    }

    public async Task DisposeAsync() => await _dbContext.DisposeAsync();

    private Task MigrateToAsync(string? targetMigration) =>
        _dbContext.GetService<IMigrator>().MigrateAsync(targetMigration);

    private Task InsertCampaignAsync(Guid campaignId) =>
        _dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO [Campaigns] ([Id], [Name], [KeeperAccountId], [CreatedAt]) VALUES ({campaignId}, {"The Haunting"}, {Guid.NewGuid()}, {CreatedAt})");

    private Task InsertInviteAsync(Guid campaignId, string token, string status, DateTimeOffset createdAt) =>
        _dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO [CampaignInvite] ([Id], [CampaignId], [Token], [Status], [CreatedAt]) VALUES ({Guid.NewGuid()}, {campaignId}, {token}, {status}, {createdAt})");

    private async Task<string> InviteStatusAsync(string token) =>
        await _dbContext.Database
            .SqlQuery<string>($"SELECT [Status] AS [Value] FROM [CampaignInvite] WHERE [Token] = {token}")
            .SingleAsync();

    [Fact]
    public async Task Given_a_campaign_created_before_player_limits_When_migrating_to_latest_Then_it_admits_eight_players()
    {
        var campaignId = Guid.NewGuid();
        await MigrateToAsync(CreateCampaignMigration);
        await InsertCampaignAsync(campaignId);

        await MigrateToAsync(null);

        var playerLimit = await _dbContext.Database
            .SqlQuery<int>($"SELECT [PlayerLimit] AS [Value] FROM [Campaigns] WHERE [Id] = {campaignId}")
            .SingleAsync();
        Assert.Equal(8, playerLimit);
    }

    [Fact]
    public async Task Given_a_campaign_with_two_active_invites_When_migrating_to_latest_Then_only_the_newest_stays_active()
    {
        var campaignId = Guid.NewGuid();
        await MigrateToAsync(AddCampaignInviteAndMembershipMigration);
        await InsertCampaignAsync(campaignId);
        await InsertInviteAsync(campaignId, "older-token", "Active", CreatedAt);
        await InsertInviteAsync(campaignId, "newer-token", "Active", CreatedAt.AddMinutes(5));

        await MigrateToAsync(null);

        Assert.Equal("Replaced", await InviteStatusAsync("older-token"));
        Assert.Equal("Active", await InviteStatusAsync("newer-token"));
    }

    [Fact]
    public async Task Given_a_campaign_with_an_active_invite_When_a_second_active_invite_is_written_Then_the_database_rejects_it()
    {
        var campaignId = Guid.NewGuid();
        await MigrateToAsync(null);
        await InsertCampaignAsync(campaignId);
        await InsertInviteAsync(campaignId, "first-token", "Active", CreatedAt);
        await InsertInviteAsync(campaignId, "revoked-token", "Revoked", CreatedAt);

        await Assert.ThrowsAsync<SqlException>(() => InsertInviteAsync(campaignId, "second-token", "Active", CreatedAt));
    }
}
