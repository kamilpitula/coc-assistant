namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>Whether a Scene status transition or a change of Investigators present happened; a refused one changes nothing.</summary>
public enum SceneTransitionOutcome
{
    Transitioned,

    /// <summary>The Scene is not Prepared, so it cannot start. Checked before the present list.</summary>
    NotPrepared,

    /// <summary>The Scene is not Active, so it cannot finish or change who is present.</summary>
    NotActive,

    NoInvestigatorPresent,
    DuplicateInvestigator,
    InvestigatorNotApproved,
}
