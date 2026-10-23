namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>An uploaded file: the client's name, its declared length, and a seekable stream of its bytes.</summary>
public sealed record HandoutUpload(string FileName, long Length, Stream Content);

/// <summary>How opening a Handout's file ended; NotFound covers every case the caller may not distinguish (ADR 0013).</summary>
public enum HandoutFileOpenOutcome
{
    Opened,
    NotFound,
    StorageFailed,
}

/// <summary>A Handout's stored bytes with their details; the caller disposes <see cref="Content"/>.</summary>
public sealed record HandoutFileDownload(HandoutFileView File, Stream Content);

/// <summary>The download when <see cref="HandoutFileOpenOutcome.Opened"/>, otherwise null.</summary>
public sealed record HandoutFileOpenResult(HandoutFileOpenOutcome Outcome, HandoutFileDownload? Download);
