namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Presence counting per Campaign member (specs/campaign-play/spec.md, Live connection contract, Presence tracking;
/// ADR 0010): the first connection makes a member Connected, the last close makes them Not connected.
/// </summary>
public class CampaignPresenceTests
{
    private static readonly Guid Keeper = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid Player = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000002");

    [Fact]
    public void Given_a_member_without_connections_When_a_connection_opens_Then_the_member_becomes_connected()
    {
        var presence = new CampaignPresence();

        var transition = presence.Open("connection-1", Player);

        Assert.Equal(new PresenceTransition(Player, MemberPresence.Connected), transition);
        Assert.Equal([Player], presence.ConnectedMembers);
    }

    [Fact]
    public void Given_a_connected_member_When_a_second_connection_opens_Then_no_transition_happens()
    {
        var presence = new CampaignPresence();
        presence.Open("connection-1", Player);

        Assert.Null(presence.Open("connection-2", Player));
    }

    [Fact]
    public void Given_an_open_connection_When_it_opens_again_Then_it_is_counted_once()
    {
        var presence = new CampaignPresence();
        presence.Open("connection-1", Player);
        presence.Open("connection-1", Player);

        var transition = presence.Close("connection-1");

        Assert.Equal(new PresenceTransition(Player, MemberPresence.NotConnected), transition);
    }

    [Fact]
    public void Given_a_member_with_two_connections_When_one_closes_Then_the_member_stays_connected()
    {
        var presence = new CampaignPresence();
        presence.Open("connection-1", Player);
        presence.Open("connection-2", Player);

        Assert.Null(presence.Close("connection-1"));
        Assert.Equal([Player], presence.ConnectedMembers);
    }

    [Fact]
    public void Given_a_member_with_one_connection_When_it_closes_Then_the_member_is_not_connected()
    {
        var presence = new CampaignPresence();
        presence.Open("connection-1", Keeper);
        presence.Open("connection-2", Player);

        var transition = presence.Close("connection-2");

        Assert.Equal(new PresenceTransition(Player, MemberPresence.NotConnected), transition);
        Assert.Equal([Keeper], presence.ConnectedMembers);
    }

    [Fact]
    public void Given_an_unknown_connection_When_it_closes_Then_nothing_happens()
    {
        var presence = new CampaignPresence();

        Assert.Null(presence.Close("never-opened"));
        Assert.True(presence.IsEmpty);
    }
}
