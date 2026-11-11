namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The test identity authenticated as: an Entra object id, how the oid claim arrives (short "oid" or the
/// mapped URI production JwtBearer leaves on the principal), and a distinct pairwise "sub".
/// </summary>
public sealed record TestIdentity(string Oid, string OidClaimType = "oid", string? Sub = null)
{
    /// <summary>The mapped "oid" URI the JwtBearer inbound mapping leaves on a production principal (wire value).</summary>
    public const string MappedOidClaimType = "http://schemas.microsoft.com/identity/claims/objectidentifier";

    public string SubValue => Sub ?? $"{Oid}-sub";

    public static implicit operator TestIdentity(string oid) => new(oid);
}
