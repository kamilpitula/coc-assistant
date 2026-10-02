# Load game-rule catalogs as embedded resources behind an era-keyed rule-data port

Status: Accepted

Character Sheets need verified rule data at runtime, such as the Occupation catalog, and that data must not be maintained twice ([docs/game-rules/README.md](../game-rules/README.md), "Rule data that code needs at runtime"). The catalogs live in `docs/game-rules/catalogs/`, and each one is keyed by Era ([project_ruleset.md section 1](../game-rules/project_ruleset.md#1-supported-eras)). The Application layer depends on the port `IEraRuleData`, which has one instance per Era. Infrastructure implements it with `EmbeddedResourceEraRuleData`, which reads the catalog files compiled into `CocAssistant.CampaignPlay.Infrastructure` as `<EmbeddedResource>` items linked from `docs/game-rules/catalogs/`. Each file is parsed once, on first use, and checked against the catalog name, schema version, and Era.

## Considered Options
- A linked `<Content>` item copied to the output folder, read from `AppContext.BaseDirectory`. Rejected: every host and test project depends on that copy happening, and a missing copy is only found at runtime.
- Resolving the repository path at runtime. Rejected: no repository exists in a deployed container.
- An MSBuild copy target. Rejected: it adds custom build logic for what an item type already does.
- Embedded resource behind a port (chosen).

## Consequences
- The data has one source (`docs/game-rules/catalogs/`) and ships inside the assembly. It works the same under `dotnet run`, test hosts, and a future container image.
- An explicit (non-wildcard) include makes the build fail if a catalog is moved or renamed.
- Changing a catalog needs a rebuild and redeploy. CI path filters therefore treat `docs/game-rules/**` as a backend change.
- Adding an Era means adding its catalogs, an `Era` value, and one `IEraRuleData` registration. An integration test checks that every supported Era has registered rule data.
- Further catalogs, such as skills and wealth, should be added to the same port and loaded the same way once code needs them.
