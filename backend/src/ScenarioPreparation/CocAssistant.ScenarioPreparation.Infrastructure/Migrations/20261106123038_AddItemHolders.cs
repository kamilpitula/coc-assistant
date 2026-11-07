using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CocAssistant.ScenarioPreparation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddItemHolders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Reveals_Subject",
                table: "Reveals");

            migrationBuilder.AddColumn<Guid>(
                name: "HolderInvestigatorId",
                table: "Items",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "HolderRevealId",
                table: "Items",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Version",
                table: "Items",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reveals_Subject",
                table: "Reveals",
                sql: "(SubjectType = 'Handout' AND HandoutKind IS NOT NULL AND ((Content IS NOT NULL AND FileKey IS NULL) OR (Content IS NULL AND FileKey IS NOT NULL))) OR (SubjectType = 'NonPlayerEntity' AND HandoutKind IS NULL AND FileKey IS NULL AND ImageDescription IS NULL) OR (SubjectType = 'Item' AND HandoutKind IS NULL AND FileKey IS NULL AND ImageDescription IS NULL AND Content IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_Items_CampaignId_HolderInvestigatorId",
                table: "Items",
                columns: new[] { "CampaignId", "HolderInvestigatorId" });

            migrationBuilder.CreateIndex(
                name: "IX_Items_HolderRevealId",
                table: "Items",
                column: "HolderRevealId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Items_Holder",
                table: "Items",
                sql: "(HolderInvestigatorId IS NULL AND HolderRevealId IS NULL) OR (HolderInvestigatorId IS NOT NULL AND HolderRevealId IS NOT NULL)");

            migrationBuilder.AddForeignKey(
                name: "FK_Items_Reveals_HolderRevealId",
                table: "Items",
                column: "HolderRevealId",
                principalTable: "Reveals",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Items_Reveals_HolderRevealId",
                table: "Items");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reveals_Subject",
                table: "Reveals");

            migrationBuilder.DropIndex(
                name: "IX_Items_CampaignId_HolderInvestigatorId",
                table: "Items");

            migrationBuilder.DropIndex(
                name: "IX_Items_HolderRevealId",
                table: "Items");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Items_Holder",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "HolderInvestigatorId",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "HolderRevealId",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "Items");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reveals_Subject",
                table: "Reveals",
                sql: "(SubjectType = 'Handout' AND HandoutKind IS NOT NULL AND ((Content IS NOT NULL AND FileKey IS NULL) OR (Content IS NULL AND FileKey IS NOT NULL))) OR (SubjectType = 'NonPlayerEntity' AND HandoutKind IS NULL AND FileKey IS NULL AND ImageDescription IS NULL)");
        }
    }
}
