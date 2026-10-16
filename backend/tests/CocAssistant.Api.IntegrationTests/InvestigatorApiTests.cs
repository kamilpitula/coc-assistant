namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// Integration tests for the Investigator and Character Sheet endpoints (specs/campaign-play/spec.md API Contracts and
/// Investigator API shapes; specs/character-sheet/spec.md API Contracts), covering the Investigator scenarios and
/// Regression Guardrails over HTTP against SQL Server.
/// </summary>
public class InvestigatorApiTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private const string Keeper = "inv-keeper";
    private const string Player = "inv-player";
    private const string OtherPlayer = "inv-other-player";

    private readonly IdentityApiFactory _factory;
    private HttpClient _client = null!;
    private Guid _campaignId;

    public InvestigatorApiTests(IdentityApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await ResetDatabaseAsync(_factory);
        _client = _factory.CreateClient();
        _campaignId = (await CreateCampaignAsync(_client, Keeper)).Id;
        await JoinAsPlayerAsync(_client, _campaignId, Keeper, Player);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private string Investigators => $"/api/campaigns/{_campaignId}/investigators";

    private Task<HttpResponseMessage> SendAsync(HttpMethod method, string uri, string oid, object? body = null) =>
        _client.SendAsync(BuildRequest(method, uri, oid, body));

    private static async Task<JsonElement> JsonAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }

    private static object ValidSheet(string name = "Harvey Walters") => ValidCharacterSheet(name);

    private async Task<Guid> CreateDraftAsync(string playerOid = Player)
    {
        var response = await SendAsync(HttpMethod.Post, Investigators, playerOid);
        response.EnsureSuccessStatusCode();
        return (await JsonAsync(response)).GetProperty("id").GetGuid();
    }

    private async Task<Guid> CreateSubmittedAsync(string playerOid = Player)
    {
        var id = await CreateDraftAsync(playerOid);
        (await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", playerOid, ValidSheet())).EnsureSuccessStatusCode();
        (await SendAsync(HttpMethod.Post, $"{Investigators}/mine/submit", playerOid)).EnsureSuccessStatusCode();
        return id;
    }

    private async Task<string> StatusOfMineAsync(string playerOid = Player) =>
        (await JsonAsync(await SendAsync(HttpMethod.Get, $"{Investigators}/mine", playerOid))).GetProperty("status").GetString()!;

    // Scenario: Player starts a Draft Investigator
    [Fact]
    public async Task Given_a_player_When_creating_an_investigator_Then_a_draft_summary_is_returned()
    {
        var response = await SendAsync(HttpMethod.Post, Investigators, Player);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await JsonAsync(response);
        Assert.Equal(
            ["changeRequestComment", "id", "name", "status", "updatedAt"],
            body.EnumerateObject().Select(property => property.Name).Order());
        Assert.Equal("Draft", body.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("name").ValueKind);
        Assert.Equal("Draft", await StatusOfMineAsync());
    }

    // Scenario: Player cannot create a second Investigator
    [Fact]
    public async Task Given_a_player_with_an_investigator_When_creating_another_Then_it_is_a_conflict()
    {
        await CreateDraftAsync();

        var response = await SendAsync(HttpMethod.Post, Investigators, Player);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    // Regression Guardrail: A Player controls at most one Investigator per Campaign (database unique index).
    [Fact]
    public async Task Given_two_concurrent_creations_for_one_player_When_both_complete_Then_exactly_one_succeeds()
    {
        var responses = await Task.WhenAll(
            SendAsync(HttpMethod.Post, Investigators, Player),
            SendAsync(HttpMethod.Post, Investigators, Player),
            SendAsync(HttpMethod.Post, Investigators, Player));

        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Created);
        Assert.All(
            responses.Where(response => response.StatusCode != HttpStatusCode.Created),
            response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
    }

    [Theory]
    [InlineData(Keeper)]
    [InlineData("inv-stranger")]
    public async Task Given_a_keeper_or_non_member_When_creating_an_investigator_Then_it_is_not_found(string oid)
    {
        Assert.Equal(HttpStatusCode.NotFound, (await SendAsync(HttpMethod.Post, Investigators, oid)).StatusCode);
    }

    // PBI-CP-009 supports every Creation Method, so a Campaign allowing only Quick Fire can create Investigators.
    [Fact]
    public async Task Given_a_campaign_allowing_only_quick_fire_When_creating_an_investigator_Then_the_draft_is_created()
    {
        (await SendAsync(HttpMethod.Put, $"/api/campaigns/{_campaignId}/allowed-creation-methods", Keeper, new { allowedCreationMethods = new[] { "QuickFire" } }))
            .EnsureSuccessStatusCode();

        var response = await SendAsync(HttpMethod.Post, Investigators, Player);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_draft_When_saving_a_valid_character_sheet_Then_the_recomputed_sheet_rules_and_no_errors_are_returned()
    {
        await CreateDraftAsync();

        var response = await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, ValidSheet());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await JsonAsync(response);
        Assert.Equal(DisplayNameFor(Player), body.GetProperty("playerName").GetString());
        Assert.Equal("Draft", body.GetProperty("status").GetString());
        Assert.Equal(0, body.GetProperty("validationErrors").GetArrayLength());
        var sheet = body.GetProperty("characterSheet");
        Assert.Equal(4, sheet.GetProperty("schemaVersion").GetInt32());
        Assert.Equal("Boston", sheet.GetProperty("identity").GetProperty("residence").GetString());
        var strength = sheet.GetProperty("characteristics").GetProperty("STR");
        Assert.Equal((60, 60, 30, 12), (strength.GetProperty("assigned").GetInt32(), strength.GetProperty("value").GetInt32(), strength.GetProperty("hard").GetInt32(), strength.GetProperty("extreme").GetInt32()));
        Assert.Equal(20, sheet.GetProperty("ageEffects").GetProperty("bracket").GetProperty("minimumAge").GetInt32());
        Assert.Equal(50, sheet.GetProperty("ageEffects").GetProperty("eduImprovementChecks")[0].GetProperty("eduAfter").GetInt32());
        Assert.Equal(55, sheet.GetProperty("derived").GetProperty("luck").GetInt32());
        Assert.Equal(99, sheet.GetProperty("derived").GetProperty("sanity").GetProperty("maximum").GetInt32());
        Assert.Equal("PlayerEntered", sheet.GetProperty("rollRecords")[0].GetProperty("source").GetString());
        Assert.Equal(460, body.GetProperty("rules").GetProperty("pointBuyBudget").GetInt32());
        Assert.Equal("3D6", body.GetProperty("rules").GetProperty("luckDice").GetString());
        Assert.Equal(99, body.GetProperty("rules").GetProperty("eduMaximum").GetInt32());
        Assert.Equal(5, body.GetProperty("rules").GetProperty("luckMultiplier").GetInt32());

        var reread = await JsonAsync(await SendAsync(HttpMethod.Get, $"{Investigators}/mine/character-sheet", Player));
        Assert.Equal("Harvey Walters", reread.GetProperty("characterSheet").GetProperty("identity").GetProperty("name").GetString());
    }

    [Fact]
    public async Task Given_a_draft_When_saving_an_incomplete_sheet_Then_it_is_saved_with_its_validation_errors()
    {
        await CreateDraftAsync();
        var incomplete = new
        {
            identity = new { name = "Harvey Walters", age = 14 },
            creationMethod = "PointBuy",
            characteristics = new Dictionary<string, int?>(),
            ageEffects = new { deductions = new Dictionary<string, int?>(), eduImprovementChecks = Array.Empty<object>() },
            luckRolls = Array.Empty<int?>(),
        };

        var response = await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, incomplete);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var errors = (await JsonAsync(response)).GetProperty("validationErrors");
        var ageError = errors.EnumerateArray().Single(error => error.GetProperty("code").GetString() == "AgeOutOfRange");
        Assert.Equal("identity.age", ageError.GetProperty("field").GetString());
        Assert.Equal("Error", ageError.GetProperty("severity").GetString());
        Assert.Equal("15-89", ageError.GetProperty("expected").GetString());
    }

    [Fact]
    public async Task Given_an_unknown_creation_method_When_saving_the_sheet_Then_it_is_a_bad_request()
    {
        await CreateDraftAsync();
        var body = new { identity = new { name = "Harvey" }, creationMethod = "Freeform", characteristics = new Dictionary<string, int?>() };

        Assert.Equal(HttpStatusCode.BadRequest, (await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, body)).StatusCode);
    }

    // Scenario: Standard Rolling records every Player-entered roll
    [Fact]
    public async Task Given_standard_rolling_rolls_When_saving_the_sheet_Then_each_roll_is_a_player_entered_record_and_values_are_computed_from_them()
    {
        await CreateDraftAsync();
        var body = new
        {
            identity = new { name = "Harvey Walters", age = 25 },
            creationMethod = "StandardRolling",
            characteristicRolls = new Dictionary<string, int?> { ["STR"] = 12, ["CON"] = 12, ["DEX"] = 12, ["APP"] = 10, ["POW"] = 12, ["SIZ"] = 6, ["INT"] = 6, ["EDU"] = 4 },
            ageEffects = new { deductions = new Dictionary<string, int?>(), eduImprovementChecks = new[] { new { check = (int?)30, gain = (int?)null } } },
            luckRolls = new int?[] { 11 },
            occupation = ValidAntiquarian,
            skills = ValidSkillAllocations,
        };

        var response = await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await JsonAsync(response);
        Assert.Equal(0, json.GetProperty("validationErrors").GetArrayLength());
        var sheet = json.GetProperty("characterSheet");
        Assert.Equal(6, sheet.GetProperty("characteristicRolls").GetProperty("SIZ").GetInt32());
        Assert.Equal(60, sheet.GetProperty("characteristics").GetProperty("SIZ").GetProperty("assigned").GetInt32());
        var records = sheet.GetProperty("rollRecords").EnumerateArray().ToList();
        Assert.Equal(10, records.Count);
        Assert.All(records, record => Assert.Equal("PlayerEntered", record.GetProperty("source").GetString()));
        var size = records.Single(record => record.GetProperty("purpose").GetString() == "Characteristic:SIZ");
        Assert.Equal(("2D6", 6), (size.GetProperty("dice").GetString(), size.GetProperty("result").GetInt32()));
    }

    [Fact]
    public async Task Given_a_valid_quick_fire_sheet_When_saving_it_Then_it_has_no_errors_and_skills_take_their_quick_fire_values()
    {
        await CreateDraftAsync();
        var body = new
        {
            identity = new { name = "Harvey Walters", age = 25 },
            creationMethod = "QuickFire",
            characteristics = new Dictionary<string, int?> { ["STR"] = 50, ["CON"] = 60, ["DEX"] = 50, ["APP"] = 40, ["POW"] = 60, ["SIZ"] = 50, ["INT"] = 80, ["EDU"] = 70 },
            ageEffects = new { deductions = new Dictionary<string, int?>(), eduImprovementChecks = new[] { new { check = (int?)30, gain = (int?)null } } },
            luckRolls = new int?[] { 11 },
            occupation = ValidAntiquarian,
            quickFire = new
            {
                values = new object[]
                {
                    new { skill = "Credit Rating", value = 30 }, new { skill = "Appraise", value = 70 },
                    new { skill = "Art/Craft", specialization = "Painting", value = 60 }, new { skill = "History", value = 60 },
                    new { skill = "Library Use", value = 50 }, new { skill = "Language (Other)", specialization = "Latin", value = 50 },
                    new { skill = "Charm", value = 50 }, new { skill = "Spot Hidden", value = 40 },
                    new { skill = "Firearms", specialization = "Handgun", value = 40 },
                },
                extraSkill = new { skill = "Drive Auto" },
                personalInterests = new[] { new { skill = "Listen" }, new { skill = "Stealth" }, new { skill = "Psychology" }, new { skill = "Persuade" } },
            },
        };

        var response = await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await JsonAsync(response);
        Assert.Equal(0, json.GetProperty("validationErrors").GetArrayLength());
        var sheet = json.GetProperty("characterSheet");
        Assert.Equal(JsonValueKind.Null, sheet.GetProperty("derived").GetProperty("occupationPoints").ValueKind);
        Assert.Equal(30, sheet.GetProperty("derived").GetProperty("creditRating").GetInt32());
        var listen = sheet.GetProperty("skills").EnumerateArray().Single(row => row.GetProperty("skill").GetString() == "Listen");
        Assert.Equal(40, listen.GetProperty("value").GetInt32());
        Assert.Equal(4, sheet.GetProperty("quickFire").GetProperty("personalInterests").GetArrayLength());
        Assert.Equal("Drive Auto", sheet.GetProperty("quickFire").GetProperty("extraSkill").GetProperty("skill").GetString());
        var driveAuto = sheet.GetProperty("skills").EnumerateArray().Single(row => row.GetProperty("skill").GetString() == "Drive Auto");
        Assert.Equal((40, true), (driveAuto.GetProperty("value").GetInt32(), driveAuto.GetProperty("isOccupationSkill").GetBoolean()));
        var creditRating = sheet.GetProperty("occupation").GetProperty("quickFireCreditRating");
        Assert.Equal((30, 40), (creditRating.GetProperty("value").GetInt32(), creditRating.GetProperty("freedValue").GetInt32()));
    }

    [Theory]
    [InlineData("StandardRolling")]
    [InlineData("QuickFire")]
    public async Task Given_inputs_of_another_creation_method_When_saving_the_sheet_Then_it_is_a_bad_request(string creationMethod)
    {
        await CreateDraftAsync();
        var body = new
        {
            identity = new { name = "Harvey" },
            creationMethod,
            characteristics = new Dictionary<string, int?> { ["STR"] = 50 },
            characteristicRolls = new Dictionary<string, int?> { ["STR"] = 10 },
            skills = new[] { new { skill = "Listen", personalInterestPoints = 10 } },
        };

        Assert.Equal(HttpStatusCode.BadRequest, (await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, body)).StatusCode);
    }

    [Fact]
    public async Task Given_a_valid_sheet_When_saving_it_Then_the_occupation_budgets_skills_credit_rating_wealth_and_rules_are_returned()
    {
        await CreateDraftAsync();

        var json = await JsonAsync(await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, ValidSheet()));

        var sheet = json.GetProperty("characterSheet");
        Assert.Equal("Antiquarian", sheet.GetProperty("occupation").GetProperty("name").GetString());
        Assert.Equal(30, sheet.GetProperty("occupation").GetProperty("creditRatingMin").GetInt32());
        var derived = sheet.GetProperty("derived");
        Assert.Equal((200, 200, 0), Budget(derived.GetProperty("occupationPoints")));
        Assert.Equal((120, 120, 0), Budget(derived.GetProperty("personalInterestPoints")));
        Assert.Equal(30, derived.GetProperty("creditRating").GetInt32());
        Assert.Equal("USD", derived.GetProperty("wealth").GetProperty("currency").GetString());
        Assert.Equal(60m, derived.GetProperty("wealth").GetProperty("cash").GetProperty("amount").GetDecimal());
        var libraryUse = sheet.GetProperty("skills").EnumerateArray().Single(row => row.GetProperty("skill").GetString() == "Library Use");
        Assert.Equal((20, 50, 70, true), (libraryUse.GetProperty("base").GetInt32(), libraryUse.GetProperty("occupationPoints").GetInt32(), libraryUse.GetProperty("value").GetInt32(), libraryUse.GetProperty("isOccupationSkill").GetBoolean()));
        var rules = json.GetProperty("rules");
        Assert.Equal("2D6", rules.GetProperty("standardRolling").GetProperty("EDU").GetProperty("dice").GetString());
        Assert.Equal(9, rules.GetProperty("quickFireSkillValues").GetArrayLength());
        Assert.Equal("EDUx4", rules.GetProperty("occupationPointFormulas")[0].GetProperty("id").GetString());
        Assert.Equal("Cthulhu Mythos", rules.GetProperty("cthulhuMythosSkill").GetString());
    }

    /// <summary>The valid sheet with the given properties replaced, in the PUT body shape.</summary>
    private static System.Text.Json.Nodes.JsonObject SheetWith(params (string Name, object? Value)[] replacements)
    {
        var sheet = JsonSerializer.SerializeToNode(ValidSheet(), JsonSerializerOptions.Web)!.AsObject();
        foreach (var (name, value) in replacements)
        {
            sheet[name] = JsonSerializer.SerializeToNode(value, JsonSerializerOptions.Web);
        }

        return sheet;
    }

    private static object Backstory(string? myStory = null, string? traits = null, string? significantPeople = null) =>
        new { myStory, traits, significantPeople };

    private static object Weapon(string? name) =>
        new { name, skill = "Firearms (Handgun)", damage = "1D10", attacks = "1 (3)", range = "15 yards", ammo = "6", malfunction = "100" };

    [Fact]
    public async Task Given_a_draft_When_saving_a_backstory_key_connection_custom_weapon_and_gear_Then_they_are_returned_with_idea_and_know()
    {
        await CreateDraftAsync();
        var body = SheetWith(
            ("backstory", Backstory("Grew up above a bookshop.", significantPeople: "My sister Ada")),
            ("keyConnection", "significantPeople"),
            ("weapons", new[] { Weapon(".38 Revolver") }),
            ("gear", "Camera, notebook"));

        var response = await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var sheet = (await JsonAsync(response)).GetProperty("characterSheet");
        Assert.Equal(4, sheet.GetProperty("schemaVersion").GetInt32());
        Assert.Equal("Grew up above a bookshop.", sheet.GetProperty("backstory").GetProperty("myStory").GetString());
        Assert.Equal("My sister Ada", sheet.GetProperty("backstory").GetProperty("significantPeople").GetString());
        Assert.Equal(JsonValueKind.Null, sheet.GetProperty("backstory").GetProperty("traits").ValueKind);
        Assert.Equal("significantPeople", sheet.GetProperty("keyConnection").GetString());
        var weapon = Assert.Single(sheet.GetProperty("weapons").EnumerateArray());
        Assert.Equal((".38 Revolver", "1D10", true), (weapon.GetProperty("name").GetString(), weapon.GetProperty("damage").GetString(), weapon.GetProperty("isCustom").GetBoolean()));
        Assert.Equal("Camera, notebook", sheet.GetProperty("gear").GetString());
        Assert.Equal((60, 50), (sheet.GetProperty("derived").GetProperty("idea").GetInt32(), sheet.GetProperty("derived").GetProperty("know").GetInt32()));
    }

    [Theory]
    [InlineData("traits")]
    [InlineData("myStory")]
    [InlineData("favouriteFood")]
    public async Task Given_a_key_connection_that_is_not_a_filled_in_background_entry_When_saving_the_sheet_Then_it_is_a_bad_request(string keyConnection)
    {
        await CreateDraftAsync();
        var body = SheetWith(("backstory", Backstory("A story", significantPeople: "Ada")), ("keyConnection", keyConnection));

        Assert.Equal(HttpStatusCode.BadRequest, (await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, body)).StatusCode);
    }

    [Fact]
    public async Task Given_an_unknown_backstory_entry_When_saving_the_sheet_Then_it_is_a_bad_request()
    {
        await CreateDraftAsync();
        var body = SheetWith(("backstory", new { favouriteFood = "Pie" }));

        Assert.Equal(HttpStatusCode.BadRequest, (await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, body)).StatusCode);
    }

    [Fact]
    public async Task Given_narrative_inputs_over_their_limits_When_saving_the_sheet_Then_each_is_a_bad_request()
    {
        await CreateDraftAsync();
        var tooLong = new string('a', 2001);
        var bodies = new[]
        {
            SheetWith(("backstory", Backstory(traits: tooLong))),
            SheetWith(("gear", tooLong)),
            SheetWith(("weapons", Enumerable.Range(0, 21).Select(index => Weapon($"Knife {index}")).ToArray())),
            SheetWith(("weapons", new[] { Weapon(new string('a', 101)) })),
        };

        foreach (var body in bodies)
        {
            Assert.Equal(HttpStatusCode.BadRequest, (await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, body)).StatusCode);
        }
    }

    [Fact]
    public async Task Given_a_custom_weapon_without_a_name_When_saving_and_submitting_Then_it_is_saved_with_the_error_and_submission_is_rejected()
    {
        await CreateDraftAsync();

        var saved = await JsonAsync(await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, SheetWith(("weapons", new[] { Weapon(null) }))));
        var submitted = await SendAsync(HttpMethod.Post, $"{Investigators}/mine/submit", Player);

        var error = Assert.Single(saved.GetProperty("validationErrors").EnumerateArray());
        Assert.Equal(("WeaponNameRequired", "weapons[0].name"), (error.GetProperty("code").GetString(), error.GetProperty("field").GetString()));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, submitted.StatusCode);
    }

    // Scenario: Unspent personal interest points only warn
    [Fact]
    public async Task Given_unspent_personal_interest_points_and_no_errors_When_submitting_Then_it_is_submitted_and_the_keeper_sees_the_warning_and_the_narrative()
    {
        var id = await CreateDraftAsync();
        var skills = ValidSkillAllocations.Take(ValidSkillAllocations.Length - 1).ToArray();
        var body = SheetWith(
            ("skills", skills),
            ("backstory", Backstory(traits: "Stubborn")),
            ("keyConnection", "traits"),
            ("weapons", new[] { Weapon("Knife") }),
            ("gear", "Lantern"));
        (await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, body)).EnsureSuccessStatusCode();

        var submitted = await SendAsync(HttpMethod.Post, $"{Investigators}/mine/submit", Player);
        var review = await JsonAsync(await SendAsync(HttpMethod.Get, $"{Investigators}/{id}", Keeper));

        Assert.Equal(HttpStatusCode.OK, submitted.StatusCode);
        Assert.Equal("Submitted", review.GetProperty("status").GetString());
        var warning = Assert.Single(review.GetProperty("warnings").EnumerateArray());
        Assert.Equal("PersonalInterestPointsUnspent", warning.GetProperty("code").GetString());
        var sheet = review.GetProperty("characterSheet");
        Assert.Equal("traits", sheet.GetProperty("keyConnection").GetString());
        Assert.Equal("Knife", Assert.Single(sheet.GetProperty("weapons").EnumerateArray()).GetProperty("name").GetString());
        Assert.Equal("Lantern", sheet.GetProperty("gear").GetString());
    }

    private static (int Budget, int Spent, int Left) Budget(JsonElement budget) =>
        (budget.GetProperty("budget").GetInt32(), budget.GetProperty("spent").GetInt32(), budget.GetProperty("left").GetInt32());

    [Fact]
    public async Task Given_a_draft_with_errors_When_submitting_Then_422_lists_the_validation_errors_and_it_stays_a_draft()
    {
        await CreateDraftAsync();

        var response = await SendAsync(HttpMethod.Post, $"{Investigators}/mine/submit", Player);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var codes = (await JsonAsync(response)).GetProperty("validationErrors").EnumerateArray()
            .Select(error => error.GetProperty("code").GetString()).ToList();
        Assert.Contains("InvestigatorNameRequired", codes);
        Assert.Contains("LuckRollRequired", codes);
        Assert.Equal("Draft", await StatusOfMineAsync());
    }

    // Scenario: Player submits a valid Character Sheet
    [Fact]
    public async Task Given_a_valid_draft_When_submitting_Then_it_is_submitted_and_the_sheet_can_no_longer_be_edited()
    {
        await CreateSubmittedAsync();

        Assert.Equal("Submitted", await StatusOfMineAsync());
        Assert.Equal(HttpStatusCode.Conflict, (await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, ValidSheet())).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await SendAsync(HttpMethod.Delete, $"{Investigators}/mine", Player)).StatusCode);
    }

    // Scenario: Player starts over from a Draft
    [Fact]
    public async Task Given_a_draft_When_starting_over_Then_it_is_deleted()
    {
        await CreateDraftAsync();

        Assert.Equal(HttpStatusCode.NoContent, (await SendAsync(HttpMethod.Delete, $"{Investigators}/mine", Player)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await SendAsync(HttpMethod.Get, $"{Investigators}/mine", Player)).StatusCode);
    }

    // Scenario: Player starts a Draft Investigator (the Keeper sees it only as "In progress")
    [Fact]
    public async Task Given_a_draft_and_a_submitted_investigator_When_the_keeper_lists_them_Then_the_draft_hides_its_id_and_name()
    {
        await JoinAsPlayerAsync(_client, _campaignId, Keeper, OtherPlayer);
        await CreateDraftAsync(Player);
        (await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, ValidSheet("Secret Name"))).EnsureSuccessStatusCode();
        var submittedId = await CreateSubmittedAsync(OtherPlayer);

        var response = await SendAsync(HttpMethod.Get, Investigators, Keeper);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var rows = (await JsonAsync(response)).EnumerateArray().ToList();
        var draft = rows.Single(row => row.GetProperty("status").GetString() == "Draft");
        Assert.Equal(DisplayNameFor(Player), draft.GetProperty("playerName").GetString());
        Assert.Equal(JsonValueKind.Null, draft.GetProperty("investigatorId").ValueKind);
        Assert.Equal(JsonValueKind.Null, draft.GetProperty("investigatorName").ValueKind);
        var submitted = rows.Single(row => row.GetProperty("status").GetString() == "Submitted");
        Assert.Equal(submittedId, submitted.GetProperty("investigatorId").GetGuid());
        Assert.Equal("Harvey Walters", submitted.GetProperty("investigatorName").GetString());
        Assert.Equal(DisplayNameFor(OtherPlayer), submitted.GetProperty("playerName").GetString());
    }

    [Fact]
    public async Task Given_a_player_When_listing_investigators_Then_it_is_not_found()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await SendAsync(HttpMethod.Get, Investigators, Player)).StatusCode);
    }

    // Scenario: Keeper cannot open a Draft Investigator; Player cannot read another Player's Investigator
    [Fact]
    public async Task Given_a_draft_When_the_keeper_or_another_player_opens_it_Then_it_is_not_found()
    {
        await JoinAsPlayerAsync(_client, _campaignId, Keeper, OtherPlayer);
        var draftId = await CreateDraftAsync();
        var submittedId = await CreateSubmittedAsync(OtherPlayer);

        Assert.Equal(HttpStatusCode.NotFound, (await SendAsync(HttpMethod.Get, $"{Investigators}/{draftId}", Keeper)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await SendAsync(HttpMethod.Get, $"{Investigators}/{submittedId}", Player)).StatusCode);
    }

    [Fact]
    public async Task Given_a_submitted_investigator_When_the_keeper_opens_it_Then_the_sheet_warnings_and_roll_records_are_returned()
    {
        var id = await CreateSubmittedAsync();

        var response = await SendAsync(HttpMethod.Get, $"{Investigators}/{id}", Keeper);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await JsonAsync(response);
        Assert.Equal(
            ["changeRequestComment", "characterSheet", "id", "playerName", "status", "updatedAt", "warnings"],
            body.EnumerateObject().Select(property => property.Name).Order());
        Assert.Equal("Submitted", body.GetProperty("status").GetString());
        Assert.Equal(DisplayNameFor(Player), body.GetProperty("playerName").GetString());
        Assert.Equal(0, body.GetProperty("warnings").GetArrayLength());
        Assert.Equal(2, body.GetProperty("characterSheet").GetProperty("rollRecords").GetArrayLength());
    }

    // Scenario: Investigator is not reachable from another Campaign
    [Fact]
    public async Task Given_an_investigator_in_campaign_a_When_the_keeper_of_campaign_b_requests_it_through_campaign_b_Then_it_is_not_found()
    {
        var id = await CreateSubmittedAsync();
        var campaignB = (await CreateCampaignAsync(_client, "inv-keeper-b")).Id;

        var read = await SendAsync(HttpMethod.Get, $"/api/campaigns/{campaignB}/investigators/{id}", "inv-keeper-b");
        var approve = await SendAsync(HttpMethod.Post, $"/api/campaigns/{campaignB}/investigators/{id}/approve", "inv-keeper-b");

        Assert.Equal(HttpStatusCode.NotFound, read.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, approve.StatusCode);
        Assert.Equal("Submitted", await StatusOfMineAsync());
    }

    // Scenario: Keeper approves an Investigator
    [Fact]
    public async Task Given_a_submitted_investigator_When_the_keeper_approves_it_Then_it_is_approved_and_a_second_approval_conflicts()
    {
        var id = await CreateSubmittedAsync();

        var response = await SendAsync(HttpMethod.Post, $"{Investigators}/{id}/approve", Keeper);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Approved", (await JsonAsync(response)).GetProperty("status").GetString());
        Assert.Equal("Approved", await StatusOfMineAsync());
        Assert.Equal(HttpStatusCode.Conflict, (await SendAsync(HttpMethod.Post, $"{Investigators}/{id}/approve", Keeper)).StatusCode);
    }

    // Scenario: Player cannot approve their own Investigator
    [Fact]
    public async Task Given_a_submitted_investigator_When_its_player_approves_or_requests_changes_Then_it_is_not_found_and_remains_submitted()
    {
        var id = await CreateSubmittedAsync();

        var approve = await SendAsync(HttpMethod.Post, $"{Investigators}/{id}/approve", Player);
        var requestChanges = await SendAsync(HttpMethod.Post, $"{Investigators}/{id}/request-changes", Player, new { comment = "Looks fine" });

        Assert.Equal(HttpStatusCode.NotFound, approve.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, requestChanges.StatusCode);
        Assert.Equal("Submitted", await StatusOfMineAsync());
    }

    // Scenario: Request changes requires a comment
    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public async Task Given_a_submitted_investigator_When_requesting_changes_without_a_comment_Then_it_is_a_bad_request_and_remains_submitted(string? comment)
    {
        var id = await CreateSubmittedAsync();

        var response = await SendAsync(HttpMethod.Post, $"{Investigators}/{id}/request-changes", Keeper, new { comment });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Submitted", await StatusOfMineAsync());
    }

    [Fact]
    public async Task Given_a_submitted_investigator_When_requesting_changes_with_a_comment_over_2000_characters_Then_it_is_a_bad_request()
    {
        var id = await CreateSubmittedAsync();

        var response = await SendAsync(HttpMethod.Post, $"{Investigators}/{id}/request-changes", Keeper, new { comment = new string('a', 2001) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // Scenario: Keeper requests changes
    [Fact]
    public async Task Given_a_submitted_investigator_When_the_keeper_requests_changes_Then_the_player_sees_the_comment_edits_and_resubmits()
    {
        var id = await CreateSubmittedAsync();

        var response = await SendAsync(HttpMethod.Post, $"{Investigators}/{id}/request-changes", Keeper, new { comment = "Credit Rating seems high for this Occupation" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var mine = await JsonAsync(await SendAsync(HttpMethod.Get, $"{Investigators}/mine", Player));
        Assert.Equal("ChangesRequested", mine.GetProperty("status").GetString());
        Assert.Equal("Credit Rating seems high for this Occupation", mine.GetProperty("changeRequestComment").GetString());
        Assert.Equal(HttpStatusCode.OK, (await SendAsync(HttpMethod.Put, $"{Investigators}/mine/character-sheet", Player, ValidSheet("Harvey W."))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await SendAsync(HttpMethod.Post, $"{Investigators}/mine/submit", Player)).StatusCode);
        Assert.Equal("Submitted", await StatusOfMineAsync());
    }

    [Fact]
    public async Task Given_another_campaigns_player_When_reading_this_campaigns_mine_endpoints_Then_they_are_not_found()
    {
        await CreateDraftAsync();

        Assert.Equal(HttpStatusCode.NotFound, (await SendAsync(HttpMethod.Get, $"{Investigators}/mine", "inv-stranger")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await SendAsync(HttpMethod.Get, $"{Investigators}/mine/character-sheet", Keeper)).StatusCode);
    }
}
