using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CocAssistant.ScenarioPreparation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRollRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RollRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CampaignId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SceneId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetKind = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TargetSkill = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    TargetSpecialization = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    TargetCharacteristic = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Message = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Visibility = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Difficulty = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    BonusDice = table.Column<int>(type: "int", nullable: false),
                    PenaltyDice = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RollRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RollRequests_Scenes_SceneId",
                        column: x => x.SceneId,
                        principalTable: "Scenes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RequestedRolls",
                columns: table => new
                {
                    RollRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvestigatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetValue = table.Column<int>(type: "int", nullable: false),
                    UsesBaseValue = table.Column<bool>(type: "bit", nullable: false),
                    CanEarnExperienceCheck = table.Column<bool>(type: "bit", nullable: false),
                    Difficulty = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    BonusDice = table.Column<int>(type: "int", nullable: false),
                    PenaltyDice = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false),
                    RollRecords = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RequestedRolls", x => new { x.RollRequestId, x.InvestigatorId });
                    table.ForeignKey(
                        name: "FK_RequestedRolls_RollRequests_RollRequestId",
                        column: x => x.RollRequestId,
                        principalTable: "RollRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RequestedRolls_InvestigatorId",
                table: "RequestedRolls",
                column: "InvestigatorId");

            migrationBuilder.CreateIndex(
                name: "IX_RollRequests_CampaignId_SceneId",
                table: "RollRequests",
                columns: new[] { "CampaignId", "SceneId" });

            migrationBuilder.CreateIndex(
                name: "IX_RollRequests_SceneId",
                table: "RollRequests",
                column: "SceneId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RequestedRolls");

            migrationBuilder.DropTable(
                name: "RollRequests");
        }
    }
}
