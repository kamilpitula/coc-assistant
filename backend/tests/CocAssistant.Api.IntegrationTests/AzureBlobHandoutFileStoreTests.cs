namespace CocAssistant.Api.IntegrationTests;

/// <summary>The Azure adapter against Azurite, held to the same contract as every other Handout file store (PBI-SP-007 D1, D7).</summary>
public class AzureBlobHandoutFileStoreTests : CocAssistant.ScenarioPreparation.Tests.HandoutFileStoreContract
{
    protected override IHandoutFileStore CreateStore() => new AzureBlobHandoutFileStore(AzuriteTestConnection.Get());

    [Fact]
    public async Task Given_a_saved_key_When_saving_it_again_Then_the_blob_is_not_overwritten()
    {
        var store = CreateStore();
        var key = Guid.NewGuid().ToString("N");
        await store.SaveAsync(key, new MemoryStream([1, 2, 3]), "image/png", CancellationToken.None);

        await Assert.ThrowsAsync<HandoutFileStoreException>(() => store.SaveAsync(key, new MemoryStream([9, 9]), "image/png", CancellationToken.None));

        await using var stream = await store.OpenReadAsync(key, CancellationToken.None);
        Assert.Equal(3, stream.Length);
    }

    [Theory]
    [InlineData(null, "UseDevelopmentStorage=true")]
    [InlineData("", "UseDevelopmentStorage=true")]
    [InlineData("UseDevelopmentStorage=true;DevelopmentStorageProxyUri=http://azurite:10000", "UseDevelopmentStorage=true;DevelopmentStorageProxyUri=http://azurite:10000")]
    public void Given_a_configured_connection_When_resolving_Then_it_wins_over_the_local_emulator(string? configured, string expected) =>
        Assert.Equal(expected, AzuriteTestConnection.Resolve(configured));
}
