namespace CocAssistant.Identity.Tests;

/// <summary>How a caller's token claims become the Entra identity used to provision an Account.</summary>
public class EntraIdentityTests
{
    private static ClaimsPrincipal TokenWith(params (string Type, string Value)[] claims) =>
        new(new ClaimsIdentity(claims.Select(claim => new Claim(claim.Type, claim.Value)), "Bearer"));

    [Fact]
    public void Given_a_token_without_an_object_id_When_reading_the_identity_Then_there_is_none()
    {
        Assert.Null(EntraIdentity.FromClaims(TokenWith(("name", "Keeper One"))));
    }

    [Fact]
    public void Given_a_token_with_oid_name_and_email_When_reading_the_identity_Then_they_are_used()
    {
        var identity = EntraIdentity.FromClaims(TokenWith(("oid", "oid-1"), ("name", "Keeper One"), ("email", "keeper@example.com")));

        Assert.Equal(new EntraIdentity("oid-1", "Keeper One", "keeper@example.com"), identity);
    }

    [Fact]
    public void Given_a_token_with_only_a_name_identifier_When_reading_the_identity_Then_it_is_the_object_id()
    {
        var identity = EntraIdentity.FromClaims(TokenWith((ClaimTypes.NameIdentifier, "oid-2")));

        Assert.Equal("oid-2", identity!.EntraObjectId);
    }

    [Theory]
    [InlineData("unknown")]
    [InlineData("Unknown")]
    [InlineData(" ")]
    public void Given_a_placeholder_or_blank_name_When_reading_the_identity_Then_given_and_family_names_are_used(string name)
    {
        var identity = EntraIdentity.FromClaims(TokenWith(("oid", "oid-3"), ("name", name), ("given_name", "Harvey"), ("family_name", "Walters")));

        Assert.Equal("Harvey Walters", identity!.DisplayName);
    }

    [Fact]
    public void Given_only_a_given_name_When_reading_the_identity_Then_it_is_the_display_name()
    {
        var identity = EntraIdentity.FromClaims(TokenWith(("oid", "oid-4"), ("name", "unknown"), ("given_name", "Harvey")));

        Assert.Equal("Harvey", identity!.DisplayName);
    }

    [Fact]
    public void Given_no_usable_name_claim_When_reading_the_identity_Then_the_display_name_is_empty()
    {
        var identity = EntraIdentity.FromClaims(TokenWith(("oid", "oid-5"), ("name", "unknown")));

        Assert.Equal(string.Empty, identity!.DisplayName);
    }

    [Fact]
    public void Given_only_the_b2c_emails_claim_When_reading_the_identity_Then_it_is_the_email()
    {
        var identity = EntraIdentity.FromClaims(TokenWith(("oid", "oid-6"), ("emails", "player@example.com")));

        Assert.Equal("player@example.com", identity!.Email);
    }

    [Fact]
    public void Given_both_email_claims_When_reading_the_identity_Then_the_email_claim_wins()
    {
        var identity = EntraIdentity.FromClaims(TokenWith(("oid", "oid-7"), ("emails", "old@example.com"), ("email", "new@example.com")));

        Assert.Equal("new@example.com", identity!.Email);
    }

    [Fact]
    public void Given_no_email_claim_When_reading_the_identity_Then_the_email_is_empty()
    {
        var identity = EntraIdentity.FromClaims(TokenWith(("oid", "oid-8")));

        Assert.Equal(string.Empty, identity!.Email);
    }
}
