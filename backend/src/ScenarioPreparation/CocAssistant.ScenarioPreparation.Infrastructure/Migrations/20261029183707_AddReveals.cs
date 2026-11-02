using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CocAssistant.ScenarioPreparation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReveals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImageDescription",
                table: "Handouts",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Reveals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SceneId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SubjectType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SubjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RevealedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    HandoutKind = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FileKey = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    FileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    FileMediaType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: true),
                    ImageDescription = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reveals", x => x.Id);
                    table.CheckConstraint("CK_Reveals_File", "(FileKey IS NULL AND FileName IS NULL AND FileMediaType IS NULL AND FileSizeBytes IS NULL) OR (FileKey IS NOT NULL AND FileName IS NOT NULL AND FileMediaType IS NOT NULL AND FileSizeBytes IS NOT NULL)");
                    table.CheckConstraint("CK_Reveals_Subject", "(SubjectType = 'Handout' AND HandoutKind IS NOT NULL AND ((Content IS NOT NULL AND FileKey IS NULL) OR (Content IS NULL AND FileKey IS NOT NULL))) OR (SubjectType = 'NonPlayerEntity' AND HandoutKind IS NULL AND FileKey IS NULL AND ImageDescription IS NULL)");
                    table.ForeignKey(
                        name: "FK_Reveals_Scenes_SceneId",
                        column: x => x.SceneId,
                        principalTable: "Scenes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RevealRecipients",
                columns: table => new
                {
                    RevealId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvestigatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RevealRecipients", x => new { x.RevealId, x.InvestigatorId });
                    table.ForeignKey(
                        name: "FK_RevealRecipients_Reveals_RevealId",
                        column: x => x.RevealId,
                        principalTable: "Reveals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Handouts_ImageDescription",
                table: "Handouts",
                sql: "ImageDescription IS NULL OR Kind IN ('Image', 'Map')");

            migrationBuilder.CreateIndex(
                name: "IX_RevealRecipients_InvestigatorId",
                table: "RevealRecipients",
                column: "InvestigatorId");

            migrationBuilder.CreateIndex(
                name: "IX_Reveals_SceneId_RevealedAt",
                table: "Reveals",
                columns: new[] { "SceneId", "RevealedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RevealRecipients");

            migrationBuilder.DropTable(
                name: "Reveals");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Handouts_ImageDescription",
                table: "Handouts");

            migrationBuilder.DropColumn(
                name: "ImageDescription",
                table: "Handouts");
        }
    }
}
