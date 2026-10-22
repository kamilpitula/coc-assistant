# Backend

## Running the tests locally

- Unit tests (`backend/tests/*/`) need nothing but the .NET SDK: `dotnet test backend/tests/ScenarioPreparation/CocAssistant.ScenarioPreparation.Tests`.
- The integration tests (`backend/tests/CocAssistant.Api.IntegrationTests`) need SQL Server (LocalDB by default, or `COC_SQLSERVER_CONNECTION`) and
  the Azurite blob emulator, which the Azure Handout file store contract tests run against.
  Start Azurite before running them, with Docker (`docker run -p 10000:10000 mcr.microsoft.com/azure-storage/azurite azurite-blob --blobHost 0.0.0.0`)
  or Node (`npx -p azurite azurite-blob --blobHost 127.0.0.1`). They use `UseDevelopmentStorage=true` unless `COC_AZURITE_CONNECTION` is set.
  The API tests themselves store Handout files in a temporary directory and need no Azure.

## Handout file storage

Image, Document, and Map Handouts store their file through the storage port, chosen by configuration:

- `Azure:Storage:ConnectionString` set: Azure Blob Storage, private container `handout-files`.
- Otherwise `HandoutFiles:LocalDirectory` set: files under that directory (`appsettings.Development.json` points it at `App_Data/handout-files`).
- Neither set: the first use of a Handout file fails with an error naming both keys, in every environment.
