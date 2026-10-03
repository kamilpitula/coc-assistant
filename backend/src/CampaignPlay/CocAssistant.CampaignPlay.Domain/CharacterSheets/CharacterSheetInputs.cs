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
    IReadOnlyList<int?> LuckRolls)
{
    public CharacterSheet ToCharacterSheet(IRollSource rollSource)
    {
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

        var rollRecords = luckRecords.Concat(eduRecords).OfType<RollRecord>().ToList();
        return new CharacterSheet(Identity, CreationMethod, AssignedCharacteristics, AgeDeductions, rollRecords);
    }
}
