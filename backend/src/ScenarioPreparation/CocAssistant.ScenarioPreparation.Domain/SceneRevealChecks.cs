namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The outcome of the subject check and, when it is <see cref="RevealOutcome.Revealed"/>, the Handout or the link that was found.</summary>
internal readonly record struct SubjectCheck(RevealOutcome Outcome, Handout? Handout = null, NonPlayerEntityLink? Link = null);

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
    public static SubjectCheck CheckSubject(
        SceneStatus status,
        RevealSubject subject,
        IReadOnlyCollection<Handout> handouts,
        IReadOnlyCollection<NonPlayerEntityLink> links)
    {
        if (status != SceneStatus.Active)
        {
            return new SubjectCheck(RevealOutcome.NotActive);
        }

        return subject.Type switch
        {
            RevealSubjectType.Handout => CheckHandout(handouts.FirstOrDefault(candidate => candidate.Id == subject.Id)),
            RevealSubjectType.NonPlayerEntity => CheckLink(links.FirstOrDefault(candidate => candidate.Id == subject.Id)),
            _ => new SubjectCheck(RevealOutcome.SubjectNotRevealable),
        };
    }

    private static SubjectCheck CheckHandout(Handout? handout)
    {
        if (handout is null)
        {
            return new SubjectCheck(RevealOutcome.SubjectNotFound);
        }

        return handout.Visibility == HandoutVisibility.PlayerFacing
            ? new SubjectCheck(RevealOutcome.Revealed, Handout: handout)
            : new SubjectCheck(RevealOutcome.SubjectKeeperFacing);
    }

    private static SubjectCheck CheckLink(NonPlayerEntityLink? link) =>
        link is null ? new SubjectCheck(RevealOutcome.SubjectNotFound) : new SubjectCheck(RevealOutcome.Revealed, Link: link);

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
