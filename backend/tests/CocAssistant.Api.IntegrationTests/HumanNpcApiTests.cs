namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Human NPC API (specs/scenario-preparation/spec.md: create, read, replace, delete, derived values, Keeper-only).
/// A Player, another Campaign's Keeper, and ids from another Campaign all get an identical 404 (ADR 0013). A refused
/// write is a 400 whose keys are request paths and whose values are server-owned messages (ADR 0018).
/// </summary>
public class HumanNpcApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private const string ValidNotes =
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Cellar key\",\"format\":1,\"style\":\"\"}]}]}}";

    private const string ImageNotes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\",\"src\":\"https://example.com/a.png\"}]}}";

    private readonly IdentityApiFactory _factory;

    public HumanNpcApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private static string HumanNpcsUri(Guid campaignId, string suffix = "") => $"/api/campaigns/{campaignId}/human-npcs{suffix}";

    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static async Task<JsonElement> BodyAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();

    private static async Task<Guid> CreateHumanNpcAsync(HttpClient client, Guid campaignId, string oid, string name = "Mr. Knott", int age = 62)
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, HumanNpcsUri(campaignId), oid, new { name, age }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await BodyAsync(response)).GetProperty("id").GetGuid();
    }

    private static object ThugRequest(object? skills = null, object? combat = null, JsonElement? keeperNotes = null) => new
    {
        name = "Thug",
        age = 30,
        details = new { professionOrRole = "Enforcer", goal = "Collect the debt" },
        keeperNotes,
        characteristics = new Dictionary<string, int?> { ["STR"] = 70, ["CON"] = 60, ["SIZ"] = 65, ["DEX"] = 55, ["POW"] = 50 },
        skills,
        combat,
        spells = (object?)null,
    };

    // Keys of a 400 problem, with their messages, in a stable order.
    private static async Task<IReadOnlyDictionary<string, string[]>> ProblemsAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = (await BodyAsync(response)).GetProperty("errors");
        return errors.EnumerateObject().ToDictionary(
            property => property.Name,
            property => property.Value.EnumerateArray().Select(message => message.GetString()!).ToArray());
    }

    [Fact]
    public async Task Given_a_keeper_When_creating_a_human_npc_Then_it_is_201_narrative_only_and_can_be_read_back()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-1")).Id;

        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, HumanNpcsUri(campaignId), "npc-keeper-1", new { name = "  Mr. Knott ", age = 62 }));
        var created = await BodyAsync(response);
        var get = await client.SendAsync(BuildRequest(HttpMethod.Get, HumanNpcsUri(campaignId, $"/{created.GetProperty("id").GetGuid()}"), "npc-keeper-1"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(("Mr. Knott", 62), (created.GetProperty("name").GetString(), created.GetProperty("age").GetInt32()));
        Assert.Equal(JsonValueKind.Null, created.GetProperty("characteristics").ValueKind);
        Assert.Equal(JsonValueKind.Null, created.GetProperty("skills").ValueKind);
        Assert.Equal(JsonValueKind.Null, created.GetProperty("combat").ValueKind);
        Assert.Equal(JsonValueKind.Null, created.GetProperty("spells").ValueKind);
        Assert.Equal(JsonValueKind.Null, created.GetProperty("keeperNotes").ValueKind);
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        Assert.Equal(created.GetRawText(), (await BodyAsync(get)).GetRawText());
    }

    [Fact]
    public async Task Given_no_name_and_no_age_When_creating_Then_it_is_400_keyed_by_path_with_server_messages_and_nothing_is_stored()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-2")).Id;

        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, HumanNpcsUri(campaignId), "npc-keeper-2", new { }));

        var problems = await ProblemsAsync(response);
        Assert.Equal(["Enter a name."], problems["name"]);
        Assert.Equal(["Enter an age."], problems["age"]);
        var list = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/non-player-entities", "npc-keeper-2"));
        Assert.Empty((await BodyAsync(list)).GetProperty("items").EnumerateArray());
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(151)]
    public async Task Given_an_age_outside_0_to_150_When_creating_Then_it_is_400_on_age(int age)
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-3")).Id;

        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, HumanNpcsUri(campaignId), "npc-keeper-3", new { name = "Old", age }));

        Assert.Equal(["Enter an age from 0 to 150, in whole years."], (await ProblemsAsync(response))["age"]);
    }

    [Fact]
    public async Task Given_a_full_profile_When_replacing_Then_the_response_carries_derived_values_and_difficulty_and_get_matches()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-4")).Id;
        var id = await CreateHumanNpcAsync(client, campaignId, "npc-keeper-4", "Thug", 30);
        var body = ThugRequest(
            skills: new[] { new { name = "Spot Hidden", specialization = (string?)null, value = 55 }, new { name = "Firearms", specialization = (string?)"Handgun", value = 90 } },
            combat: new
            {
                dodge = 27,
                armorPoints = 1,
                tacticsAndMorale = "Flees at half Hit Points",
                weapons = new[]
                {
                    new { name = "Revolver", skill = new { name = "Firearms", specialization = (string?)"Handgun" }, damage = "1D10", attacksPerRound = 1, range = "15 yards", ammunition = "6", malfunction = "100", impaling = true },
                },
            },
            keeperNotes: Json(ValidNotes));

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, HumanNpcsUri(campaignId, $"/{id}"), "npc-keeper-4", body));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var human = await BodyAsync(response);
        var characteristics = human.GetProperty("characteristics");
        var derived = characteristics.GetProperty("derived");
        Assert.Equal(
            (12, 10, "+1D4", 1, 8, false),
            (derived.GetProperty("hitPoints").GetInt32(), derived.GetProperty("magicPoints").GetInt32(), derived.GetProperty("damageBonus").GetString(), derived.GetProperty("build").GetInt32(), derived.GetProperty("movementRate").GetInt32(), derived.GetProperty("movementRateNotCovered").GetBoolean()));
        Assert.Equal(70, characteristics.GetProperty("values").GetProperty("STR").GetInt32());
        Assert.Equal(JsonValueKind.Null, characteristics.GetProperty("values").GetProperty("APP").ValueKind);
        Assert.Equal("Hard", characteristics.GetProperty("difficulty").GetProperty("STR").GetString());
        Assert.False(characteristics.GetProperty("difficulty").TryGetProperty("APP", out _));
        var skills = human.GetProperty("skills").EnumerateArray().ToList();
        Assert.Equal(("Hard", "Extreme"), (skills[0].GetProperty("difficulty").GetString(), skills[1].GetProperty("difficulty").GetString()));
        Assert.Equal("Regular", human.GetProperty("combat").GetProperty("dodgeDifficulty").GetString());
        Assert.Equal("Collect the debt", human.GetProperty("details").GetProperty("goal").GetString());
        Assert.Equal(JsonValueKind.Object, human.GetProperty("keeperNotes").ValueKind);
        Assert.False(human.TryGetProperty("derivedValues", out _));
        var get = await client.SendAsync(BuildRequest(HttpMethod.Get, HumanNpcsUri(campaignId, $"/{id}"), "npc-keeper-4"));
        Assert.Equal(human.GetRawText(), (await BodyAsync(get)).GetRawText());
    }

    [Fact]
    public async Task Given_an_age_outside_the_covered_range_When_replacing_Then_movement_is_flagged_as_not_covered()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-5")).Id;
        var id = await CreateHumanNpcAsync(client, campaignId, "npc-keeper-5", "Old Whateley", 95);
        var body = new
        {
            name = "Old Whateley",
            age = 95,
            characteristics = new Dictionary<string, int?> { ["STR"] = 40, ["DEX"] = 40, ["SIZ"] = 60 },
        };

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, HumanNpcsUri(campaignId, $"/{id}"), "npc-keeper-5", body));

        var derived = (await BodyAsync(response)).GetProperty("characteristics").GetProperty("derived");
        Assert.Equal(JsonValueKind.Null, derived.GetProperty("movementRate").ValueKind);
        Assert.True(derived.GetProperty("movementRateNotCovered").GetBoolean());
    }

    [Fact]
    public async Task Given_a_firearm_with_damage_bonus_When_replacing_Then_it_is_400_on_the_weapon_damage_and_the_profile_is_unchanged()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-6")).Id;
        var id = await CreateHumanNpcAsync(client, campaignId, "npc-keeper-6", "Gangster", 40);
        var body = ThugRequest(
            skills: new[] { new { name = "Firearms", specialization = (string?)"Handgun", value = 60 } },
            combat: new
            {
                dodge = (int?)null,
                armorPoints = (int?)null,
                tacticsAndMorale = (string?)null,
                weapons = new[] { new { name = "Revolver", skill = new { name = "Firearms", specialization = (string?)"Handgun" }, damage = "1D10+DB", attacksPerRound = 1, range = (string?)null, ammunition = (string?)null, malfunction = (string?)null, impaling = false } },
            });

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, HumanNpcsUri(campaignId, $"/{id}"), "npc-keeper-6", body));

        var problems = await ProblemsAsync(response);
        Assert.Equal(["combat.weapons[0].damage"], problems.Keys);
        Assert.Equal(["Damage Bonus doesn't apply to firearms. Remove DB from the damage."], problems["combat.weapons[0].damage"]);
        var stored = await BodyAsync(await client.SendAsync(BuildRequest(HttpMethod.Get, HumanNpcsUri(campaignId, $"/{id}"), "npc-keeper-6")));
        Assert.Equal(("Gangster", 40, JsonValueKind.Null), (stored.GetProperty("name").GetString(), stored.GetProperty("age").GetInt32(), stored.GetProperty("skills").ValueKind));
    }

    [Fact]
    public async Task Given_many_refused_values_When_replacing_Then_every_problem_is_listed_under_its_exact_path_with_its_message()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-7")).Id;
        var id = await CreateHumanNpcAsync(client, campaignId, "npc-keeper-7");
        var body = new
        {
            name = " ",
            age = 151,
            details = new { goal = new string('x', 4001), knowledge = new string('x', 4001) },
            keeperNotes = Json(ImageNotes),
            characteristics = new Dictionary<string, int?> { ["STR"] = 101, ["LUCK"] = 50 },
            skills = new object[]
            {
                new { name = "Spot Hidden", specialization = (string?)null, value = 55 },
                new { name = "Fighting", specialization = (string?)"Laser", value = 40 },
                new { name = "", specialization = (string?)null, value = (int?)null },
                new { name = new string('s', 1001), specialization = (string?)null, value = 10 },
            },
            combat = new
            {
                dodge = 101,
                armorPoints = 2001,
                tacticsAndMorale = (string?)null,
                weapons = new[]
                {
                    new { name = "", skill = new { name = "Spot Hidden", specialization = (string?)null }, damage = "D", attacksPerRound = 0, range = (string?)null, ammunition = (string?)null, malfunction = (string?)null, impaling = false },
                    new { name = "Pistol", skill = new { name = "Firearms", specialization = (string?)"Handgun" }, damage = (string?)null, attacksPerRound = 100, range = (string?)null, ammunition = (string?)null, malfunction = (string?)null, impaling = false },
                },
            },
            spells = new[] { new { name = "", magicPointCost = (string?)null, effect = (string?)null } },
        };

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, HumanNpcsUri(campaignId, $"/{id}"), "npc-keeper-7", body));

        var problems = await ProblemsAsync(response);
        Assert.Equal(
            [
                "age",
                "characteristics.LUCK",
                "characteristics.STR",
                "combat.armorPoints",
                "combat.dodge",
                "combat.weapons[0].attacksPerRound",
                "combat.weapons[0].damage",
                "combat.weapons[0].name",
                "combat.weapons[1].attacksPerRound",
                "combat.weapons[1].damage",
                "combat.weapons[1].skill",
                "details.goal",
                "details.knowledge",
                "keeperNotes",
                "name",
                "skills[1].specialization",
                "skills[2].name",
                "skills[2].value",
                "skills[3].name",
                "spells[0].name",
            ],
            problems.Keys.OrderBy(key => key, StringComparer.Ordinal));
        Assert.Equal(["Enter an age from 0 to 150, in whole years."], problems["age"]);
        Assert.Equal(["LUCK isn't a characteristic."], problems["characteristics.LUCK"]);
        Assert.Equal(["Enter STR from 0 to 100."], problems["characteristics.STR"]);
        Assert.Equal(["Enter armor points from 0 to 2,000."], problems["combat.armorPoints"]);
        Assert.Equal(["Enter Dodge from 0 to 100."], problems["combat.dodge"]);
        Assert.Equal(["Enter attacks per round from 1 to 99."], problems["combat.weapons[0].attacksPerRound"]);
        Assert.Equal(["Write the damage as dice and numbers, for example 1D6+DB or 2D6-1."], problems["combat.weapons[0].damage"]);
        Assert.Equal(["Enter the weapon's name."], problems["combat.weapons[0].name"]);
        Assert.Equal(["Enter the damage."], problems["combat.weapons[1].damage"]);
        Assert.Equal(["Choose a skill this Human NPC has."], problems["combat.weapons[1].skill"]);
        Assert.Equal(["Goal must be 4,000 characters or fewer."], problems["details.goal"]);
        Assert.Equal(["What the Human NPC knows must be 4,000 characters or fewer."], problems["details.knowledge"]);
        Assert.Equal(["Enter a name."], problems["name"]);
        Assert.Equal(["Choose a Fighting specialization from the list."], problems["skills[1].specialization"]);
        Assert.Equal(["Enter the skill's name."], problems["skills[2].name"]);
        Assert.Equal(["Enter a value from 0 to 100."], problems["skills[2].value"]);
        Assert.Equal(["Skill name must be 1,000 characters or fewer."], problems["skills[3].name"]);
        Assert.Equal(["Enter the spell's name."], problems["spells[0].name"]);
        Assert.Contains("rich-text", problems["keeperNotes"][0]);
    }

    [Fact]
    public async Task Given_more_than_100_skills_When_replacing_Then_the_list_is_reported_under_skills()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-8")).Id;
        var id = await CreateHumanNpcAsync(client, campaignId, "npc-keeper-8");
        var skills = Enumerable.Range(0, 101).Select(index => new { name = $"Skill {index}", specialization = (string?)null, value = 10 }).ToArray();

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, HumanNpcsUri(campaignId, $"/{id}"), "npc-keeper-8", new { name = "Many", age = 30, skills }));

        Assert.Equal(["Add at most 100 skills."], (await ProblemsAsync(response))["skills"]);
    }

    [Fact]
    public async Task Given_sections_removed_in_a_later_replace_When_reading_Then_the_sections_are_gone()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-9")).Id;
        var id = await CreateHumanNpcAsync(client, campaignId, "npc-keeper-9");
        await client.SendAsync(BuildRequest(HttpMethod.Put, HumanNpcsUri(campaignId, $"/{id}"), "npc-keeper-9", ThugRequest(skills: Array.Empty<object>())));

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, HumanNpcsUri(campaignId, $"/{id}"), "npc-keeper-9", new { name = "Mr. Knott", age = 62 }));

        var human = await BodyAsync(response);
        Assert.Equal(JsonValueKind.Null, human.GetProperty("characteristics").ValueKind);
        Assert.Equal(JsonValueKind.Null, human.GetProperty("skills").ValueKind);
    }

    [Fact]
    public async Task Given_a_keeper_When_deleting_Then_it_is_204_and_the_human_npc_is_gone()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-10")).Id;
        var id = await CreateHumanNpcAsync(client, campaignId, "npc-keeper-10");

        var delete = await client.SendAsync(BuildRequest(HttpMethod.Delete, HumanNpcsUri(campaignId, $"/{id}"), "npc-keeper-10"));
        var get = await client.SendAsync(BuildRequest(HttpMethod.Get, HumanNpcsUri(campaignId, $"/{id}"), "npc-keeper-10"));
        var again = await client.SendAsync(BuildRequest(HttpMethod.Delete, HumanNpcsUri(campaignId, $"/{id}"), "npc-keeper-10"));

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, again.StatusCode);
    }

    [Fact]
    public async Task Given_a_player_or_another_keeper_When_using_any_endpoint_Then_every_answer_is_the_same_404_and_nothing_changes()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-11")).Id;
        await JoinAsPlayerAsync(client, campaignId, "npc-keeper-11", "npc-player-11");
        var otherCampaignId = (await CreateCampaignAsync(client, "npc-other-keeper-11")).Id;
        var id = await CreateHumanNpcAsync(client, campaignId, "npc-keeper-11");
        var otherId = await CreateHumanNpcAsync(client, otherCampaignId, "npc-other-keeper-11", "Elsewhere");
        var missing = Guid.NewGuid();

        var bodies = new List<string>();
        foreach (var oid in new[] { "npc-player-11", "npc-other-keeper-11" })
        {
            foreach (var humanNpcId in new[] { id, missing })
            {
                HttpRequestMessage[] calls =
                [
                    BuildRequest(HttpMethod.Get, HumanNpcsUri(campaignId, $"/{humanNpcId}"), oid),
                    BuildRequest(HttpMethod.Put, HumanNpcsUri(campaignId, $"/{humanNpcId}"), oid, new { name = "Hacked", age = 1 }),
                    BuildRequest(HttpMethod.Delete, HumanNpcsUri(campaignId, $"/{humanNpcId}"), oid),
                    BuildRequest(HttpMethod.Post, HumanNpcsUri(campaignId, $"/{humanNpcId}/duplicate"), oid),
                ];
                foreach (var call in calls)
                {
                    var response = await client.SendAsync(call);
                    Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
                    bodies.Add(await response.Content.ReadAsStringAsync());
                }
            }

            var create = await client.SendAsync(BuildRequest(HttpMethod.Post, HumanNpcsUri(campaignId), oid, new { name = "Intruder", age = 30 }));
            var invalidCreate = await client.SendAsync(BuildRequest(HttpMethod.Post, HumanNpcsUri(campaignId), oid, new { }));
            var list = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/non-player-entities", oid));
            Assert.Equal(
                [HttpStatusCode.NotFound, HttpStatusCode.NotFound, HttpStatusCode.NotFound],
                [create.StatusCode, invalidCreate.StatusCode, list.StatusCode]);
        }

        Assert.Single(bodies.Select(WithoutTraceId).Distinct());
        var untouched = await BodyAsync(await client.SendAsync(BuildRequest(HttpMethod.Get, HumanNpcsUri(campaignId, $"/{id}"), "npc-keeper-11")));
        Assert.Equal(("Mr. Knott", 62), (untouched.GetProperty("name").GetString(), untouched.GetProperty("age").GetInt32()));
        var items = (await BodyAsync(await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/non-player-entities", "npc-keeper-11")))).GetProperty("items");
        Assert.Single(items.EnumerateArray());
        Assert.NotEqual(Guid.Empty, otherId);
    }

    [Fact]
    public async Task Given_a_human_npc_of_another_campaign_When_the_keeper_uses_its_id_under_their_own_campaign_Then_it_is_404()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-12")).Id;
        var otherCampaignId = (await CreateCampaignAsync(client, "npc-keeper-12")).Id;
        var otherId = await CreateHumanNpcAsync(client, otherCampaignId, "npc-keeper-12", "Elsewhere");

        var get = await client.SendAsync(BuildRequest(HttpMethod.Get, HumanNpcsUri(campaignId, $"/{otherId}"), "npc-keeper-12"));
        var put = await client.SendAsync(BuildRequest(HttpMethod.Put, HumanNpcsUri(campaignId, $"/{otherId}"), "npc-keeper-12", new { name = "Hijacked", age = 1 }));
        var delete = await client.SendAsync(BuildRequest(HttpMethod.Delete, HumanNpcsUri(campaignId, $"/{otherId}"), "npc-keeper-12"));
        var duplicate = await client.SendAsync(BuildRequest(HttpMethod.Post, HumanNpcsUri(campaignId, $"/{otherId}/duplicate"), "npc-keeper-12"));

        Assert.Equal(
            [HttpStatusCode.NotFound, HttpStatusCode.NotFound, HttpStatusCode.NotFound, HttpStatusCode.NotFound],
            [get.StatusCode, put.StatusCode, delete.StatusCode, duplicate.StatusCode]);
        var untouched = await BodyAsync(await client.SendAsync(BuildRequest(HttpMethod.Get, HumanNpcsUri(otherCampaignId, $"/{otherId}"), "npc-keeper-12")));
        Assert.Equal("Elsewhere", untouched.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Given_a_human_npc_with_a_full_profile_When_the_keeper_duplicates_it_Then_it_is_201_with_a_new_id_a_copy_name_and_the_same_profile()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-20")).Id;
        var id = await CreateHumanNpcAsync(client, campaignId, "npc-keeper-20", "Mr. Knott", 62);
        var put = await client.SendAsync(BuildRequest(HttpMethod.Put, HumanNpcsUri(campaignId, $"/{id}"), "npc-keeper-20", ThugRequest(keeperNotes: Json(ValidNotes))));
        var source = await BodyAsync(put);

        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, HumanNpcsUri(campaignId, $"/{id}/duplicate"), "npc-keeper-20"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var copy = await BodyAsync(response);
        Assert.NotEqual(id, copy.GetProperty("id").GetGuid());
        Assert.Equal("Thug (copy)", copy.GetProperty("name").GetString());
        foreach (var section in new[] { "age", "details", "characteristics", "keeperNotes" })
        {
            Assert.Equal(source.GetProperty(section).GetRawText(), copy.GetProperty(section).GetRawText());
        }

        var sourceAfter = await BodyAsync(await client.SendAsync(BuildRequest(HttpMethod.Get, HumanNpcsUri(campaignId, $"/{id}"), "npc-keeper-20")));
        Assert.Equal(source.GetRawText(), sourceAfter.GetRawText());
        var items = (await BodyAsync(await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/non-player-entities", "npc-keeper-20")))).GetProperty("items");
        Assert.Equal(["Thug", "Thug (copy)"], items.EnumerateArray().Select(item => item.GetProperty("name").GetString()).Order());
    }

    [Fact]
    public async Task Given_a_human_npc_named_with_200_characters_When_duplicating_Then_the_copy_name_is_200_characters_ending_in_copy()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-21")).Id;
        var id = await CreateHumanNpcAsync(client, campaignId, "npc-keeper-21", new string('n', 200), 40);

        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, HumanNpcsUri(campaignId, $"/{id}/duplicate"), "npc-keeper-21"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var name = (await BodyAsync(response)).GetProperty("name").GetString()!;
        Assert.Equal(200, name.Length);
        Assert.EndsWith(" (copy)", name);
    }

    [Fact]
    public async Task Given_a_mythos_creature_id_on_the_human_npc_duplicate_route_When_the_keeper_uses_it_Then_it_is_404_and_nothing_is_added()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-22")).Id;
        var creature = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/mythos-creatures", "npc-keeper-22", new { name = "Ghoul" }));
        var creatureId = (await BodyAsync(creature)).GetProperty("id").GetGuid();

        var duplicate = await client.SendAsync(BuildRequest(HttpMethod.Post, HumanNpcsUri(campaignId, $"/{creatureId}/duplicate"), "npc-keeper-22"));

        Assert.Equal(HttpStatusCode.NotFound, duplicate.StatusCode);
        var list = await BodyAsync(await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/non-player-entities", "npc-keeper-22")));
        Assert.Single(list.GetProperty("items").EnumerateArray());
    }

    [Fact]
    public async Task Given_a_missing_id_When_the_keeper_duplicates_a_human_npc_Then_it_is_404()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "npc-keeper-23")).Id;

        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, HumanNpcsUri(campaignId, $"/{Guid.NewGuid()}/duplicate"), "npc-keeper-23"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_an_unauthenticated_request_When_using_the_human_npc_endpoints_Then_it_is_unauthorized()
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, HumanNpcsUri(Guid.NewGuid(), $"/{Guid.NewGuid()}"));
        request.Headers.Add("X-Test-Unauthenticated", "true");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // Problem details carry a per-request traceId; everything else must match.
    private static string WithoutTraceId(string body) =>
        System.Text.RegularExpressions.Regex.Replace(body, "\"traceId\":\"[^\"]*\"", string.Empty);
}
