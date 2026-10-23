using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CocAssistant.ScenarioPreparation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHandoutFiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "Handouts",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "FileKey",
                table: "Handouts",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FileMediaType",
                table: "Handouts",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FileName",
                table: "Handouts",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "FileSizeBytes",
                table: "Handouts",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Handouts_Content",
                table: "Handouts",
                sql: "(Kind IN ('ReadAloud', 'Text') AND Content IS NOT NULL AND FileKey IS NULL AND FileName IS NULL AND FileMediaType IS NULL AND FileSizeBytes IS NULL) OR (Kind IN ('Image', 'Document', 'Map') AND Content IS NULL AND FileKey IS NOT NULL AND FileName IS NOT NULL AND FileMediaType IS NOT NULL AND FileSizeBytes IS NOT NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Handouts_Content",
                table: "Handouts");

            migrationBuilder.DropColumn(
                name: "FileKey",
                table: "Handouts");

            migrationBuilder.DropColumn(
                name: "FileMediaType",
                table: "Handouts");

            migrationBuilder.DropColumn(
                name: "FileName",
                table: "Handouts");

            migrationBuilder.DropColumn(
                name: "FileSizeBytes",
                table: "Handouts");

            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "Handouts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);
        }
    }
}
