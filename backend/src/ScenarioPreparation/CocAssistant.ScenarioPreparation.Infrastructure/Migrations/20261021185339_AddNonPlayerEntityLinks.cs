using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CocAssistant.ScenarioPreparation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNonPlayerEntityLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NonPlayerEntityLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SceneId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PlayerFacingName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PlayerFacingDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    HumanNpcId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MythosCreatureId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NonPlayerEntityLinks", x => x.Id);
                    table.CheckConstraint("CK_NonPlayerEntityLinks_OneNonPlayerEntity", "(HumanNpcId IS NOT NULL AND MythosCreatureId IS NULL) OR (HumanNpcId IS NULL AND MythosCreatureId IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_NonPlayerEntityLinks_HumanNpcs_HumanNpcId",
                        column: x => x.HumanNpcId,
                        principalTable: "HumanNpcs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NonPlayerEntityLinks_MythosCreatures_MythosCreatureId",
                        column: x => x.MythosCreatureId,
                        principalTable: "MythosCreatures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NonPlayerEntityLinks_Scenes_SceneId",
                        column: x => x.SceneId,
                        principalTable: "Scenes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NonPlayerEntityLinks_HumanNpcId",
                table: "NonPlayerEntityLinks",
                column: "HumanNpcId");

            migrationBuilder.CreateIndex(
                name: "IX_NonPlayerEntityLinks_MythosCreatureId",
                table: "NonPlayerEntityLinks",
                column: "MythosCreatureId");

            migrationBuilder.CreateIndex(
                name: "IX_NonPlayerEntityLinks_SceneId",
                table: "NonPlayerEntityLinks",
                column: "SceneId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NonPlayerEntityLinks");
        }
    }
}
