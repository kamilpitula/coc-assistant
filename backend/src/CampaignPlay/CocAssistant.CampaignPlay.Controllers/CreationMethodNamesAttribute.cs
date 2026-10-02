namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>Accepts an omitted list or a non-empty list of Creation Method names.</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class CreationMethodNamesAttribute : ValidationAttribute
{
    public CreationMethodNamesAttribute()
        : base($"Choose at least one of: {string.Join(", ", Enum.GetNames<CreationMethod>())}.")
    {
    }

    public override bool IsValid(object? value) =>
        value switch
        {
            null => true,
            IReadOnlyCollection<string> names => names.Count > 0 && names.All(RulesOptionsWireFormat.IsCreationMethodName),
            _ => false,
        };
}
