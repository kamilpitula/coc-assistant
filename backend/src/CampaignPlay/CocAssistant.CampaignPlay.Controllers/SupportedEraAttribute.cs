namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>Accepts an omitted Era or the code of a supported Era (docs/game-rules/project_ruleset.md section 1).</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class SupportedEraAttribute : ValidationAttribute
{
    public SupportedEraAttribute()
        : base($"Era must be one of: {string.Join(", ", Era.Supported)}.")
    {
    }

    public override bool IsValid(object? value) => value is null || (value is string code && Era.TryParse(code, out _));
}
