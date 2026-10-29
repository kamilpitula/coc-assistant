using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CocAssistant.ScenarioPreparation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddScenePlayPresence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Version",
                table: "Scenes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "SceneInvestigatorsPresent",
                columns: table => new
                {
                    SceneId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvestigatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SceneInvestigatorsPresent", x => new { x.SceneId, x.InvestigatorId });
                    table.ForeignKey(
                        name: "FK_SceneInvestigatorsPresent_Scenes_SceneId",
                        column: x => x.SceneId,
                        principalTable: "Scenes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Scenes_CampaignId_Active",
                table: "Scenes",
                column: "CampaignId",
                unique: true,
                filter: "[Status] = 'Active'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SceneInvestigatorsPresent");

            migrationBuilder.DropIndex(
                name: "IX_Scenes_CampaignId_Active",
                table: "Scenes");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "Scenes");
        }
    }
}
