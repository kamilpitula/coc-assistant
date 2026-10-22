namespace CocAssistant.ScenarioPreparation.Tests;

public sealed class FileSystemHandoutFileStoreTests : HandoutFileStoreContract, IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "coc-handout-files-" + Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, recursive: true);
        }
    }

    protected override IHandoutFileStore CreateStore() => new FileSystemHandoutFileStore(_directory);

    [Theory]
    [InlineData("..\\evil")]
    [InlineData("../evil")]
    [InlineData("0123456789abcdef0123456789abcde")]
    [InlineData("0123456789abcdef0123456789abcdef0")]
    [InlineData("0123456789ABCDEF0123456789abcdez")]
    [InlineData("")]
    public async Task Given_a_key_that_is_not_32_hexadecimal_characters_When_using_the_store_Then_it_is_rejected_and_nothing_is_written(string key)
    {
        var store = CreateStore();

        await Assert.ThrowsAsync<HandoutFileStoreException>(() => store.SaveAsync(key, new MemoryStream([1]), "image/png", CancellationToken.None));
        await Assert.ThrowsAsync<HandoutFileStoreException>(() => store.OpenReadAsync(key, CancellationToken.None));
        await Assert.ThrowsAsync<HandoutFileStoreException>(() => store.DeleteAsync(key, CancellationToken.None));
        Assert.False(Directory.Exists(_directory) && Directory.EnumerateFileSystemEntries(_directory).Any());
    }

    [Fact]
    public async Task Given_a_saved_key_When_saving_it_again_Then_the_blob_is_not_overwritten()
    {
        var store = CreateStore();
        var key = Guid.NewGuid().ToString("N");
        await store.SaveAsync(key, new MemoryStream(HandoutFileSamples.Png()), "image/png", CancellationToken.None);

        await Assert.ThrowsAsync<HandoutFileStoreException>(() => store.SaveAsync(key, new MemoryStream([1, 2, 3]), "image/png", CancellationToken.None));

        await using var stream = await store.OpenReadAsync(key, CancellationToken.None);
        Assert.Equal(HandoutFileSamples.Png().Length, stream.Length);
    }

    [Fact]
    public async Task Given_a_store_whose_directory_is_a_file_When_saving_Then_a_store_exception_is_thrown()
    {
        var blocker = Path.Combine(Path.GetTempPath(), "coc-handout-blocker-" + Guid.NewGuid().ToString("N"));
        await File.WriteAllTextAsync(blocker, "x");
        try
        {
            var store = new FileSystemHandoutFileStore(blocker);

            await Assert.ThrowsAsync<HandoutFileStoreException>(() => store.SaveAsync(Guid.NewGuid().ToString("N"), new MemoryStream([1]), "image/png", CancellationToken.None));
        }
        finally
        {
            File.Delete(blocker);
        }
    }
}
