namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// The in-memory Presence tracker adapter (ADR 0010): Presence per Campaign, scoped to that Campaign
/// (specs/campaign-play/spec.md, Scenario "Presence stays within its Campaign").
/// </summary>
public class InMemoryPresenceTrackerTests
{
    private static readonly Guid CampaignA = Guid.Parse("cccccccc-0000-0000-0000-00000000000a");
    private static readonly Guid CampaignB = Guid.Parse("cccccccc-0000-0000-0000-00000000000b");
    private static readonly Guid Member = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid OtherMember = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000002");

    private readonly InMemoryPresenceTracker _tracker = new();

    [Fact]
    public async Task Given_a_member_connects_to_one_campaign_When_reading_another_campaign_Then_it_has_no_connected_members()
    {
        var transition = await _tracker.OpenAsync(CampaignA, "connection-1", Member, CancellationToken.None);

        Assert.Equal(new PresenceTransition(Member, MemberPresence.Connected), transition);
        Assert.Equal([Member], await _tracker.GetConnectedMembersAsync(CampaignA, CancellationToken.None));
        Assert.Empty(await _tracker.GetConnectedMembersAsync(CampaignB, CancellationToken.None));
    }

    [Fact]
    public async Task Given_a_connection_subscribed_to_two_campaigns_When_it_closes_Then_each_campaign_gets_its_transition()
    {
        await _tracker.OpenAsync(CampaignA, "connection-1", Member, CancellationToken.None);
        await _tracker.OpenAsync(CampaignB, "connection-1", OtherMember, CancellationToken.None);

        var transitions = await _tracker.CloseAsync("connection-1", CancellationToken.None);

        Assert.Equal(
            [
                new CampaignPresenceTransition(CampaignA, new PresenceTransition(Member, MemberPresence.NotConnected)),
                new CampaignPresenceTransition(CampaignB, new PresenceTransition(OtherMember, MemberPresence.NotConnected)),
            ],
            transitions.OrderBy(transition => transition.CampaignId));
        Assert.Empty(await _tracker.GetConnectedMembersAsync(CampaignA, CancellationToken.None));
    }

    [Fact]
    public async Task Given_a_member_with_another_open_connection_When_one_closes_Then_no_transition_is_returned()
    {
        await _tracker.OpenAsync(CampaignA, "connection-1", Member, CancellationToken.None);
        await _tracker.OpenAsync(CampaignA, "connection-2", Member, CancellationToken.None);

        Assert.Empty(await _tracker.CloseAsync("connection-1", CancellationToken.None));
    }

    [Fact]
    public async Task Given_an_unknown_connection_When_it_closes_Then_no_transition_is_returned()
    {
        Assert.Empty(await _tracker.CloseAsync("never-opened", CancellationToken.None));
    }

    [Fact]
    public async Task Given_many_concurrent_connections_When_they_open_and_close_Then_no_member_stays_connected()
    {
        var connections = Enumerable.Range(0, 200).Select(index => $"connection-{index}").ToList();

        await Task.WhenAll(connections.Select(connection =>
            Task.Run(() => _tracker.OpenAsync(CampaignA, connection, Member, CancellationToken.None))));
        await Task.WhenAll(connections.Select(connection =>
            Task.Run(() => _tracker.CloseAsync(connection, CancellationToken.None))));

        Assert.Empty(await _tracker.GetConnectedMembersAsync(CampaignA, CancellationToken.None));
    }
}
