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
        IReadOnlyList<RequestedRollInput>? investigators = null,
        RollRequestVisibility visibility = RollRequestVisibility.Public,
        IDiceRoller? dice = null,
        Guid? keeper = null) =>
        RollRequest.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            target ?? SpotHidden,
            message,
            visibility,
            difficulty,
            bonusDice,
            penaltyDice,
            investigators ?? [Input(Harvey)],
            Present,
            Now,
            dice ?? new ScriptedRoller(),
            keeper ?? Roller);

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
            Now,
            new ScriptedRoller(),
            Roller);

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
    public void Given_KeeperOnly_When_creating_Then_every_roll_is_rolled_at_creation_with_the_Keeper_as_roller()
    {
        var creation = Create(
            message: "Something moves upstairs.",
            investigators: [Input(Harvey, 60), Input(Lucy, 30)],
            visibility: RollRequestVisibility.KeeperOnly,
            dice: new ScriptedRoller(2, 5, 4, 6));

        Assert.Equal(RollRequestCreationOutcome.Created, creation.Outcome);
        var request = creation.Request!;
        Assert.All(request.RequestedRolls, roll => Assert.Equal(RequestedRollStatus.Rolled, roll.Status));
        var harvey = request.RequestedRolls[0];
        var harveyRecord = Assert.Single(harvey.RollRecords);
        Assert.Equal($"RollRequest:{request.Id}:{Harvey}", harveyRecord.Purpose);
        Assert.Equal(25, harveyRecord.Result);
        Assert.Equal(Roller, harveyRecord.RolledByAccountId);
        Assert.Equal(request.CreatedAt, harveyRecord.RolledAt);
        var lucy = request.RequestedRolls[1];
        var lucyRecord = Assert.Single(lucy.RollRecords);
        Assert.Equal($"RollRequest:{request.Id}:{Lucy}", lucyRecord.Purpose);
        Assert.Equal(Roller, lucyRecord.RolledByAccountId);
        Assert.Equal(request.CreatedAt, lucyRecord.RolledAt);
    }

    [Fact]
    public void Given_Public_When_creating_Then_every_roll_stays_waiting_and_no_dice_are_drawn()
    {
        var creation = Create(investigators: [Input(Harvey), Input(Lucy)]);

        Assert.Equal(RollRequestCreationOutcome.Created, creation.Outcome);
        Assert.All(creation.Request!.RequestedRolls, roll => Assert.Equal((RequestedRollStatus.Waiting, 0), (roll.Status, roll.RollRecords.Count)));
    }

    [Fact]
    public void Given_a_refused_KeeperOnly_creation_When_creating_Then_it_is_refused_and_no_dice_are_drawn()
    {
        var creation = Create(investigators: [Input(Harvey), Input(Harvey)], visibility: RollRequestVisibility.KeeperOnly);

        Assert.Equal(RollRequestCreationOutcome.DuplicateInvestigator, creation.Outcome);
        Assert.Null(creation.Request);
    }

    [Fact]
    public void Given_a_hidden_skill_success_When_creating_Then_it_earns_an_experience_check_like_a_Public_one()
    {
        var creation = Create(visibility: RollRequestVisibility.KeeperOnly, dice: new ScriptedRoller(2, 5));

        Assert.Equal(RollRequestCreationOutcome.Created, creation.Outcome);
        var record = Assert.Single(Assert.Single(creation.Request!.RequestedRolls).RollRecords);
        Assert.Equal(25, record.Result);
        Assert.True(record.EarnsExperienceCheck);
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

    [Fact]
    public void Given_a_waiting_roll_When_cancelling_Then_it_is_cancelled_and_bumps_the_version()
    {
        var request = Create().Request!;

        var outcome = request.CancelInvestigatorRoll(Harvey);

        Assert.Equal(RequestedRollOutcome.Cancelled, outcome.Outcome);
        Assert.Equal(RequestedRollStatus.Cancelled, outcome.Roll!.Status);
        Assert.Equal(1, outcome.Roll.Version);
        Assert.Empty(outcome.Roll.RollRecords);
    }

    [Fact]
    public void Given_a_rolled_roll_When_cancelling_Then_it_is_refused_and_changes_nothing()
    {
        var request = Create().Request!;
        var rolled = request.RollInvestigatorRoll(new ScriptedRoller(2, 5), Harvey, Roller, Now);

        var outcome = request.CancelInvestigatorRoll(Harvey);

        Assert.Equal(RequestedRollOutcome.NotWaiting, outcome.Outcome);
        Assert.Null(outcome.Roll);
        Assert.Equal(RequestedRollStatus.Rolled, rolled.Roll!.Status);
        Assert.Equal(1, rolled.Roll.Version);
        Assert.Single(rolled.Roll.RollRecords);
    }

    [Fact]
    public void Given_a_cancelled_roll_When_cancelling_Then_it_is_refused_as_already_cancelled()
    {
        var request = Create().Request!;
        request.CancelInvestigatorRoll(Harvey);

        var outcome = request.CancelInvestigatorRoll(Harvey);

        Assert.Equal(RequestedRollOutcome.AlreadyCancelled, outcome.Outcome);
        Assert.Null(outcome.Roll);
    }

    [Fact]
    public void Given_a_cancelled_roll_When_rolling_Then_it_is_refused_as_already_cancelled_and_adds_no_roll_record()
    {
        var request = Create().Request!;
        var cancelled = request.CancelInvestigatorRoll(Harvey);

        var outcome = request.RollInvestigatorRoll(new ScriptedRoller(2, 5), Harvey, Roller, Now);

        Assert.Equal(RequestedRollOutcome.AlreadyCancelled, outcome.Outcome);
        Assert.Null(outcome.Roll);
        Assert.Equal(RequestedRollStatus.Cancelled, cancelled.Roll!.Status);
        Assert.Empty(cancelled.Roll.RollRecords);
    }

    [Fact]
    public void Given_an_unknown_investigator_When_cancelling_Then_it_is_refused()
    {
        var request = Create().Request!;

        var outcome = request.CancelInvestigatorRoll(Guid.NewGuid());

        Assert.Equal(RequestedRollOutcome.InvestigatorNotRequested, outcome.Outcome);
        Assert.Null(outcome.Roll);
    }

    [Fact]
    public void Given_matching_and_other_rolls_When_closing_for_a_scene_exit_Then_only_the_matching_waiting_rolls_cancel()
    {
        var request = Create(investigators: [Input(Harvey), Input(Lucy)]).Request!;
        request.RollInvestigatorRoll(new ScriptedRoller(2, 5), Lucy, Roller, Now);

        var closed = request.CloseRollsForSceneExit(investigatorId => investigatorId == Harvey);

        Assert.Equal([Harvey], closed);
        Assert.Equal(RequestedRollStatus.Cancelled, request.RequestedRolls[0].Status);
        Assert.Equal(RequestedRollStatus.Rolled, request.RequestedRolls[1].Status);
    }

    [Fact]
    public void Given_no_matching_waiting_roll_When_closing_for_a_scene_exit_Then_nothing_changes()
    {
        var request = Create(investigators: [Input(Harvey)]).Request!;

        var closed = request.CloseRollsForSceneExit(_ => false);

        Assert.Empty(closed);
        Assert.Equal(RequestedRollStatus.Waiting, request.RequestedRolls[0].Status);
    }
}
