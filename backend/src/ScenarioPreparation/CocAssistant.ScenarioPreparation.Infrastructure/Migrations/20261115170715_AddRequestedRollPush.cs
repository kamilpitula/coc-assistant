using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CocAssistant.ScenarioPreparation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRequestedRollPush : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasBeenPushed",
                table: "RequestedRolls",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "PushBonusDice",
                table: "RequestedRolls",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PushJustification",
                table: "RequestedRolls",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PushPenaltyDice",
                table: "RequestedRolls",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasBeenPushed",
                table: "RequestedRolls");

            migrationBuilder.DropColumn(
                name: "PushBonusDice",
                table: "RequestedRolls");

            migrationBuilder.DropColumn(
                name: "PushJustification",
                table: "RequestedRolls");

            migrationBuilder.DropColumn(
                name: "PushPenaltyDice",
                table: "RequestedRolls");
        }
    }
}
