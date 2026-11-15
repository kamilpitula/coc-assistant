namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Pushing a Requested Roll (specs/roll-requests/spec.md, Requested Roll status; skill rolls section 6): asking with a
/// justification, the Keeper approving or declining, and the pushed roll as a second Roll Record.
/// </summary>
public class RollRequestPushTests
{
    private static readonly Guid Harvey = SceneStartExtensions.Harvey;
    private static readonly Guid Lucy = SceneStartExtensions.Lucy;
    private static readonly Guid[] Present = [Harvey, Lucy];

    private static readonly DateTimeOffset Now = new(2026, 11, 12, 12, 0, 0, TimeSpan.Zero);
    private static readonly Guid Roller = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");

    private static readonly RollTarget SpotHidden = new(RollTargetKind.Skill, skill: "Spot Hidden");

    private static RollRequest FailedRequest(
        RollTarget? target = null,
        RollRequestVisibility visibility = RollRequestVisibility.Public) =>
        Create(target ?? SpotHidden, visibility, dice: new ScriptedRoller(8, 1));

    private static RollRequest Create(
        RollTarget target,
        RollRequestVisibility visibility,
        IDiceRoller dice,
        int targetValue = 60)
    {
        var creation = RollRequest.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            target,
            "Something moves upstairs.",
            visibility,
            Difficulty.Regular,
            0,
            0,
            [new RequestedRollInput(Harvey, targetValue, UsesBaseValue: false, CanEarnExperienceCheck: true)],
            Present,
            Now,
            dice,
            Roller);
        Assert.Equal(RollRequestCreationOutcome.Created, creation.Outcome);
        var request = creation.Request!;
        if (visibility == RollRequestVisibility.Public)
        {
            request.RollInvestigatorRoll(dice, Harvey, Roller, Now);
        }

