using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CocAssistant.ScenarioPreparation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "SceneId",
                table: "Handouts",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<Guid>(
                name: "ItemId",
                table: "Handouts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CampaignId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PlayerFacingDescription = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    KeeperNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Items", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ItemLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SceneId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItemLinks_Items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "Items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ItemLinks_Scenes_SceneId",
                        column: x => x.SceneId,
                        principalTable: "Scenes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Handouts_ItemId_Position",
                table: "Handouts",
                columns: new[] { "ItemId", "Position" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Handouts_OneOwner",
                table: "Handouts",
                sql: "(SceneId IS NOT NULL AND ItemId IS NULL) OR (SceneId IS NULL AND ItemId IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_ItemLinks_ItemId",
                table: "ItemLinks",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemLinks_SceneId_ItemId",
                table: "ItemLinks",
                columns: new[] { "SceneId", "ItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Items_CampaignId",
                table: "Items",
                column: "CampaignId");

            migrationBuilder.AddForeignKey(
                name: "FK_Handouts_Items_ItemId",
                table: "Handouts",
                column: "ItemId",
                principalTable: "Items",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Handouts_Items_ItemId",
                table: "Handouts");

            migrationBuilder.DropTable(
                name: "ItemLinks");

            migrationBuilder.DropTable(
                name: "Items");

            migrationBuilder.DropIndex(
                name: "IX_Handouts_ItemId_Position",
                table: "Handouts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Handouts_OneOwner",
                table: "Handouts");

            migrationBuilder.DropColumn(
                name: "ItemId",
                table: "Handouts");

            migrationBuilder.AlterColumn<Guid>(
                name: "SceneId",
                table: "Handouts",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }
    }
}
