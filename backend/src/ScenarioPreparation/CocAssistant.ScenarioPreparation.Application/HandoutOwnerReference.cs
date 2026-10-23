namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>Names the owner of the Handouts a request is about: a Scene or an Item (PBI-SP-008 D3). The owner is in the request's Campaign or it is not found.</summary>
public abstract record HandoutOwnerReference;

/// <summary>A Scene, addressed by its Scenario and its own id (ADR 0016).</summary>
public sealed record SceneHandoutOwnerReference(Guid ScenarioId, Guid SceneId) : HandoutOwnerReference;

/// <summary>An Item of the Campaign.</summary>
public sealed record ItemHandoutOwnerReference(Guid ItemId) : HandoutOwnerReference;
