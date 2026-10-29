namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// A child of a Reveal that names one Investigator it reached. Like <see cref="InvestigatorPresence"/>, the Investigator id is
/// not interpreted here and has no foreign key, because Investigators live in another database (ADR 0013, ADR 0024).
/// </summary>
public class RevealRecipient
{
    public Guid RevealId { get; private set; }
    public Guid InvestigatorId { get; private set; }

    private RevealRecipient()
    {
    }

    private RevealRecipient(Guid revealId, Guid investigatorId)
    {
        RevealId = revealId;
        InvestigatorId = investigatorId;
    }

    internal static RevealRecipient Create(Guid revealId, Guid investigatorId) => new(revealId, investigatorId);
}
