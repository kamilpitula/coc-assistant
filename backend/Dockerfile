# Builds the API container image. The repository root is the build context: game-rule catalogs are embedded
# from docs/game-rules/catalogs (ADR 0006), and backend/src holds the projects.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY global.json ./
COPY backend/Directory.Build.props backend/
COPY backend/CodeMetricsConfig.txt backend/
COPY backend/.editorconfig backend/
COPY backend/src/CocAssistant.Api/CocAssistant.Api.csproj backend/src/CocAssistant.Api/
COPY backend/src/CampaignPlay/CocAssistant.CampaignPlay.Application/CocAssistant.CampaignPlay.Application.csproj backend/src/CampaignPlay/CocAssistant.CampaignPlay.Application/
COPY backend/src/CampaignPlay/CocAssistant.CampaignPlay.Controllers/CocAssistant.CampaignPlay.Controllers.csproj backend/src/CampaignPlay/CocAssistant.CampaignPlay.Controllers/
COPY backend/src/CampaignPlay/CocAssistant.CampaignPlay.Domain/CocAssistant.CampaignPlay.Domain.csproj backend/src/CampaignPlay/CocAssistant.CampaignPlay.Domain/
COPY backend/src/CampaignPlay/CocAssistant.CampaignPlay.Infrastructure/CocAssistant.CampaignPlay.Infrastructure.csproj backend/src/CampaignPlay/CocAssistant.CampaignPlay.Infrastructure/
COPY backend/src/GameRules/CocAssistant.GameRules.Domain/CocAssistant.GameRules.Domain.csproj backend/src/GameRules/CocAssistant.GameRules.Domain/
COPY backend/src/Identity/CocAssistant.Identity.Application/CocAssistant.Identity.Application.csproj backend/src/Identity/CocAssistant.Identity.Application/
COPY backend/src/Identity/CocAssistant.Identity.Controllers/CocAssistant.Identity.Controllers.csproj backend/src/Identity/CocAssistant.Identity.Controllers/
COPY backend/src/Identity/CocAssistant.Identity.Domain/CocAssistant.Identity.Domain.csproj backend/src/Identity/CocAssistant.Identity.Domain/
COPY backend/src/Identity/CocAssistant.Identity.Infrastructure/CocAssistant.Identity.Infrastructure.csproj backend/src/Identity/CocAssistant.Identity.Infrastructure/
COPY backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Application/CocAssistant.ScenarioPreparation.Application.csproj backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Application/
COPY backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Controllers/CocAssistant.ScenarioPreparation.Controllers.csproj backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Controllers/
COPY backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Domain/CocAssistant.ScenarioPreparation.Domain.csproj backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Domain/
COPY backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Infrastructure/CocAssistant.ScenarioPreparation.Infrastructure.csproj backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Infrastructure/
COPY backend/src/ScenePlay/CocAssistant.ScenePlay.Application/CocAssistant.ScenePlay.Application.csproj backend/src/ScenePlay/CocAssistant.ScenePlay.Application/
COPY backend/src/ScenePlay/CocAssistant.ScenePlay.Controllers/CocAssistant.ScenePlay.Controllers.csproj backend/src/ScenePlay/CocAssistant.ScenePlay.Controllers/
COPY backend/src/ScenePlay/CocAssistant.ScenePlay.Infrastructure/CocAssistant.ScenePlay.Infrastructure.csproj backend/src/ScenePlay/CocAssistant.ScenePlay.Infrastructure/
RUN dotnet restore backend/src/CocAssistant.Api/CocAssistant.Api.csproj
COPY backend/src/ backend/src/
COPY docs/game-rules/catalogs/ docs/game-rules/catalogs/
RUN dotnet publish backend/src/CocAssistant.Api/CocAssistant.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "CocAssistant.Api.dll"]
