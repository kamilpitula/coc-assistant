namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// The role-aware Campaign read for its members
/// (specs/campaign-play/spec.md API Contracts, GET /api/campaigns/{campaignId}).
/// </summary>
public class CampaignServiceMemberReadTests : IDisposable
{
    private readonly CampaignPlayScenario _scenario = new();

    private async Task<MemberCampaign?> ReadAsync(Guid campaignId, Guid accountId)
    {
        using var context = _scenario.Fixture.CreateContext();
        var service = new CampaignService(_scenario.Fixture.CreateRepository(context), _scenario.TimeProvider);
        return await service.GetForMemberAsync(campaignId, accountId, CancellationToken.None);
    }

    [Fact]
    public async Task Given_a_campaign_When_its_keeper_reads_it_Then_it_is_returned_with_the_keeper_role()
    {
        var campaignId = await _scenario.CreateCampaignAsync();

        var result = await ReadAsync(campaignId, CampaignPlayScenario.KeeperAccountId);

        Assert.NotNull(result);
        Assert.Equal(campaignId, result.Campaign.Id);
        Assert.Equal(CampaignRole.Keeper, result.Role);
    }

    [Fact]
    public async Task Given_a_player_has_joined_When_the_player_reads_the_campaign_Then_it_is_returned_with_the_player_role()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);

        var result = await ReadAsync(campaignId, CampaignPlayScenario.PlayerAccountId);

        Assert.NotNull(result);
        Assert.Equal(CampaignRole.Player, result.Role);
    }

    [Fact]
    public async Task Given_a_campaign_When_a_non_member_reads_it_Then_nothing_is_returned()
    {
        var campaignId = await _scenario.CreateCampaignAsync();

        Assert.Null(await ReadAsync(campaignId, CampaignPlayScenario.StrangerAccountId));
    }

    [Fact]
    public async Task Given_no_campaign_When_reading_it_Then_nothing_is_returned()
    {
        Assert.Null(await ReadAsync(Guid.NewGuid(), CampaignPlayScenario.KeeperAccountId));
    }

    public void Dispose() => _scenario.Dispose();
}
