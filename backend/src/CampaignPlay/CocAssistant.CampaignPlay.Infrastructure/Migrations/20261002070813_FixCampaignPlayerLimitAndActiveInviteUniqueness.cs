using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CocAssistant.CampaignPlay.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixCampaignPlayerLimitAndActiveInviteUniqueness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // AddCampaignInviteAndMembership backfilled existing Campaigns with 0; the default Player limit is 8.
            migrationBuilder.Sql("UPDATE [Campaigns] SET [PlayerLimit] = 8 WHERE [PlayerLimit] = 0;");

            // Keep only the newest active Invite per Campaign so the unique index below can be created.
            migrationBuilder.Sql(
                @"WITH [RankedActiveInvites] AS (
                    SELECT [Status], ROW_NUMBER() OVER (PARTITION BY [CampaignId] ORDER BY [CreatedAt] DESC, [Id] DESC) AS [Rank]
                    FROM [CampaignInvite]
                    WHERE [Status] = N'Active')
                  UPDATE [RankedActiveInvites] SET [Status] = N'Replaced' WHERE [Rank] > 1;");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignInvite_CampaignId_Active",
                table: "CampaignInvite",
                column: "CampaignId",
                unique: true,
                filter: "[Status] = 'Active'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data corrections are not reverted: a Player limit of 0 and duplicate active Invites were both invalid states.
            migrationBuilder.DropIndex(
                name: "IX_CampaignInvite_CampaignId_Active",
                table: "CampaignInvite");
        }
    }
}
