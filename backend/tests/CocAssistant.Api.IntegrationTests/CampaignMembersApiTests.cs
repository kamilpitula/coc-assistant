namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// GET /api/campaigns/{campaignId}/members (specs/campaign-play/spec.md, Campaign members API; Scenario "Non-member
/// cannot read a Campaign's roster"; specs/campaign-overview/spec.md, Roster with Investigators and Scenario "Roster
/// API projects Investigators by caller"; Regression Guardrails: no Account ids, and no Investigator data beyond the
/// caller's visibility).
/// </summary>
public class CampaignMembersApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private readonly IdentityApiFactory _factory;

    public CampaignMembersApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Given_a_campaign_with_a_player_When_the_player_reads_the_members_Then_the_keeper_comes_first_and_the_player_is_marked()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "members-keeper-1")).Id;
        await JoinAsPlayerAsync(client, campaignId, "members-keeper-1", "members-player-1");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/members", "members-player-1"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var members = await response.Content.ReadFromJsonAsync<List<CampaignMemberResponse>>();
        Assert.NotNull(members);
        Assert.Equal(
            [
                (DisplayNameFor("members-keeper-1"), "Keeper", false),
                (DisplayNameFor("members-player-1"), "Player", true),
            ],
            members.Select(member => (member.DisplayName, member.Role, member.IsYou)));
        Assert.Equal(campaignId.ToString(), members[0].MemberId);
    }

    [Fact]
    public async Task Given_a_campaign_When_the_members_are_read_Then_each_entry_has_only_memberId_displayName_role_isYou_and_investigator()
    {
        var client = _factory.CreateClient();
        var campaign = await CreateCampaignAsync(client, "members-keeper-2");
        await JoinAsPlayerAsync(client, campaign.Id, "members-keeper-2", "members-player-2");

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaign.Id}/members", "members-player-2"));

        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        Assert.All(
            document.RootElement.EnumerateArray(),
            entry => Assert.Equal(
                ["displayName", "investigator", "isYou", "memberId", "role"],
                entry.EnumerateObject().Select(property => property.Name).Order()));
        Assert.DoesNotContain(campaign.KeeperAccountId.ToString(), body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Given_a_campaign_When_a_non_member_reads_the_members_Then_it_is_not_found()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "members-keeper-3")).Id;

        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/members", "members-stranger-3"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_an_unauthenticated_request_When_reading_the_members_Then_it_is_unauthorized()
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/campaigns/{Guid.NewGuid()}/members");
        request.Headers.Add("X-Test-Unauthenticated", "true");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private const string RosterKeeper = "roster-keeper";
    private const string DraftPlayer = "roster-a-draft";
    private const string SubmittedPlayer = "roster-b-submitted";
    private const string ApprovedPlayer = "roster-c-approved";

    /// <summary>A Campaign whose three Players have a named Draft, a Submitted, and an Approved Investigator.</summary>
    private async Task<(HttpClient Client, Guid CampaignId, Guid SubmittedId, Guid ApprovedId)> CreateRosterWithInvestigatorsAsync()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, RosterKeeper)).Id;
        foreach (var player in new[] { DraftPlayer, SubmittedPlayer, ApprovedPlayer })
        {
            await JoinAsPlayerAsync(client, campaignId, RosterKeeper, player);
        }

        await CreateNamedDraftAsync(client, campaignId, DraftPlayer, "Secret Draft");
        var submittedId = await CreateSubmittedAsync(client, campaignId, SubmittedPlayer, "Dr. Ames");
        var approvedId = await CreateApprovedAsync(client, campaignId, RosterKeeper, ApprovedPlayer, "Mae Doyle");
        return (client, campaignId, submittedId, approvedId);
    }

    private static async Task<(string Body, Dictionary<string, JsonElement> InvestigatorsByName)> ReadRosterAsync(
        HttpClient client,
        Guid campaignId,
        string callerOid)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/members", callerOid));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        var investigators = document.RootElement.EnumerateArray().ToDictionary(
            entry => entry.GetProperty("displayName").GetString()!,
            entry => entry.GetProperty("investigator").Clone());
        return (body, investigators);
    }

    private static string PropertiesOf(JsonElement investigator) =>
        string.Join(",", investigator.EnumerateObject().Select(property => $"{property.Name}={property.Value}"));

    // Scenario: Roster API projects Investigators by caller
    [Fact]
    public async Task Given_draft_submitted_and_approved_investigators_When_a_player_reads_the_members_Then_only_their_own_and_approved_ones_carry_a_name()
    {
        var (client, campaignId, submittedId, approvedId) = await CreateRosterWithInvestigatorsAsync();

        var (body, investigators) = await ReadRosterAsync(client, campaignId, DraftPlayer);

        Assert.Equal(JsonValueKind.Null, investigators[DisplayNameFor(RosterKeeper)].ValueKind);
        Assert.Equal("visibility=Visible,name=Secret Draft,status=Draft", PropertiesOf(investigators[DisplayNameFor(DraftPlayer)]));
        Assert.Equal("visibility=NotReady", PropertiesOf(investigators[DisplayNameFor(SubmittedPlayer)]));
        Assert.Equal("visibility=Visible,name=Mae Doyle,status=Approved", PropertiesOf(investigators[DisplayNameFor(ApprovedPlayer)]));
        Assert.DoesNotContain(submittedId.ToString(), body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(approvedId.ToString(), body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Dr. Ames", body);
    }

    // Regression Guardrail: the Keeper never sees a Draft Investigator's name.
    [Fact]
    public async Task Given_draft_submitted_and_approved_investigators_When_the_keeper_reads_the_members_Then_drafts_are_in_progress_and_others_carry_their_id()
    {
        var (client, campaignId, submittedId, approvedId) = await CreateRosterWithInvestigatorsAsync();

        var (body, investigators) = await ReadRosterAsync(client, campaignId, RosterKeeper);

        Assert.Equal("visibility=InProgress", PropertiesOf(investigators[DisplayNameFor(DraftPlayer)]));
        Assert.Equal(
            $"visibility=Visible,id={submittedId},name=Dr. Ames,status=Submitted",
            PropertiesOf(investigators[DisplayNameFor(SubmittedPlayer)]));
        Assert.Equal(
            $"visibility=Visible,id={approvedId},name=Mae Doyle,status=Approved",
            PropertiesOf(investigators[DisplayNameFor(ApprovedPlayer)]));
        Assert.DoesNotContain("Secret Draft", body);
    }
}
