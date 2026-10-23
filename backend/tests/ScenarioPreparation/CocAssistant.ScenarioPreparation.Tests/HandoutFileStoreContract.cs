namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// What every <see cref="IHandoutFileStore"/> adapter must do (PBI-SP-007 D1, ADR 0021). Run against the filesystem adapter
/// everywhere and against the Azure adapter with Azurite; each adapter's test class supplies the store.
/// </summary>
public abstract class HandoutFileStoreContract
{
    protected abstract IHandoutFileStore CreateStore();

    private static string NewKey() => Guid.NewGuid().ToString("N");

    private static async Task<byte[]> ReadAllAsync(IHandoutFileStore store, string key)
    {
        await using var stream = await store.OpenReadAsync(key, CancellationToken.None);
        using var copy = new MemoryStream();
        await stream.CopyToAsync(copy);
        return copy.ToArray();
    }

    [Fact]
    public async Task Given_saved_bytes_When_reading_the_key_Then_the_same_bytes_are_returned()
    {
        var store = CreateStore();
        var key = NewKey();
        var bytes = HandoutFileSamples.Png();

        await store.SaveAsync(key, new MemoryStream(bytes), "image/png", CancellationToken.None);

        Assert.Equal(bytes, await ReadAllAsync(store, key));
    }

    [Fact]
    public async Task Given_a_large_file_When_saving_and_reading_Then_every_byte_round_trips()
    {
        var store = CreateStore();
        var key = NewKey();
        var bytes = new byte[3 * 1024 * 1024 + 17];
        new Random(7).NextBytes(bytes);

        await store.SaveAsync(key, new MemoryStream(bytes), "application/pdf", CancellationToken.None);

        Assert.Equal(bytes, await ReadAllAsync(store, key));
    }

    [Fact]
    public async Task Given_a_deleted_key_When_reading_Then_a_store_exception_is_thrown()
    {
        var store = CreateStore();
        var key = NewKey();
        await store.SaveAsync(key, new MemoryStream(HandoutFileSamples.Png()), "image/png", CancellationToken.None);

        await store.DeleteAsync(key, CancellationToken.None);

        await Assert.ThrowsAsync<HandoutFileStoreException>(() => store.OpenReadAsync(key, CancellationToken.None));
    }

    [Fact]
    public async Task Given_a_key_that_was_never_saved_When_deleting_Then_nothing_is_thrown_and_it_can_be_repeated()
    {
        var store = CreateStore();
        var key = NewKey();

        await store.DeleteAsync(key, CancellationToken.None);
        await store.DeleteAsync(key, CancellationToken.None);
    }

    [Fact]
    public async Task Given_a_key_that_was_never_saved_When_reading_Then_a_store_exception_is_thrown()
    {
        var store = CreateStore();

        await Assert.ThrowsAsync<HandoutFileStoreException>(() => store.OpenReadAsync(NewKey(), CancellationToken.None));
    }
}
