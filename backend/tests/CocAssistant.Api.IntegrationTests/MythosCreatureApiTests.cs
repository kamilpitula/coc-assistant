namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Mythos Creature API (specs/scenario-preparation/spec.md: create, read, replace, delete, derived values and
/// overrides, Keeper-only). A Player, another Campaign's Keeper, ids from another Campaign, and Human NPC ids all get an
/// identical 404 (ADR 0013). A refused write is a 400 whose keys are request paths and whose values are server-owned
/// messages (ADR 0018).
/// </summary>
public class MythosCreatureApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private const string ValidNotes =
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Lair under the church\",\"format\":1,\"style\":\"\"}]}]}}";

    private const string ImageNotes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\",\"src\":\"https://example.com/a.png\"}]}}";

    private readonly IdentityApiFactory _factory;

    public MythosCreatureApiTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private static string CreaturesUri(Guid campaignId, string suffix = "") => $"/api/campaigns/{campaignId}/mythos-creatures{suffix}";

    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static async Task<JsonElement> BodyAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();

    private static async Task<Guid> CreateCreatureAsync(HttpClient client, Guid campaignId, string oid, string name = "Ghoul")
    {
        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, CreaturesUri(campaignId), oid, new { name }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await BodyAsync(response)).GetProperty("id").GetGuid();
    }

    private static object GhoulRequest(
        object? characteristics = null,
        object? combat = null,
        object? sanityLoss = null,
        object? details = null,
        JsonElement? keeperNotes = null) => new
        {
            name = "Ghoul",
            details = details ?? new { creatureKind = "mythos", defeatOutcome = "Flees into the tunnels" },
            keeperNotes,
            characteristics = characteristics ?? new
            {
                values = new Dictionary<string, int?> { ["STR"] = 80, ["CON"] = 60, ["SIZ"] = 60, ["DEX"] = 60, ["INT"] = 60, ["POW"] = 60 },
                hitPointsNotApplicable = false,
                overrides = (object?)null,
            },
            combat,
            sanityLoss,
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
    public async Task Given_a_keeper_When_creating_a_mythos_creature_Then_it_is_201_with_an_empty_profile_and_can_be_read_back()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "myth-keeper-1")).Id;

        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, CreaturesUri(campaignId), "myth-keeper-1", new { name = "  Ghoul " }));
        var created = await BodyAsync(response);
        var get = await client.SendAsync(BuildRequest(HttpMethod.Get, CreaturesUri(campaignId, $"/{created.GetProperty("id").GetGuid()}"), "myth-keeper-1"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("Ghoul", created.GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, created.GetProperty("details").GetProperty("creatureKind").ValueKind);
        foreach (var section in new[] { "keeperNotes", "characteristics", "movement", "combat", "defenses", "skills", "spells", "powers", "sanityLoss" })
        {
            Assert.Equal(JsonValueKind.Null, created.GetProperty(section).ValueKind);
        }

        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        Assert.Equal(created.GetRawText(), (await BodyAsync(get)).GetRawText());
    }

    [Fact]
    public async Task Given_no_name_When_creating_Then_it_is_400_keyed_by_name_with_the_server_message_and_nothing_is_stored()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "myth-keeper-2")).Id;

        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, CreaturesUri(campaignId), "myth-keeper-2", new { }));

        Assert.Equal(["Enter a name."], (await ProblemsAsync(response))["name"]);
        var list = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/non-player-entities", "myth-keeper-2"));
        Assert.Empty((await BodyAsync(list)).GetProperty("items").EnumerateArray());
    }

    [Fact]
    public async Task Given_a_name_of_201_characters_When_creating_Then_it_is_400_on_name()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "myth-keeper-3")).Id;

        var response = await client.SendAsync(BuildRequest(HttpMethod.Post, CreaturesUri(campaignId), "myth-keeper-3", new { name = new string('x', 201) }));

        Assert.Equal(["Name must be 200 characters or fewer."], (await ProblemsAsync(response))["name"]);
    }

    [Fact]
    public async Task Given_the_Ghoul_profile_When_replacing_Then_the_response_carries_derived_values_difficulty_and_get_matches()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "myth-keeper-4")).Id;
        var id = await CreateCreatureAsync(client, campaignId, "myth-keeper-4");
        var body = new
        {
            name = "Ghoul",
            details = new { creatureKind = "MYTHOS", origin = "  Crypts " },
            keeperNotes = Json(ValidNotes),
            characteristics = new
            {
                values = new Dictionary<string, int?> { ["STR"] = 80, ["CON"] = 60, ["SIZ"] = 60, ["DEX"] = 60, ["INT"] = 60, ["POW"] = 95 },
                hitPointsNotApplicable = false,
                overrides = new { hitPoints = new { value = 40, reason = "Swollen with stolen life" } },
            },
            movement = new[] { new { mode = "walk", label = (string?)null, rate = 8 }, new { mode = "Other", label = "Phasing", rate = 10 } },
            combat = new
            {
                attacksPerRound = 3,
                dodge = 90,
                attacks = new[] { new { name = "Claw", skill = "Fighting", skillValue = 40, damage = "1D6+DB", effect = (string?)null, manoeuvre = false } },
            },
            defenses = new
            {
                armorPoints = 0,
                armorNote = (string?)null,
                immunities = new[] { new { description = "Ordinary bullets inflict no damage." } },
                vulnerabilities = Array.Empty<object>(),
            },
            skills = new[] { new { name = "Stealth", value = 55 } },
            spells = new[] { new { name = "Contact Deity", magicPointCost = "5", effect = (string?)null } },
            powers = new[] { new { name = "Drain", magicPointCost = (string?)null, effect = (string?)null, limits = "Once per day" } },
            sanityLoss = new { value = "0/1D6" },
        };

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, CreaturesUri(campaignId, $"/{id}"), "myth-keeper-4", body));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var creature = await BodyAsync(response);
        Assert.Equal(("Mythos", "Crypts"), (creature.GetProperty("details").GetProperty("creatureKind").GetString(), creature.GetProperty("details").GetProperty("origin").GetString()));
        var characteristics = creature.GetProperty("characteristics");
        var derived = characteristics.GetProperty("derived");
        Assert.Equal(
            (12, 19, "+1D4", 1),
            (derived.GetProperty("hitPoints").GetInt32(), derived.GetProperty("magicPoints").GetInt32(), derived.GetProperty("damageBonus").GetString(), derived.GetProperty("build").GetInt32()));
        Assert.False(derived.TryGetProperty("movementRate", out _));
        Assert.Equal(40, characteristics.GetProperty("overrides").GetProperty("hitPoints").GetProperty("value").GetInt32());
        Assert.Equal("Swollen with stolen life", characteristics.GetProperty("overrides").GetProperty("hitPoints").GetProperty("reason").GetString());
        Assert.Equal(80, characteristics.GetProperty("values").GetProperty("STR").GetInt32());
        Assert.Equal(JsonValueKind.Null, characteristics.GetProperty("values").GetProperty("APP").ValueKind);
        Assert.Equal(["STR", "CON", "SIZ", "DEX", "INT", "POW", "APP", "EDU"], characteristics.GetProperty("values").EnumerateObject().Select(property => property.Name));
        Assert.Equal(("Hard", "Extreme"), (characteristics.GetProperty("difficulty").GetProperty("STR").GetString(), characteristics.GetProperty("difficulty").GetProperty("POW").GetString()));
        Assert.False(characteristics.GetProperty("difficulty").TryGetProperty("APP", out _));
        var combat = creature.GetProperty("combat");
        Assert.Equal(("Extreme", "Regular"), (combat.GetProperty("dodgeDifficulty").GetString(), combat.GetProperty("attacks")[0].GetProperty("difficulty").GetString()));
        Assert.Equal("Hard", creature.GetProperty("skills")[0].GetProperty("difficulty").GetString());
        Assert.Equal(["Walk", "Other"], creature.GetProperty("movement").EnumerateArray().Select(mode => mode.GetProperty("mode").GetString()));
        Assert.Equal("0/1D6", creature.GetProperty("sanityLoss").GetProperty("value").GetString());
        Assert.Equal("Once per day", creature.GetProperty("powers")[0].GetProperty("limits").GetString());
        Assert.Equal(JsonValueKind.Object, creature.GetProperty("keeperNotes").ValueKind);
        var get = await client.SendAsync(BuildRequest(HttpMethod.Get, CreaturesUri(campaignId, $"/{id}"), "myth-keeper-4"));
        Assert.Equal(creature.GetRawText(), (await BodyAsync(get)).GetRawText());
    }

    [Fact]
    public async Task Given_Hit_Points_not_applicable_with_a_defeat_outcome_When_replacing_Then_it_is_saved_and_Hit_Points_are_still_computed()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "myth-keeper-5")).Id;
        var id = await CreateCreatureAsync(client, campaignId, "myth-keeper-5");
        var characteristics = new
        {
            values = new Dictionary<string, int?> { ["CON"] = 60, ["SIZ"] = 60 },
            hitPointsNotApplicable = true,
            overrides = (object?)null,
        };

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, CreaturesUri(campaignId, $"/{id}"), "myth-keeper-5", GhoulRequest(characteristics: characteristics)));

        var saved = (await BodyAsync(response)).GetProperty("characteristics");
        Assert.True(saved.GetProperty("hitPointsNotApplicable").GetBoolean());
        Assert.Equal(12, saved.GetProperty("derived").GetProperty("hitPoints").GetInt32());
    }

    [Fact]
    public async Task Given_a_Hit_Points_override_without_a_reason_When_replacing_Then_it_is_400_on_the_reason_and_nothing_changes()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "myth-keeper-6")).Id;
        var id = await CreateCreatureAsync(client, campaignId, "myth-keeper-6");
        var characteristics = new
        {
            values = new Dictionary<string, int?> { ["CON"] = 60, ["SIZ"] = 60 },
            hitPointsNotApplicable = false,
            overrides = new { hitPoints = new { value = 25, reason = (string?)null } },
        };

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, CreaturesUri(campaignId, $"/{id}"), "myth-keeper-6", GhoulRequest(characteristics: characteristics)));

        var problems = await ProblemsAsync(response);
        Assert.Equal(["characteristics.overrides.hitPoints.reason"], problems.Keys);
        Assert.Equal(["Give a reason for the override."], problems["characteristics.overrides.hitPoints.reason"]);
        var stored = await BodyAsync(await client.SendAsync(BuildRequest(HttpMethod.Get, CreaturesUri(campaignId, $"/{id}"), "myth-keeper-6")));
        Assert.Equal(JsonValueKind.Null, stored.GetProperty("characteristics").ValueKind);
    }

    [Fact]
    public async Task Given_Hit_Points_not_applicable_without_a_defeat_outcome_When_replacing_Then_it_is_400_on_the_defeat_outcome()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "myth-keeper-7")).Id;
        var id = await CreateCreatureAsync(client, campaignId, "myth-keeper-7");
        var characteristics = new { values = new Dictionary<string, int?>(), hitPointsNotApplicable = true, overrides = (object?)null };

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, CreaturesUri(campaignId, $"/{id}"), "myth-keeper-7", GhoulRequest(characteristics: characteristics, details: new { creatureKind = "Mythos" })));

        var problems = await ProblemsAsync(response);
        Assert.Equal(["Describe the defeat outcome, because Hit Points don't apply."], problems["details.defeatOutcome"]);
    }

    [Fact]
    public async Task Given_a_firearm_attack_with_damage_bonus_and_malformed_sanity_loss_When_replacing_Then_both_are_400_on_their_paths()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "myth-keeper-8")).Id;
        var id = await CreateCreatureAsync(client, campaignId, "myth-keeper-8");
        var combat = new
        {
            attacksPerRound = 1,
            dodge = (int?)null,
            attacks = new[] { new { name = "Rifle", skill = "Firearms (Rifle)", skillValue = 50, damage = "2D6+DB", effect = (string?)null, manoeuvre = false } },
        };

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, CreaturesUri(campaignId, $"/{id}"), "myth-keeper-8", GhoulRequest(combat: combat, sanityLoss: new { value = "1D6" })));

        var problems = await ProblemsAsync(response);
        Assert.Equal(["combat.attacks[0].damage", "sanityLoss.value"], problems.Keys.OrderBy(key => key, StringComparer.Ordinal));
        Assert.Equal(["Damage Bonus doesn't apply to firearms. Remove DB from the damage."], problems["combat.attacks[0].damage"]);
        Assert.Equal(["Write the Sanity loss as success/failure, for example 0/1D6."], problems["sanityLoss.value"]);
    }

    [Fact]
    public async Task Given_many_refused_values_When_replacing_Then_every_problem_is_listed_under_its_exact_path_with_its_message()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "myth-keeper-9")).Id;
        var id = await CreateCreatureAsync(client, campaignId, "myth-keeper-9");
        var body = new
        {
            name = " ",
            details = new { creatureKind = "Dragon", origin = new string('x', 4001) },
            keeperNotes = Json(ImageNotes),
            characteristics = new
            {
                values = new Dictionary<string, int?> { ["STR"] = 2001, ["LUCK"] = 50 },
                hitPointsNotApplicable = false,
                overrides = new
                {
                    hitPoints = new { value = 0, reason = "r" },
                    magicPoints = new { value = (int?)null, reason = new string('r', 501) },
                    damageBonus = new { value = "DB", reason = "r" },
                    build = new { value = 100, reason = "r" },
                },
            },
            movement = new object[]
            {
                new { mode = "Teleport", label = (string?)null, rate = 8 },
                new { mode = "Other", label = (string?)null, rate = 1000 },
            },
            combat = new
            {
                attacksPerRound = 100,
                dodge = 2001,
                attacks = new object[]
                {
                    new { name = "", skill = (string?)null, skillValue = (int?)null, damage = "D", effect = (string?)null, manoeuvre = false },
                    new { name = "Bite", skill = "Fighting", skillValue = 40, damage = (string?)null, effect = (string?)null, manoeuvre = false },
                },
            },
            defenses = new
            {
                armorPoints = 2001,
                armorNote = (string?)null,
                immunities = new[] { new { description = "" } },
                vulnerabilities = new[] { new { description = (string?)null } },
            },
            skills = new object[] { new { name = "", value = 2001 } },
            spells = new[] { new { name = "", magicPointCost = (string?)null, effect = (string?)null } },
            powers = new[] { new { name = "", magicPointCost = (string?)null, effect = (string?)null, limits = new string('l', 1001) } },
            sanityLoss = new { value = "0/" },
        };

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, CreaturesUri(campaignId, $"/{id}"), "myth-keeper-9", body));

        var problems = await ProblemsAsync(response);
        Assert.Equal(
            [
                "characteristics.overrides.build.value",
                "characteristics.overrides.damageBonus.value",
                "characteristics.overrides.hitPoints.value",
                "characteristics.overrides.magicPoints.reason",
                "characteristics.overrides.magicPoints.value",
                "characteristics.values.LUCK",
                "characteristics.values.STR",
                "combat.attacksPerRound",
                "combat.attacks[0].damage",
                "combat.attacks[0].name",
                "combat.attacks[0].skill",
                "combat.attacks[0].skillValue",
                "combat.attacks[1].damage",
                "combat.dodge",
                "defenses.armorPoints",
                "defenses.immunities[0].description",
                "defenses.vulnerabilities[0].description",
                "details.creatureKind",
                "details.origin",
                "keeperNotes",
                "movement[0].mode",
                "movement[1].label",
                "movement[1].rate",
                "name",
                "powers[0].limits",
                "powers[0].name",
                "sanityLoss.value",
                "skills[0].name",
                "skills[0].value",
                "spells[0].name",
            ],
            problems.Keys.OrderBy(key => key, StringComparer.Ordinal));
        Assert.Equal(["Enter Build from -2 to 99."], problems["characteristics.overrides.build.value"]);
        Assert.Equal(["Write the Damage Bonus like +1D4, -1, or 0."], problems["characteristics.overrides.damageBonus.value"]);
        Assert.Equal(["Enter Hit Points from 1 to 9,999."], problems["characteristics.overrides.hitPoints.value"]);
        Assert.Equal(["Reason must be 500 characters or fewer."], problems["characteristics.overrides.magicPoints.reason"]);
        Assert.Equal(["Enter the override."], problems["characteristics.overrides.magicPoints.value"]);
        Assert.Equal(["LUCK isn't a characteristic."], problems["characteristics.values.LUCK"]);
        Assert.Equal(["Enter STR from 0 to 2,000."], problems["characteristics.values.STR"]);
        Assert.Equal(["Write the damage as dice and numbers, for example 1D6+DB or 2D6-1."], problems["combat.attacks[0].damage"]);
        Assert.Equal(["Enter the damage, or mark the attack as a manoeuvre."], problems["combat.attacks[1].damage"]);
        Assert.Equal(["Choose a Creature Kind from the list."], problems["details.creatureKind"]);
        Assert.Equal(["Origin must be 4,000 characters or fewer."], problems["details.origin"]);
        Assert.Equal(["Choose a mode from the list."], problems["movement[0].mode"]);
        Assert.Equal(["Name the mode."], problems["movement[1].label"]);
        Assert.Equal(["Enter a rate from 0 to 999."], problems["movement[1].rate"]);
        Assert.Equal(["Enter a name."], problems["name"]);
        Assert.Equal(["Limits must be 1,000 characters or fewer."], problems["powers[0].limits"]);
        Assert.Equal(["Enter the power's name."], problems["powers[0].name"]);
        Assert.Contains("rich-text", problems["keeperNotes"][0]);
    }

    [Fact]
    public async Task Given_more_than_100_attacks_When_replacing_Then_the_list_is_reported_under_combat_attacks()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "myth-keeper-10")).Id;
        var id = await CreateCreatureAsync(client, campaignId, "myth-keeper-10");
        var attacks = Enumerable.Range(0, 101).Select(index => new { name = $"Attack {index}", skill = "Fighting", skillValue = 40, damage = "1D6", effect = (string?)null, manoeuvre = false }).ToArray();

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, CreaturesUri(campaignId, $"/{id}"), "myth-keeper-10", new { name = "Many", combat = new { attacksPerRound = 1, dodge = (int?)null, attacks } }));

        Assert.Equal(["Add at most 100 attacks."], (await ProblemsAsync(response))["combat.attacks"]);
    }

    [Fact]
    public async Task Given_sections_removed_in_a_later_replace_When_reading_Then_the_sections_and_their_overrides_are_gone()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "myth-keeper-11")).Id;
        var id = await CreateCreatureAsync(client, campaignId, "myth-keeper-11");
        await client.SendAsync(BuildRequest(HttpMethod.Put, CreaturesUri(campaignId, $"/{id}"), "myth-keeper-11", GhoulRequest(sanityLoss: new { value = "0/1D6" })));

        var response = await client.SendAsync(BuildRequest(HttpMethod.Put, CreaturesUri(campaignId, $"/{id}"), "myth-keeper-11", new { name = "Ghoul" }));

        var creature = await BodyAsync(response);
        Assert.Equal(JsonValueKind.Null, creature.GetProperty("characteristics").ValueKind);
        Assert.Equal(JsonValueKind.Null, creature.GetProperty("sanityLoss").ValueKind);
    }

    [Fact]
    public async Task Given_a_keeper_When_deleting_Then_it_is_204_and_the_mythos_creature_is_gone()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "myth-keeper-12")).Id;
        var id = await CreateCreatureAsync(client, campaignId, "myth-keeper-12");

        var delete = await client.SendAsync(BuildRequest(HttpMethod.Delete, CreaturesUri(campaignId, $"/{id}"), "myth-keeper-12"));
        var get = await client.SendAsync(BuildRequest(HttpMethod.Get, CreaturesUri(campaignId, $"/{id}"), "myth-keeper-12"));
        var again = await client.SendAsync(BuildRequest(HttpMethod.Delete, CreaturesUri(campaignId, $"/{id}"), "myth-keeper-12"));

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, again.StatusCode);
    }

    [Fact]
    public async Task Given_a_player_or_another_keeper_When_using_any_endpoint_Then_every_answer_is_the_same_404_and_nothing_changes()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "myth-keeper-13")).Id;
        await JoinAsPlayerAsync(client, campaignId, "myth-keeper-13", "myth-player-13");
        await CreateCampaignAsync(client, "myth-other-keeper-13");
        var id = await CreateCreatureAsync(client, campaignId, "myth-keeper-13");
        var missing = Guid.NewGuid();

        var bodies = new List<string>();
        foreach (var oid in new[] { "myth-player-13", "myth-other-keeper-13" })
        {
            foreach (var creatureId in new[] { id, missing })
            {
                HttpRequestMessage[] calls =
                [
                    BuildRequest(HttpMethod.Get, CreaturesUri(campaignId, $"/{creatureId}"), oid),
                    BuildRequest(HttpMethod.Put, CreaturesUri(campaignId, $"/{creatureId}"), oid, new { name = "Hacked" }),
                    BuildRequest(HttpMethod.Delete, CreaturesUri(campaignId, $"/{creatureId}"), oid),
                ];
                foreach (var call in calls)
                {
                    var response = await client.SendAsync(call);
                    Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
                    bodies.Add(await response.Content.ReadAsStringAsync());
                }
            }

            var create = await client.SendAsync(BuildRequest(HttpMethod.Post, CreaturesUri(campaignId), oid, new { name = "Intruder" }));
            var invalidCreate = await client.SendAsync(BuildRequest(HttpMethod.Post, CreaturesUri(campaignId), oid, new { }));
            Assert.Equal([HttpStatusCode.NotFound, HttpStatusCode.NotFound], [create.StatusCode, invalidCreate.StatusCode]);
        }

        Assert.Single(bodies.Select(WithoutTraceId).Distinct());
        var untouched = await BodyAsync(await client.SendAsync(BuildRequest(HttpMethod.Get, CreaturesUri(campaignId, $"/{id}"), "myth-keeper-13")));
        Assert.Equal("Ghoul", untouched.GetProperty("name").GetString());
        var items = (await BodyAsync(await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/non-player-entities", "myth-keeper-13")))).GetProperty("items");
        Assert.Single(items.EnumerateArray());
    }

    [Fact]
    public async Task Given_a_mythos_creature_of_another_campaign_When_the_keeper_uses_its_id_under_their_own_campaign_Then_it_is_404()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "myth-keeper-14")).Id;
        var otherCampaignId = (await CreateCampaignAsync(client, "myth-keeper-14")).Id;
        var otherId = await CreateCreatureAsync(client, otherCampaignId, "myth-keeper-14", "Elsewhere");

        var get = await client.SendAsync(BuildRequest(HttpMethod.Get, CreaturesUri(campaignId, $"/{otherId}"), "myth-keeper-14"));
        var put = await client.SendAsync(BuildRequest(HttpMethod.Put, CreaturesUri(campaignId, $"/{otherId}"), "myth-keeper-14", new { name = "Hijacked" }));
        var delete = await client.SendAsync(BuildRequest(HttpMethod.Delete, CreaturesUri(campaignId, $"/{otherId}"), "myth-keeper-14"));

        Assert.Equal([HttpStatusCode.NotFound, HttpStatusCode.NotFound, HttpStatusCode.NotFound], [get.StatusCode, put.StatusCode, delete.StatusCode]);
        var untouched = await BodyAsync(await client.SendAsync(BuildRequest(HttpMethod.Get, CreaturesUri(otherCampaignId, $"/{otherId}"), "myth-keeper-14")));
        Assert.Equal("Elsewhere", untouched.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Given_a_human_npc_id_on_the_mythos_creature_route_and_the_reverse_When_the_keeper_uses_it_Then_it_is_404()
    {
        var client = _factory.CreateClient();
        var campaignId = (await CreateCampaignAsync(client, "myth-keeper-15")).Id;
        var humanResponse = await client.SendAsync(BuildRequest(HttpMethod.Post, $"/api/campaigns/{campaignId}/human-npcs", "myth-keeper-15", new { name = "Mr. Knott", age = 62 }));
        var humanId = (await BodyAsync(humanResponse)).GetProperty("id").GetGuid();
        var creatureId = await CreateCreatureAsync(client, campaignId, "myth-keeper-15");

        var humanAsCreature = await client.SendAsync(BuildRequest(HttpMethod.Get, CreaturesUri(campaignId, $"/{humanId}"), "myth-keeper-15"));
        var creatureAsHuman = await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/human-npcs/{creatureId}", "myth-keeper-15"));
        var deleteHumanAsCreature = await client.SendAsync(BuildRequest(HttpMethod.Delete, CreaturesUri(campaignId, $"/{humanId}"), "myth-keeper-15"));

        Assert.Equal([HttpStatusCode.NotFound, HttpStatusCode.NotFound, HttpStatusCode.NotFound], [humanAsCreature.StatusCode, creatureAsHuman.StatusCode, deleteHumanAsCreature.StatusCode]);
        var list = await BodyAsync(await client.SendAsync(BuildRequest(HttpMethod.Get, $"/api/campaigns/{campaignId}/non-player-entities", "myth-keeper-15")));
        Assert.Equal(2, list.GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task Given_an_unauthenticated_request_When_using_the_mythos_creature_endpoints_Then_it_is_unauthorized()
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, CreaturesUri(Guid.NewGuid(), $"/{Guid.NewGuid()}"));
        request.Headers.Add("X-Test-Unauthenticated", "true");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // Problem details carry a per-request traceId; everything else must match.
    private static string WithoutTraceId(string body) =>
        System.Text.RegularExpressions.Regex.Replace(body, "\"traceId\":\"[^\"]*\"", string.Empty);
}
