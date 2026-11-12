using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CocAssistant.CampaignPlay.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWallEntryKindAndRollRequestId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Kind",
                table: "WallEntries",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Text");

            migrationBuilder.AddColumn<Guid>(
                name: "RollRequestId",
                table: "WallEntries",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WallEntries_RollRequestId",
                table: "WallEntries",
                column: "RollRequestId",
                unique: true,
                filter: "[RollRequestId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WallEntries_RollRequestId",
                table: "WallEntries");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "WallEntries");

            migrationBuilder.DropColumn(
                name: "RollRequestId",
                table: "WallEntries");
        }
    }
}
