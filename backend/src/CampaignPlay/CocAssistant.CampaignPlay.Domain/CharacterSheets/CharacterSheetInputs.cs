namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>The rolls the Player entered for one EDU improvement check (section 3.2).</summary>
public sealed record EduImprovementCheckInput(int? Check, int? Gain);

/// <summary>
/// Everything the Player enters for a Character Sheet, with dice results as raw totals. Dice results become Roll
/// Records through an <see cref="IRollSource"/>.
/// </summary>
public sealed record CharacterSheetInputs(
    InvestigatorIdentity Identity,
    CreationMethod? CreationMethod,
    CharacteristicValues AssignedCharacteristics,
    CharacteristicValues AgeDeductions,
    IReadOnlyList<EduImprovementCheckInput> EduImprovementChecks,
    IReadOnlyList<int?> LuckRolls,
    CharacteristicValues? CharacteristicRolls = null,
    OccupationSelection? Occupation = null,
    IReadOnlyList<SkillAllocation>? SkillAllocations = null,
    QuickFireSkills? QuickFire = null)
{
    public CharacterSheet ToCharacterSheet(IRollSource rollSource)
    {
        // Section 2.1: each Standard Rolling characteristic roll is a dice result of its own.
        var characteristicRolls = CharacteristicRolls ?? CharacteristicValues.Empty;
        var characteristicRecords = CharacteristicCodes.All.Select(characteristic => rollSource.Record(
            RollPurposes.Characteristic(characteristic),
            StandardRolling.FormulaFor(characteristic).Dice,
            characteristicRolls[characteristic]));

        var luckRecords = new[]
        {
            rollSource.Record(RollPurposes.Luck, CreationDice.Luck, LuckRolls.ElementAtOrDefault(0)),
            rollSource.Record(RollPurposes.LuckSecondRoll, CreationDice.Luck, LuckRolls.ElementAtOrDefault(1)),
        };

        var eduRecords = EduImprovementChecks.SelectMany((check, index) => new[]
        {
            rollSource.Record(RollPurposes.EduImprovementCheck(index + 1), CreationDice.EduImprovementCheck, check.Check),
            rollSource.Record(RollPurposes.EduImprovementGain(index + 1), CreationDice.EduImprovementGain, check.Gain),
        });

        var rollRecords = characteristicRecords.Concat(luckRecords).Concat(eduRecords).OfType<RollRecord>().ToList();
        return new CharacterSheet(
            Identity,
            CreationMethod,
            AssignedCharacteristics,
            AgeDeductions,
            rollRecords,
            Occupation,
            SkillAllocations ?? [],
            QuickFire ?? QuickFireSkills.Empty);
    }
}
