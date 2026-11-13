namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Creating a Roll Request and rolling its Requested Rolls (specs/roll-requests/spec.md, Roll Request): the creation refusals,
/// the message trim, the override fallback, and the roll that happens at most once with its Roll Record.
/// </summary>
public class RollRequestTests
{
    private static readonly Guid Harvey = SceneStartExtensions.Harvey;
    private static readonly Guid Lucy = SceneStartExtensions.Lucy;
    private static readonly Guid[] Present = [Harvey, Lucy];

    private static readonly DateTimeOffset Now = new(2026, 11, 12, 12, 0, 0, TimeSpan.Zero);
    private static readonly Guid Roller = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");

    private static readonly RollTarget SpotHidden = new(RollTargetKind.Skill, skill: "Spot Hidden");

    private static RequestedRollInput Input(Guid investigator, int target = 60) =>
        new(investigator, target, UsesBaseValue: false, CanEarnExperienceCheck: true);

    private static RollRequestCreation Create(
        RollTarget? target = null,
        string? message = null,
        Difficulty difficulty = Difficulty.Regular,
        int bonusDice = 0,
        int penaltyDice = 0,
        IReadOnlyList<RequestedRollInput>? investigators = null) =>
        RollRequest.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            target ?? SpotHidden,
            message,
            RollRequestVisibility.Public,
            difficulty,
            bonusDice,
            penaltyDice,
            investigators ?? [Input(Harvey)],
            Present,
            Now);

    [Fact]
    public void Given_targets_When_creating_Then_each_value_is_snapshot_on_the_request_and_its_rolls()
    {
        var creation = RollRequest.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            new RollTarget(RollTargetKind.Characteristic, characteristic: Characteristic.Strength),
            "  Something moves upstairs.  ",
            RollRequestVisibility.Public,
            Difficulty.Hard,
            1,
            0,
            [new(Harvey, 60, false, true), new(Lucy, 30, true, false, Difficulty.Regular, 0, 1)],
            Present,
            Now);

        Assert.Equal(RollRequestCreationOutcome.Created, creation.Outcome);
        var request = creation.Request!;
        Assert.Equal("Something moves upstairs.", request.Message);
        Assert.Equal([Harvey, Lucy], request.RequestedRolls.Select(roll => roll.InvestigatorId));
        Assert.All(request.RequestedRolls, roll => Assert.Equal(RequestedRollStatus.Waiting, roll.Status));
        var harvey = request.RequestedRolls[0];
        Assert.Equal((Difficulty.Hard, 1, 0, 60, false, true), (harvey.Difficulty, harvey.BonusDice, harvey.PenaltyDice, harvey.TargetValue, harvey.UsesBaseValue, harvey.CanEarnExperienceCheck));
        var lucy = request.RequestedRolls[1];
        Assert.Equal((Difficulty.Regular, 0, 1, 30, true, false), (lucy.Difficulty, lucy.BonusDice, lucy.PenaltyDice, lucy.TargetValue, lucy.UsesBaseValue, lucy.CanEarnExperienceCheck));
    }

    [Fact]
    public void Given_no_message_When_creating_Then_the_message_is_null()
    {
        Assert.Null(Create(message: "   ").Request!.Message);
        Assert.Null(Create().Request!.Message);
    }

    [Theory]
    [InlineData(RollRequestCreationOutcome.EmptyInvestigators, 0)]
    [InlineData(RollRequestCreationOutcome.DuplicateInvestigator, 1)]
    [InlineData(RollRequestCreationOutcome.InvestigatorNotPresent, 2)]
    public void Given_a_bad_investigator_list_When_creating_Then_it_is_refused(RollRequestCreationOutcome outcome, int kind)
    {
        IReadOnlyList<RequestedRollInput> investigators = kind switch
        {
            0 => [],
            1 => [Input(Harvey), Input(Harvey)],
            _ => [Input(Guid.NewGuid())],
        };

        var creation = Create(investigators: investigators);

        Assert.Equal(outcome, creation.Outcome);
        Assert.Null(creation.Request);
    }

    [Fact]
    public void Given_a_skill_target_without_a_skill_or_a_characteristic_target_without_a_characteristic_When_creating_Then_it_is_refused()
    {
        Assert.Equal(RollRequestCreationOutcome.InvalidTarget, Create(target: new RollTarget(RollTargetKind.Skill, skill: "  ")).Outcome);
        Assert.Equal(RollRequestCreationOutcome.InvalidTarget, Create(target: new RollTarget(RollTargetKind.Characteristic)).Outcome);
    }

    [Theory]
    [InlineData(3, 0)]
    [InlineData(0, 3)]
    [InlineData(-1, 0)]
    public void Given_dice_above_two_When_creating_Then_it_is_refused_skill_rolls_section_5(int bonusDice, int penaltyDice)
    {
        Assert.Equal(RollRequestCreationOutcome.InvalidDice, Create(bonusDice: bonusDice, penaltyDice: penaltyDice).Outcome);
        Assert.Equal(
            RollRequestCreationOutcome.InvalidDice,
            Create(investigators: [new RequestedRollInput(Harvey, 60, false, true, BonusDice: bonusDice, PenaltyDice: penaltyDice)]).Outcome);
    }

    [Theory]
    [InlineData(Difficulty.Hard, 0, 0)]
    [InlineData(Difficulty.Regular, 1, 0)]
    [InlineData(Difficulty.Regular, 0, 1)]
    public void Given_a_luck_target_with_a_harder_difficulty_or_dice_When_creating_Then_it_is_refused_project_ruleset_4_8(
        Difficulty difficulty, int bonusDice, int penaltyDice)
    {
        var creation = Create(
            target: new RollTarget(RollTargetKind.Luck),
            difficulty: Difficulty.Regular,
            investigators: [new RequestedRollInput(Harvey, 50, false, false, difficulty, bonusDice, penaltyDice)]);

        Assert.Equal(RollRequestCreationOutcome.InvalidLuckTarget, creation.Outcome);
        Assert.Null(creation.Request);
    }

    [Fact]
    public void Given_a_luck_target_at_regular_with_no_dice_When_creating_Then_it_is_created()
    {
        var creation = Create(target: new RollTarget(RollTargetKind.Luck), investigators: [new RequestedRollInput(Harvey, 50, false, false)]);

        Assert.Equal(RollRequestCreationOutcome.Created, creation.Outcome);
    }

    [Fact]
    public void Given_a_message_over_the_limit_When_creating_Then_it_is_refused()
    {
        var creation = Create(message: new string('a', RollRequest.MessageMaxLength + 1));

        Assert.Equal(RollRequestCreationOutcome.MessageTooLong, creation.Outcome);
        Assert.Null(creation.Request);
    }

    [Fact]
    public void Given_a_waiting_roll_When_rolling_Then_it_is_rolled_with_one_roll_record_naming_the_roller_and_the_time()
    {
        var request = Create().Request!;

        var outcome = request.RollInvestigatorRoll(new ScriptedRoller(2, 5), Harvey, Roller, Now);

        Assert.Equal(RequestedRollOutcome.Rolled, outcome.Outcome);
        var roll = outcome.Roll!;
        Assert.Equal(RequestedRollStatus.Rolled, roll.Status);
        Assert.Equal(1, roll.Version);
        var record = Assert.Single(roll.RollRecords);
        Assert.Equal($"RollRequest:{request.Id}:{Harvey}", record.Purpose);
        Assert.Equal(RequestedRoll.RollRecordDice, record.Dice);
        Assert.Equal(25, record.Result);
        Assert.Equal(RollSource.Server, record.Source);
        Assert.Equal([20, 5], record.Faces);
        Assert.Equal(Roller, record.RolledByAccountId);
        Assert.Equal(Now, record.RolledAt);
        Assert.Equal(new PercentileRoll(60, 60, 30, 12, Difficulty.Regular, 0, 0, 5, [20], 20, 25, SuccessLevel.Hard, true), record.Percentile);
        Assert.True(record.EarnsExperienceCheck);
    }

    [Fact]
    public void Given_a_rolled_roll_When_rolling_again_Then_the_second_roll_is_refused_and_changes_nothing()
    {
        var request = Create().Request!;

        var first = request.RollInvestigatorRoll(new ScriptedRoller(2, 5), Harvey, Roller, Now);
        var second = request.RollInvestigatorRoll(new ScriptedRoller(3, 6), Harvey, Roller, Now.AddMinutes(1));

        Assert.Equal(RequestedRollOutcome.Rolled, first.Outcome);
        Assert.Equal(RequestedRollOutcome.NotWaiting, second.Outcome);
        Assert.Null(second.Roll);
        Assert.Equal(RequestedRollStatus.Rolled, first.Roll!.Status);
        Assert.Equal(1, first.Roll.Version);
        var record = Assert.Single(first.Roll.RollRecords);
        Assert.Equal(25, record.Result);
        Assert.Equal(Now, record.RolledAt);
    }
}
