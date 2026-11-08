namespace CocAssistant.CampaignPlay.Domain.Investigators;

/// <summary>
/// A Player's character in one Campaign, holding its Character Sheet and moving through
/// Draft, Submitted, Changes Requested, and Approved (specs/campaign-play/spec.md, Investigator lifecycle).
/// Each transition returns false and changes nothing when the current status does not allow it.
/// </summary>
public class Investigator : AggregateRoot
{
    /// <summary>The longest Change Request comment a Keeper may send (specs/character-sheet/ux.md section 12).</summary>
    public const int ChangeRequestCommentMaxLength = 2000;

    public Guid Id { get; private set; }
    public Guid CampaignId { get; private set; }
    public Guid PlayerAccountId { get; private set; }
    public InvestigatorStatus Status { get; private set; }
    public CharacterSheet CharacterSheet { get; private set; }

    /// <summary>The latest Change Request comment; only the latest is kept.</summary>
    public string? ChangeRequestComment { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>Incremented on every change so racing changes surface as a conflict (ADR 0007).</summary>
    public int Version { get; private set; }

    private Investigator()
    {
        CharacterSheet = CharacterSheet.Empty;
    }

    private Investigator(Guid campaignId, Guid playerAccountId, DateTimeOffset createdAt)
    {
        Id = Guid.NewGuid();
        CampaignId = campaignId;
        PlayerAccountId = playerAccountId;
        Status = InvestigatorStatus.Draft;
        CharacterSheet = CharacterSheet.Empty;
        CreatedAt = createdAt;
        UpdatedAt = createdAt;
    }

    /// <summary>The Player may edit the Character Sheet only in Draft or Changes Requested.</summary>
    public bool CanBeEditedByPlayer => Status is InvestigatorStatus.Draft or InvestigatorStatus.ChangesRequested;

    /// <summary>"Start over" deletes the Investigator and is available only in Draft.</summary>
    public bool CanStartOver => Status == InvestigatorStatus.Draft;

    /// <summary>The Keeper sees a Draft only as "In progress", never its content.</summary>
    public bool IsVisibleToKeeper => Status != InvestigatorStatus.Draft;

    /// <summary>Creates the Player's Draft Investigator in the Campaign.</summary>
    public static Investigator Create(Guid campaignId, Guid playerAccountId, DateTimeOffset createdAt)
    {
        if (campaignId == Guid.Empty)
        {
            throw new ArgumentException("Campaign is required.", nameof(campaignId));
        }

        if (playerAccountId == Guid.Empty)
        {
            throw new ArgumentException("Player account is required.", nameof(playerAccountId));
        }

        var investigator = new Investigator(campaignId, playerAccountId, createdAt);
        investigator.Raise(new InvestigatorCreated(campaignId, investigator.Id, playerAccountId));
        return investigator;
    }

    /// <summary>
    /// Replaces the sheet with the Player's inputs. Every stored characteristic Roll Record and every Server record is
    /// kept; only the Player-entered Luck and EDU records are rebuilt. A Creation Method change after any characteristic
    /// was rolled returns false and changes nothing.
    /// </summary>
    public bool ReplaceCharacterSheet(CharacterSheet characterSheet, DateTimeOffset now)
    {
        if (!CanBeEditedByPlayer)
        {
            return false;
        }

        if (characterSheet.CreationMethod != CharacterSheet.CreationMethod && CreationLocks.Of(CharacterSheet).CreationMethod)
        {
            return false;
        }

        CharacterSheet = characterSheet with
        {
            RollRecords = [.. KeptRollRecords(CharacterSheet), .. characterSheet.RollRecords],
        };
        Touch(now);
        return true;
    }

    private static IEnumerable<RollRecord> KeptRollRecords(CharacterSheet stored) =>
        stored.RollRecords.Where(record =>
            record.Source == RollSource.Server || RollPurposes.IsCharacteristicPurpose(record.Purpose));

    /// <summary>
    /// Rolls every characteristic missing a Roll Record (specs/character-sheet/spec.md, Creation rolling). Succeeds only
    /// in Draft or Changes Requested, under Standard Rolling, while something is missing; otherwise returns false and
    /// changes nothing.
    /// </summary>
    public bool RollCharacteristics(IDiceRoller roller, Guid rolledByAccountId, DateTimeOffset now)
    {
        if (!CanBeEditedByPlayer || CharacterSheet.CreationMethod != CreationMethod.StandardRolling)
        {
            return false;
        }

        var records = CharacteristicRolling.RollMissing(CharacterSheet, roller, rolledByAccountId, now);
        if (records.Count == 0)
        {
            return false;
        }

        CharacterSheet = CharacterSheet.WithAddedRollRecords(records);
        Touch(now);
        return true;
    }

    /// <summary>Submits a Draft or Changes Requested Investigator whose Character Sheet has no errors; warnings are allowed.</summary>
    public bool Submit(IReadOnlyCollection<ValidationError> validationErrors, DateTimeOffset now)
    {
        if (!CanBeEditedByPlayer || validationErrors.Any(error => error.IsError))
        {
            return false;
        }

        Status = InvestigatorStatus.Submitted;
        Touch(now);
        Raise(new InvestigatorSubmitted(CampaignId, Id, PlayerAccountId));
        return true;
    }

    /// <summary>Character Approval: Submitted -> Approved, which means ready for play.</summary>
    public bool Approve(DateTimeOffset now)
    {
        if (Status != InvestigatorStatus.Submitted)
        {
            return false;
        }

        Status = InvestigatorStatus.Approved;
        Touch(now);
        Raise(new InvestigatorApproved(CampaignId, Id, PlayerAccountId));
        return true;
    }

    /// <summary>Submitted -> Changes Requested with a required comment of at most the maximum length.</summary>
    public bool RequestChanges(string comment, DateTimeOffset now)
    {
        if (Status != InvestigatorStatus.Submitted
            || string.IsNullOrWhiteSpace(comment)
            || comment.Length > ChangeRequestCommentMaxLength)
        {
            return false;
        }

        Status = InvestigatorStatus.ChangesRequested;
        ChangeRequestComment = comment;
        Touch(now);
        Raise(new InvestigatorChangesRequested(CampaignId, Id, PlayerAccountId));
        return true;
    }

    /// <summary>
    /// Records "start over" when the Investigator is a Draft; the caller then deletes it. Returns false and raises
    /// nothing otherwise.
    /// </summary>
    public bool StartOver()
    {
        if (!CanStartOver)
        {
            return false;
        }

        Raise(new InvestigatorStartedOver(CampaignId, Id, PlayerAccountId));
        return true;
    }

    private void Touch(DateTimeOffset now)
    {
        UpdatedAt = now;
        Version++;
    }
}