        return request;
    }

    [Fact]
    public void Given_a_failed_roll_When_asking_to_push_Then_it_moves_to_push_asked_with_the_trimmed_justification_skill_rolls_section_6()
    {
        var request = FailedRequest();

        var result = request.AskToPushInvestigatorRoll(Harvey, "  I search every shelf through the night.  ");

        Assert.Equal(RequestedRollOutcome.PushAsked, result.Outcome);
        var roll = result.Roll!;
        Assert.Equal(RequestedRollStatus.PushAsked, roll.Status);
        Assert.Equal("I search every shelf through the night.", roll.PushJustification);
        Assert.True(roll.HasBeenPushed);
        Assert.Equal(2, roll.Version);
    }

    [Fact]
    public void Given_a_justification_at_the_limit_When_asking_to_push_Then_it_is_stored()
    {
        var request = FailedRequest();

        var result = request.AskToPushInvestigatorRoll(Harvey, new string('x', 2000));

        Assert.Equal(RequestedRollOutcome.PushAsked, result.Outcome);
        Assert.Equal(2000, result.Roll!.PushJustification!.Length);
    }

    [Fact]
    public void Given_a_missing_justification_When_asking_to_push_Then_it_is_required()
    {
        var request = FailedRequest();

        Assert.Equal(RequestedRollOutcome.JustificationRequired, request.AskToPushInvestigatorRoll(Harvey, "   ").Outcome);
        Assert.Equal(RequestedRollStatus.Rolled, request.RequestedRolls[0].Status);
    }

    [Fact]
    public void Given_a_justification_over_2000_characters_When_asking_to_push_Then_it_is_too_long()
    {
        var request = FailedRequest();

        Assert.Equal(RequestedRollOutcome.JustificationTooLong, request.AskToPushInvestigatorRoll(Harvey, new string('x', 2001)).Outcome);
        Assert.Equal(RequestedRollStatus.Rolled, request.RequestedRolls[0].Status);
    }

    [Fact]
    public void Given_a_waiting_roll_When_asking_to_push_Then_it_is_not_pushable()
    {
        var creation = RollRequest.Create(
            Guid.NewGuid(), Guid.NewGuid(), SpotHidden, null, RollRequestVisibility.Public, Difficulty.Regular, 0, 0,
            [new RequestedRollInput(Harvey, 60, false, true)], Present, Now, new ScriptedRoller(), Roller);
        var request = creation.Request!;

        Assert.Equal(RequestedRollOutcome.NotPushable, request.AskToPushInvestigatorRoll(Harvey, "Trying again.").Outcome);
    }

    [Fact]
    public void Given_a_successful_roll_When_asking_to_push_Then_it_is_not_pushable_skill_rolls_section_6()
    {
        var request = Create(SpotHidden, RollRequestVisibility.Public, new ScriptedRoller(2, 5));

        Assert.Equal(RequestedRollOutcome.NotPushable, request.AskToPushInvestigatorRoll(Harvey, "Trying again.").Outcome);
    }

    [Fact]
    public void Given_a_luck_roll_When_asking_to_push_Then_it_is_not_pushable_skill_rolls_section_7()
    {
        var request = FailedRequest(new RollTarget(RollTargetKind.Luck));

        Assert.Equal(RequestedRollOutcome.NotPushable, request.AskToPushInvestigatorRoll(Harvey, "Trying again.").Outcome);
    }

    [Fact]
    public void Given_a_hidden_roll_When_asking_to_push_Then_it_is_not_pushable()
    {
        var request = FailedRequest(visibility: RollRequestVisibility.KeeperOnly);

        Assert.Equal(RequestedRollOutcome.NotPushable, request.AskToPushInvestigatorRoll(Harvey, "Trying again.").Outcome);
    }

    [Fact]
    public void Given_a_push_asked_roll_When_approving_Then_it_moves_to_pushed_with_the_approved_dice_skill_rolls_section_6()
    {
        var request = FailedRequest();
        Assert.Equal(RequestedRollOutcome.PushAsked, request.AskToPushInvestigatorRoll(Harvey, "Trying again.").Outcome);

        var result = request.ApprovePushInvestigatorRoll(Harvey, bonusDice: 1, penaltyDice: 0);

        Assert.Equal(RequestedRollOutcome.Pushed, result.Outcome);
        var roll = result.Roll!;
        Assert.Equal(RequestedRollStatus.Pushed, roll.Status);
        Assert.Equal((1, 0), (roll.PushBonusDice, roll.PushPenaltyDice));
        Assert.Equal((0, 0), (roll.BonusDice, roll.PenaltyDice));
    }

    [Fact]
    public void Given_approved_dice_outside_0_and_2_When_approving_Then_the_dice_are_invalid_skill_rolls_section_5()
    {
        var request = FailedRequest();
        Assert.Equal(RequestedRollOutcome.PushAsked, request.AskToPushInvestigatorRoll(Harvey, "Trying again.").Outcome);

        Assert.Equal(RequestedRollOutcome.InvalidDice, request.ApprovePushInvestigatorRoll(Harvey, 3, 0).Outcome);
        Assert.Equal(RequestedRollOutcome.InvalidDice, request.ApprovePushInvestigatorRoll(Harvey, 0, -1).Outcome);
        Assert.Equal(RequestedRollStatus.PushAsked, request.RequestedRolls[0].Status);
    }

    [Fact]
    public void Given_a_roll_that_was_never_asked_When_approving_or_declining_Then_it_is_not_push_asked()
    {
        var request = FailedRequest();

        Assert.Equal(RequestedRollOutcome.NotPushAsked, request.ApprovePushInvestigatorRoll(Harvey, 0, 0).Outcome);
        Assert.Equal(RequestedRollOutcome.NotPushAsked, request.DeclinePushInvestigatorRoll(Harvey).Outcome);
        Assert.Equal(RequestedRollStatus.Rolled, request.RequestedRolls[0].Status);
    }

    [Fact]
    public void Given_a_push_asked_roll_When_declining_Then_it_moves_back_to_rolled_and_counts_as_pushed_project_ruleset_section_410()
    {
        var request = FailedRequest();
        Assert.Equal(RequestedRollOutcome.PushAsked, request.AskToPushInvestigatorRoll(Harvey, "Trying again.").Outcome);

        var result = request.DeclinePushInvestigatorRoll(Harvey);

        Assert.Equal(RequestedRollOutcome.PushDeclined, result.Outcome);
        var roll = result.Roll!;
        Assert.Equal(RequestedRollStatus.Rolled, roll.Status);
        Assert.Single(roll.RollRecords);
        Assert.Equal("Trying again.", roll.PushJustification);
        Assert.False(request.CanBePushed(roll));
        Assert.Equal(RequestedRollOutcome.NotPushable, request.AskToPushInvestigatorRoll(Harvey, "Trying once more.").Outcome);
    }

    [Fact]
    public void Given_a_pushed_roll_When_rolling_Then_a_second_record_uses_the_approved_dice_and_the_same_target_skill_rolls_section_6()
    {
        var request = FailedRequest();
        Assert.Equal(RequestedRollOutcome.PushAsked, request.AskToPushInvestigatorRoll(Harvey, "Trying again.").Outcome);
        Assert.Equal(RequestedRollOutcome.Pushed, request.ApprovePushInvestigatorRoll(Harvey, bonusDice: 1, penaltyDice: 0).Outcome);

        var result = request.RollInvestigatorRoll(new ScriptedRoller(1, 2, 5), Harvey, Roller, Now.AddHours(1));

        Assert.Equal(RequestedRollOutcome.Rolled, result.Outcome);
        var roll = result.Roll!;
        Assert.Equal(RequestedRollStatus.Rolled, roll.Status);
        Assert.Equal(2, roll.RollRecords.Count);
        var pushed = roll.RollRecords[1];
        Assert.Equal($"RollRequest:{request.Id}:{Harvey}{RequestedRoll.PushPurposeSuffix}", pushed.Purpose);
        Assert.Equal(15, pushed.Result);
        Assert.Equal(60, pushed.Percentile!.TargetValue);
        Assert.Equal(Difficulty.Regular, pushed.Percentile.Difficulty);
        Assert.Equal((1, 0), (pushed.Percentile.BonusDice, pushed.Percentile.PenaltyDice));
        Assert.False(pushed.EarnsExperienceCheck);
        Assert.Equal(RequestedRollOutcome.NotWaiting, request.RollInvestigatorRoll(new ScriptedRoller(1, 5), Harvey, Roller, Now.AddHours(2)).Outcome);
    }

    [Fact]
    public void Given_a_pushed_roll_When_the_scene_exits_Then_it_is_cancelled_and_keeps_its_first_result()
    {
        var request = FailedRequest();
        Assert.Equal(RequestedRollOutcome.PushAsked, request.AskToPushInvestigatorRoll(Harvey, "Trying again.").Outcome);
        Assert.Equal(RequestedRollOutcome.Pushed, request.ApprovePushInvestigatorRoll(Harvey, 0, 0).Outcome);

        var closed = request.CloseRollsForSceneExit(_ => true);

        Assert.Equal([Harvey], closed);
        var roll = request.RequestedRolls[0];
        Assert.Equal(RequestedRollStatus.Cancelled, roll.Status);
        Assert.Single(roll.RollRecords);
    }

    [Fact]
    public void Given_a_push_asked_roll_When_the_scene_exits_Then_it_moves_back_to_rolled_declined()
    {
        var request = FailedRequest();
        Assert.Equal(RequestedRollOutcome.PushAsked, request.AskToPushInvestigatorRoll(Harvey, "Trying again.").Outcome);

        var closed = request.CloseRollsForSceneExit(_ => true);

        Assert.Equal([Harvey], closed);
        var roll = request.RequestedRolls[0];
        Assert.Equal(RequestedRollStatus.Rolled, roll.Status);
        Assert.Single(roll.RollRecords);
        Assert.Equal("Trying again.", roll.PushJustification);
    }

    [Fact]
    public void Given_rolled_and_cancelled_rolls_When_the_scene_exits_Then_they_are_unchanged()
    {
        var request = FailedRequest();

        Assert.Equal([], request.CloseRollsForSceneExit(_ => true));
        Assert.Equal(RequestedRollStatus.Rolled, request.RequestedRolls[0].Status);
    }
}
