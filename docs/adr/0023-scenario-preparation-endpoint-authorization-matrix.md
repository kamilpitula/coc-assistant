# Scenario Preparation endpoints are covered by an endpoint-list authorization matrix

Status: Accepted

Every Scenario Preparation endpoint is Keeper only: a Player, another Campaign's Keeper, and a request for another Campaign's material get 404, and a caller without a token gets 401 ([specs/scenario-preparation/spec.md](../../specs/scenario-preparation/spec.md), Architecture; [ADR 0013](0013-scenario-preparation-functionality-with-campaign-ownership-port.md), [ADR 0016](0016-scene-stores-its-campaign-id-beside-its-scenario-id.md)). Each controller's test class hand-rolls its own 404 checks, and verification in PBI-SP-006 found them uneven: several endpoints have no 401 test and some have no missing-Campaign case. Nothing fails when a new endpoint is added without these checks. The design is recorded in the [PBI-SP-006 design record](../scenario-preparation/issues/06-verify-manual-preparation.design.md), D3.

## Decision
- One integration test class, `ScenarioPreparationAuthorizationMatrixTests`, holds a table with one row per Scenario Preparation endpoint (HTTP method, route template, valid request body).
- A completeness test compares the table with the endpoints the app registers from the ScenarioPreparation.Controllers assembly (`EndpointDataSource`), in both directions. A new or removed endpoint fails it until the table changes.
- For each caller (no token, a Player of the Campaign, another Campaign's Keeper, the Keeper addressing a missing Campaign) one test sends every row, collects every endpoint that does not answer as expected (401 or 404), and asserts once with the full list. Each also asserts that no response contains seeded secret text and that no Scenario Preparation row or stored file changed.
- Rows carry valid bodies, so a 404 comes from the Keeper check and not from model validation.
- The per-feature tests stay. They cover behavior, id swaps inside one Campaign, and "nothing changed" for their own resources.

## Considered Options
- **Filling the gaps in each feature's own tests.** Rejected: it closes today's gaps only, and cannot prove that every endpoint is covered.
- **One `[Theory]` row per endpoint and caller.** Rejected: each row resets and seeds the database, which is slow for about four times the endpoint count, and failures are reported one at a time.
- **An endpoint-list matrix with one test per caller (chosen).**

## Consequences
- Every new Scenario Preparation endpoint must add a matrix row with a valid body; the completeness test enforces it.
- Authorization is checked in two styles: the matrix for the whole surface, the per-feature tests for behavior. This is a deliberate exception to DRY, because only a central list can prove completeness.
- Other bounded contexts, such as Scene Play, may adopt the same matrix but are not required to by this ADR.
