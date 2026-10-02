using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CocAssistant.CampaignPlay.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignEraAndAllowedCreationMethods : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Existing Campaigns get the 1920s Era and every Creation Method (specs/campaign-play/spec.md, Campaign rules options).
            // The generated empty-string defaults would leave them invalid, as happened with the Player limit.
            migrationBuilder.AddColumn<string>(
                name: "AllowedCreationMethods",
                table: "Campaigns",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "StandardRolling,PointBuy,QuickFire");

            migrationBuilder.AddColumn<string>(
                name: "Era",
                table: "Campaigns",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "1920s");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowedCreationMethods",
                table: "Campaigns");

            migrationBuilder.DropColumn(
                name: "Era",
                table: "Campaigns");
        }
    }
}
