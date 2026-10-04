using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CocAssistant.CampaignPlay.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignPlayerAccountIdIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_CampaignPlayer_AccountId",
                table: "CampaignPlayer",
                column: "AccountId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CampaignPlayer_AccountId",
                table: "CampaignPlayer");
        }
    }
}
