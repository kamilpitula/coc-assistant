namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// Stops MVC from reading the form during model binding, so an action that reads it itself can answer a too-large body with a
/// 413 instead of the 400 that [ApiController] gives a failed form read.
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
internal sealed class DisableFormValueProviderAttribute : Attribute, IResourceFilter
{
    public void OnResourceExecuting(ResourceExecutingContext context)
    {
        context.ValueProviderFactories.RemoveType<FormValueProviderFactory>();
        context.ValueProviderFactories.RemoveType<FormFileValueProviderFactory>();
        context.ValueProviderFactories.RemoveType<JQueryFormValueProviderFactory>();
    }

    public void OnResourceExecuted(ResourceExecutedContext context)
    {
    }
}
