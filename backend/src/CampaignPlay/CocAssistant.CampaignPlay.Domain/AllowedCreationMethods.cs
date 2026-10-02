namespace CocAssistant.CampaignPlay.Domain;

/// <summary>The non-empty set of Creation Methods a Campaign allows, kept in canonical order.</summary>
public sealed class AllowedCreationMethods : IEquatable<AllowedCreationMethods>
{
    public static readonly AllowedCreationMethods All = Create(Enum.GetValues<CreationMethod>());

    private AllowedCreationMethods(IReadOnlyList<CreationMethod> methods)
    {
        Methods = methods;
    }

    public IReadOnlyList<CreationMethod> Methods { get; }

    /// <summary>Builds the set, removing duplicates; at least one defined Creation Method is required.</summary>
    public static AllowedCreationMethods Create(IEnumerable<CreationMethod> methods)
    {
        var distinct = methods.Distinct().Order().ToList();
        if (distinct.Count == 0)
        {
            throw new ArgumentException("At least one Creation Method must be allowed.", nameof(methods));
        }

        var undefined = distinct.Where(method => !Enum.IsDefined(method)).ToList();
        if (undefined.Count > 0)
        {
            throw new ArgumentOutOfRangeException(nameof(methods), undefined[0], "Unknown Creation Method.");
        }

        return new AllowedCreationMethods(distinct);
    }

    public bool Allows(CreationMethod method) => Methods.Contains(method);

    public bool Equals(AllowedCreationMethods? other) => other is not null && Methods.SequenceEqual(other.Methods);

    public override bool Equals(object? obj) => Equals(obj as AllowedCreationMethods);

    public override int GetHashCode() => Methods.Aggregate(0, (hash, method) => HashCode.Combine(hash, method));
}
