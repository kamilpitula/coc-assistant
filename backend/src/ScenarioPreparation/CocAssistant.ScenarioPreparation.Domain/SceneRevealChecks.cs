namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The outcome of the subject check and, when it is <see cref="RevealOutcome.Revealed"/>, the Handout or the link that was found, with the Item that owns a revealed subject.</summary>
internal readonly record struct SubjectCheck(RevealOutcome Outcome, Handout? Handout = null, NonPlayerEntityLink? Link = null, Item? OwningItem = null);

/// <summary>
/// The checks <see cref="Scene.Reveal"/> runs before it records anything (PBI-SPL-002 D1): the subject, then the recipients. They
/// sit apart from the aggregate so the Scene stays small, and read only what the Scene hands them, so they change nothing.
/// </summary>
internal static class SceneRevealChecks
{
    /// <summary>
    /// Active, revealable subject type, subject on the Scene, and for a Handout Player-facing, in that order. A Handout is
    /// looked up on the Scene first, then on its linked Items; an Item by its id among the linked Items. Finds the Handout or
    /// the link on success, with the Item that owns a revealed Item or Item Handout; a Non-Player Entity link is always
    /// Player-facing and owned by the Scene.
    /// </summary>
    public static SubjectCheck CheckSubject(
        SceneStatus status,
        RevealSubject subject,
        IReadOnlyCollection<Handout> handouts,
        IReadOnlyCollection<NonPlayerEntityLink> links,
        IReadOnlyCollection<Item>? linkedItems = null)
    {
        if (status != SceneStatus.Active)
        {
            return new SubjectCheck(RevealOutcome.NotActive);
        }

        var items = linkedItems ?? [];
        return subject.Type switch
        {
            RevealSubjectType.Handout => CheckHandout(handouts, items, subject.Id),
            RevealSubjectType.NonPlayerEntity => CheckLink(links.FirstOrDefault(candidate => candidate.Id == subject.Id)),
            RevealSubjectType.Item => CheckItem(items.FirstOrDefault(candidate => candidate.Id == subject.Id)),
            _ => new SubjectCheck(RevealOutcome.SubjectNotRevealable),
        };
    }

    private static SubjectCheck CheckHandout(IReadOnlyCollection<Handout> handouts, IReadOnlyCollection<Item> linkedItems, Guid handoutId)
    {
        var sceneHandout = handouts.FirstOrDefault(candidate => candidate.Id == handoutId);
        if (sceneHandout is not null)
        {
            return CheckHandoutVisibility(sceneHandout, null);
        }

        foreach (var item in linkedItems)
        {
            var itemHandout = item.Handouts.FirstOrDefault(candidate => candidate.Id == handoutId);
            if (itemHandout is not null)
            {
                return CheckHandoutVisibility(itemHandout, item);
            }
        }

        return new SubjectCheck(RevealOutcome.SubjectNotFound);
    }

    private static SubjectCheck CheckHandoutVisibility(Handout handout, Item? owningItem) =>
        handout.Visibility == HandoutVisibility.PlayerFacing
            ? new SubjectCheck(RevealOutcome.Revealed, Handout: handout, OwningItem: owningItem)
            : new SubjectCheck(RevealOutcome.SubjectKeeperFacing);

    private static SubjectCheck CheckItem(Item? item) =>
        item is null ? new SubjectCheck(RevealOutcome.SubjectNotFound) : new SubjectCheck(RevealOutcome.Revealed, OwningItem: item);

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
