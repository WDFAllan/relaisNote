using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Relais.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddServicesAndTeams : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ServiceId",
                table: "Beneficiaires",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Services",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nom = table.Column<string>(type: "text", nullable: false),
                    EstActif = table.Column<bool>(type: "boolean", nullable: false),
                    CreeLe = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Services", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Equipes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nom = table.Column<string>(type: "text", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    EstActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreeLe = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Equipes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Equipes_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UtilisateurEquipes",
                columns: table => new
                {
                    UtilisateurId = table.Column<Guid>(type: "uuid", nullable: false),
                    EquipeId = table.Column<Guid>(type: "uuid", nullable: false),
                    AffecteLe = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UtilisateurEquipes", x => new { x.UtilisateurId, x.EquipeId });
                    table.ForeignKey(
                        name: "FK_UtilisateurEquipes_Equipes_EquipeId",
                        column: x => x.EquipeId,
                        principalTable: "Equipes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UtilisateurEquipes_Utilisateurs_UtilisateurId",
                        column: x => x.UtilisateurId,
                        principalTable: "Utilisateurs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Beneficiaires_ServiceId",
                table: "Beneficiaires",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_Equipes_ServiceId_Nom",
                table: "Equipes",
                columns: new[] { "ServiceId", "Nom" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Services_Nom",
                table: "Services",
                column: "Nom",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UtilisateurEquipes_EquipeId",
                table: "UtilisateurEquipes",
                column: "EquipeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Beneficiaires_Services_ServiceId",
                table: "Beneficiaires",
                column: "ServiceId",
                principalTable: "Services",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Beneficiaires_Services_ServiceId",
                table: "Beneficiaires");

            migrationBuilder.DropTable(
                name: "UtilisateurEquipes");

            migrationBuilder.DropTable(
                name: "Equipes");

            migrationBuilder.DropTable(
                name: "Services");

            migrationBuilder.DropIndex(
                name: "IX_Beneficiaires_ServiceId",
                table: "Beneficiaires");

            migrationBuilder.DropColumn(
                name: "ServiceId",
                table: "Beneficiaires");
        }
    }
}
