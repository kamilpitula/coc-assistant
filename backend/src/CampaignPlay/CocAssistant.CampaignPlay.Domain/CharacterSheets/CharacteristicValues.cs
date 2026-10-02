namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>An optional value per characteristic; a characteristic without a value reads as null.</summary>
public sealed class CharacteristicValues : IEquatable<CharacteristicValues>
{
    public static readonly CharacteristicValues Empty = new(new Dictionary<Characteristic, int>());

    private readonly IReadOnlyDictionary<Characteristic, int> _values;

    private CharacteristicValues(IReadOnlyDictionary<Characteristic, int> values)
    {
        _values = values;
    }

    public int? this[Characteristic characteristic] =>
        _values.TryGetValue(characteristic, out var value) ? value : null;

    /// <summary>The characteristics that have a value, in rule order.</summary>
    public IReadOnlyList<Characteristic> Present => CharacteristicCodes.All.Where(_values.ContainsKey).ToList();

    /// <summary>True when all eight characteristics have a value.</summary>
    public bool IsComplete => _values.Count == CharacteristicCodes.All.Count;

    /// <summary>Builds the values, leaving out characteristics whose value is null.</summary>
    public static CharacteristicValues From(IEnumerable<KeyValuePair<Characteristic, int?>> values) =>
        new(values
            .Where(entry => entry.Value is not null)
            .ToDictionary(entry => entry.Key, entry => entry.Value!.Value));

    /// <summary>Returns a copy with one characteristic set (or cleared when null).</summary>
    public CharacteristicValues With(Characteristic characteristic, int? value) =>
        From(CharacteristicCodes.All.Select(candidate =>
            KeyValuePair.Create(candidate, candidate == characteristic ? value : this[candidate])));

    public bool Equals(CharacteristicValues? other) =>
        other is not null && CharacteristicCodes.All.All(characteristic => this[characteristic] == other[characteristic]);

    public override bool Equals(object? obj) => Equals(obj as CharacteristicValues);

    public override int GetHashCode() =>
        CharacteristicCodes.All.Aggregate(0, (hash, characteristic) => HashCode.Combine(hash, this[characteristic]));
}
