using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers()
    .AddApplicationPart(typeof(AccountController).Assembly)
    .AddApplicationPart(typeof(CampaignController).Assembly)
    .AddApplicationPart(typeof(ScenariosController).Assembly)
    .AddApplicationPart(typeof(ActiveSceneController).Assembly);
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddIdentityInfrastructure(builder.Configuration);
builder.Services.AddCampaignPlayInfrastructure(builder.Configuration);
builder.Services.AddScenarioPreparationInfrastructure(builder.Configuration);
builder.Services.AddScenePlayInfrastructure();
builder.Services.AddCampaignPlayLiveUpdates();
builder.Services.AddLiveTransport(builder.Configuration);

builder.Services
    .AddAuthentication(Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("EntraId"));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        await db.Database.MigrateAsync();
        var compaignDb = scope.ServiceProvider.GetRequiredService<CampaignPlayDbContext>();
        await compaignDb.Database.MigrateAsync();
        var scenarioPreparationDb = scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>();
        await scenarioPreparationDb.Database.MigrateAsync();
    }
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapCampaignHub();

app.Run();

public partial class Program;
