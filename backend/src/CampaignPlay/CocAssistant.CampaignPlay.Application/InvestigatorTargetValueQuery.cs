namespace CocAssistant.CampaignPlay.Application;

/// <summary>Why target values cannot be read: the target is unknown or under-specified, or the Investigator is not Approved.</summary>
public enum TargetValueRefusal
{
    UnknownTarget,
    SpecializationRequired,
    SpecializationNotAllowed,
    InvestigatorNotApproved,
}

/// <summary>What a Roll Request can ask for: a catalog skill (plus optional specialization), a characteristic, or Luck.</summary>
public enum RollTargetKind
{
    Skill,
    Characteristic,
    Luck,
}

/// <summary>A Roll Request target as the target-value query reads it. The Skill is set only for <see cref="RollTargetKind.Skill"/>.</summary>
public sealed record RollRequestTarget(RollTargetKind Kind, SkillReference? Skill = null, Characteristic? Characteristic = null);

/// <summary>One Investigator's snapshot target value: the value, whether it fell back to the catalog base, and whether a success can earn an experience check.</summary>
public sealed record InvestigatorTargetValue(Guid InvestigatorId, int Value, bool UsesBaseValue, bool CanEarnExperienceCheck);

/// <summary>The target-value result: the refusal, or one value per requested Investigator in the requested order.</summary>
public sealed record TargetValueResult(TargetValueRefusal? Refusal, IReadOnlyList<InvestigatorTargetValue> Values);

/// <summary>
/// Provider query for Scene Play (ADR 0008, ADR 0024): the target values of Approved Investigators in one Campaign, read
/// from their Character Sheets under the Campaign's Era. A skill the sheet lacks gives the catalog base (character rules
/// section 6.1); Credit Rating and Cthulhu Mythos never earn an experience check (section 16.1); non-skill targets never do.
/// No authorization: the caller already authorized the use case.
/// </summary>
public class InvestigatorTargetValueQuery
{
    private readonly IInvestigatorRepository _investigators;
    private readonly CreationRuleSets _ruleSets;

    public InvestigatorTargetValueQuery(IInvestigatorRepository investigators, CreationRuleSets ruleSets)
    {
        _investigators = investigators;
        _ruleSets = ruleSets;
    }

    public async Task<TargetValueResult> QueryAsync(
        Campaign campaign,
        RollRequestTarget target,
        IReadOnlyList<Guid> investigatorIds,
        CancellationToken cancellationToken)
    {
        var rules = _ruleSets.For(campaign.Era);
        var reading = ResolveTarget(target, rules);
        if (reading.Refusal is not null)
        {
            return new TargetValueResult(reading.Refusal, []);
        }

        var investigators = await _investigators.ListForCampaignAsync(campaign.Id, cancellationToken);
        var calculator = new CharacterSheetCalculator(rules);
        var values = new List<InvestigatorTargetValue>();
        foreach (var investigatorId in investigatorIds)
        {
            var investigator = investigators.FirstOrDefault(candidate => candidate.Id == investigatorId);
            if (investigator is null || investigator.Status != InvestigatorStatus.Approved)
            {
                return new TargetValueResult(TargetValueRefusal.InvestigatorNotApproved, []);
            }

            values.Add(reading.Read!(investigatorId, investigator.CharacterSheet, calculator.Calculate(investigator.CharacterSheet)));
        }

        return new TargetValueResult(null, values);
    }

    private static TargetReading ResolveTarget(RollRequestTarget target, CreationRuleSet rules) =>
        target.Kind switch
        {
            RollTargetKind.Skill when target.Skill is null => TargetReading.Refused(TargetValueRefusal.UnknownTarget),
            RollTargetKind.Skill => ResolveSkill(target.Skill!, rules),
            RollTargetKind.Characteristic when target.Characteristic is null => TargetReading.Refused(TargetValueRefusal.UnknownTarget),
            RollTargetKind.Characteristic => TargetReading.Known((investigatorId, sheet, computation) =>
                new InvestigatorTargetValue(
                    investigatorId,
                    computation.FinalCharacteristics[target.Characteristic!.Value]
                        ?? CharacterSheetCalculator.AssignedValuesOf(sheet)[target.Characteristic!.Value]
                        ?? throw new InvalidOperationException($"The {target.Characteristic} characteristic has no value."),
                    UsesBaseValue: false,
                    CanEarnExperienceCheck: false)),
            RollTargetKind.Luck => TargetReading.Known((investigatorId, sheet, computation) =>
                new InvestigatorTargetValue(
                    investigatorId,
                    computation.Derived.Luck ?? throw new InvalidOperationException("An Approved Investigator always has a Luck value."),
                    UsesBaseValue: false,
                    CanEarnExperienceCheck: false)),
            _ => TargetReading.Refused(TargetValueRefusal.UnknownTarget),
        };

    private static TargetReading ResolveSkill(SkillReference skill, CreationRuleSet rules)
    {
        var resolution = SkillBases.Resolve(skill, rules);
        var refusal = resolution.Kind switch
        {
            SkillResolutionKind.Unknown => (TargetValueRefusal?)TargetValueRefusal.UnknownTarget,
            SkillResolutionKind.SpecializationRequired => TargetValueRefusal.SpecializationRequired,
            SkillResolutionKind.SpecializationNotAllowed => TargetValueRefusal.SpecializationNotAllowed,
            _ => null,
        };
        if (refusal is not null)
        {
            return TargetReading.Refused(refusal.Value);
        }

        return TargetReading.Known((investigatorId, sheet, computation) =>
        {
            var row = computation.SkillRowOf(skill);
            var baseValue = resolution.Base?.For(computation.FinalCharacteristics);
            var value = row?.Value ?? baseValue
                ?? throw new InvalidOperationException($"The {skill.DisplayName} skill has no value.");
            return new InvestigatorTargetValue(
                investigatorId,
                value,
                UsesBaseValue: baseValue is not null && value == baseValue,
                CanEarnExperienceCheck: !skill.IsSkill(SkillReference.CreditRatingName) && !skill.IsSkill(SkillReference.CthulhuMythosName));
        });
    }

    private sealed record TargetReading(
        TargetValueRefusal? Refusal,
        Func<Guid, CharacterSheet, CharacterSheetComputation, InvestigatorTargetValue>? Read)
    {
        public static TargetReading Refused(TargetValueRefusal refusal) => new(refusal, null);

        public static TargetReading Known(Func<Guid, CharacterSheet, CharacterSheetComputation, InvestigatorTargetValue> read) => new(null, read);
    }
}
