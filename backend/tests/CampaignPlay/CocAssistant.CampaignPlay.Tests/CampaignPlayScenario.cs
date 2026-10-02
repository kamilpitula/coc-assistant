namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Use-case helper that sets up Campaigns and their Players through the real application services,
/// each step in its own DbContext like a separate request.
/// </summary>
public sealed class CampaignPlayScenario : IDisposable
{
    public static readonly Guid KeeperAccountId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid PlayerAccountId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid OtherPlayerAccountId = Guid.Parse("33333333-3333-3333-3333-333333333333");
    public static readonly Guid StrangerAccountId = Guid.Parse("44444444-4444-4444-4444-444444444444");

    public SqliteCampaignPlayDbContextFixture Fixture { get; } = new();

    public FakeTimeProvider TimeProvider { get; } = new(new DateTimeOffset(2026, 10, 2, 12, 0, 0, TimeSpan.Zero));

    /// <summary>Creates a Campaign owned by <see cref="KeeperAccountId"/> unless another Keeper is given.</summary>
    public async Task<Guid> CreateCampaignAsync(AllowedCreationMethods? allowedCreationMethods = null, Guid? keeperAccountId = null)
    {
        using var context = Fixture.CreateContext();
        var service = new CampaignService(Fixture.CreateRepository(context), TimeProvider);
        var campaign = await service.CreateCampaignAsync(
            "The Haunting", keeperAccountId ?? KeeperAccountId, null, null, allowedCreationMethods, CancellationToken.None);
        return campaign.Id;
    }

    /// <summary>Admits the Account as a Player through a fresh Invite issued by the Campaign's Keeper.</summary>
    public async Task JoinAsPlayerAsync(Guid campaignId, Guid playerAccountId, Guid? keeperAccountId = null)
    {
        using var context = Fixture.CreateContext();
        var membership = new CampaignMembershipService(Fixture.CreateRepository(context), TimeProvider);
        var invite = await membership.IssueInviteAsync(campaignId, keeperAccountId ?? KeeperAccountId, CancellationToken.None);
        await membership.JoinAsync(invite!.Token, playerAccountId, CancellationToken.None);
    }

    /// <summary>Replaces the allowed Creation Methods as the Campaign's Keeper.</summary>
    public async Task ChangeAllowedCreationMethodsAsync(Guid campaignId, AllowedCreationMethods allowedCreationMethods)
    {
        using var context = Fixture.CreateContext();
        var service = new CampaignService(Fixture.CreateRepository(context), TimeProvider);
        await service.ChangeAllowedCreationMethodsAsync(campaignId, KeeperAccountId, allowedCreationMethods, CancellationToken.None);
    }

    public void Dispose() => Fixture.Dispose();
}
