namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>Starting Sanity: section 5.2. Cthulhu Mythos is 0 at creation (section 8; project_ruleset.md section 3).</summary>
public static class StartingSanity
{
    private const int MaximumWithoutCthulhuMythos = 99;

    public static (int Current, int Maximum) For(int power) => (power, MaximumWithoutCthulhuMythos);
}

/// <summary>Idea and Know: section 5.1, reference values read directly from INT and EDU after age effects.</summary>
public static class IdeaAndKnow
{
    public static int? Idea(int? intelligence) => intelligence;

    public static int? Know(int? education) => education;
}

/// <summary>Starting Dodge before skill points: section 5.6.</summary>
public static class DodgeBase
{
    public static int For(int dexterity) => CharacteristicLevels.For(dexterity).Hard;
}

/// <summary>Luck: section 5.5, with the number of rolls from the age bracket (section 3.1).</summary>
public static class LuckValue
{
    /// <summary>The higher of the bracket's rolls times five; null until every roll the bracket needs is entered.</summary>
    public static int? Calculate(AgeBracket bracket, IReadOnlyList<int?> rawRolls)
    {
        var needed = rawRolls.Take(bracket.LuckRolls).ToList();
        if (needed.Count < bracket.LuckRolls || needed.Any(roll => roll is null))
        {
            return null;
        }

        return needed.Max() * CreationDice.LuckMultiplier;
    }
}
