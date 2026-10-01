using Xunit;

// Integration test classes share a single LocalDB database and reset it with Respawn in InitializeAsync.
// Running them in parallel lets one class's reset wipe another's data mid-test, so serialize the whole assembly.
[assembly: CollectionBehavior(DisableTestParallelization = true)]
