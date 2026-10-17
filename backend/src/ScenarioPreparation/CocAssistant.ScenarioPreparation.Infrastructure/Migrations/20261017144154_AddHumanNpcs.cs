using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CocAssistant.ScenarioPreparation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHumanNpcs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "HumanNpcs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CampaignId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Profile = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HumanNpcs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HumanNpcs_CampaignId",
                table: "HumanNpcs",
                column: "CampaignId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HumanNpcs");
        }
    }
}
