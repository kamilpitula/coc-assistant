namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// The checks <see cref="Scene.Reveal"/> runs before it records anything (PBI-SPL-002 D1): the subject, then the recipients. They
/// sit apart from the aggregate so the Scene stays small, and read only what the Scene hands them, so they change nothing.
/// </summary>
internal static class SceneRevealChecks
{
    /// <summary>
    /// Active, revealable subject type, subject on the Scene, and for a Handout Player-facing, in that order. Finds the Handout or
    /// the link on success; a Non-Player Entity link is always Player-facing.
    /// </summary>
    public static RevealOutcome CheckSubject(
        SceneStatus status,
        RevealSubject subject,
        IReadOnlyCollection<Handout> handouts,
        IReadOnlyCollection<NonPlayerEntityLink> links,
        out Handout? handout,
        out NonPlayerEntityLink? link)
    {
        handout = null;
        link = null;
        if (status != SceneStatus.Active)
        {
            return RevealOutcome.NotActive;
        }

        if (subject.Type is not (RevealSubjectType.Handout or RevealSubjectType.NonPlayerEntity))
        {
            return RevealOutcome.SubjectNotRevealable;
        }

        if (subject.Type == RevealSubjectType.NonPlayerEntity)
        {
            link = links.FirstOrDefault(candidate => candidate.Id == subject.Id);
            return link is null ? RevealOutcome.SubjectNotFound : RevealOutcome.Revealed;
        }

        handout = handouts.FirstOrDefault(candidate => candidate.Id == subject.Id);
        if (handout is null)
        {
            return RevealOutcome.SubjectNotFound;
        }

        return handout.Visibility == HandoutVisibility.PlayerFacing ? RevealOutcome.Revealed : RevealOutcome.SubjectKeeperFacing;
    }

    /// <summary>The recipients follow the start rules: not empty, no duplicate, all present (<see cref="Scene.ValidatePresent"/>).</summary>
    public static RevealOutcome CheckRecipients(IReadOnlyCollection<Guid> recipients, IReadOnlyCollection<Guid> present) =>
        Scene.ValidatePresent(recipients, present) switch
        {
            SceneTransitionOutcome.NoInvestigatorPresent => RevealOutcome.NoRecipient,
            SceneTransitionOutcome.DuplicateInvestigator => RevealOutcome.DuplicateRecipient,
            SceneTransitionOutcome.InvestigatorNotApproved => RevealOutcome.RecipientNotPresent,
            _ => RevealOutcome.Revealed,
        };
}
