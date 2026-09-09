using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Relais.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ParametresInstallation",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NomInstitution = table.Column<string>(type: "text", nullable: false),
                    EmailContact = table.Column<string>(type: "text", nullable: true),
                    DureeConservationJours = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParametresInstallation", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Tags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Libelle = table.Column<string>(type: "text", nullable: false),
                    EstAlerte = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Utilisateurs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    MotDePasseHash = table.Column<string>(type: "text", nullable: false),
                    Prenom = table.Column<string>(type: "text", nullable: false),
                    Nom = table.Column<string>(type: "text", nullable: false),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    Statut = table.Column<int>(type: "integer", nullable: false),
                    DerniereConnexion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreeLe = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Utilisateurs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Beneficiaires",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Prenom = table.Column<string>(type: "text", nullable: false),
                    ReferentId = table.Column<Guid>(type: "uuid", nullable: true),
                    Statut = table.Column<int>(type: "integer", nullable: false),
                    CreeLe = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Beneficiaires", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Beneficiaires_Utilisateurs_ReferentId",
                        column: x => x.ReferentId,
                        principalTable: "Utilisateurs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "JournalAudit",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UtilisateurId = table.Column<Guid>(type: "uuid", nullable: false),
                    Action = table.Column<string>(type: "text", nullable: false),
                    Cible = table.Column<string>(type: "text", nullable: true),
                    Horodatage = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JournalAudit", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JournalAudit_Utilisateurs_UtilisateurId",
                        column: x => x.UtilisateurId,
                        principalTable: "Utilisateurs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Transmissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BeneficiaireId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuteurId = table.Column<Guid>(type: "uuid", nullable: false),
                    Texte = table.Column<string>(type: "text", nullable: false),
                    CreeLe = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifieLe = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Transmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Transmissions_Beneficiaires_BeneficiaireId",
                        column: x => x.BeneficiaireId,
                        principalTable: "Beneficiaires",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Transmissions_Utilisateurs_AuteurId",
                        column: x => x.AuteurId,
                        principalTable: "Utilisateurs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TransmissionTag",
                columns: table => new
                {
                    TransmissionId = table.Column<Guid>(type: "uuid", nullable: false),
                    TagId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransmissionTag", x => new { x.TransmissionId, x.TagId });
                    table.ForeignKey(
                        name: "FK_TransmissionTag_Tags_TagId",
                        column: x => x.TagId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransmissionTag_Transmissions_TransmissionId",
                        column: x => x.TransmissionId,
                        principalTable: "Transmissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Tags",
                columns: new[] { "Id", "EstAlerte", "Libelle" },
                values: new object[,]
                {
                    { new Guid("3f938b76-df33-4ee6-af67-9725234982f3"), false, "Point positif" },
                    { new Guid("4ddf7bc6-35de-4f5f-90f0-409a4a6805c2"), false, "Activité" },
                    { new Guid("612c7506-2a74-40f2-853f-f1acb487968c"), true, "À signaler" },
                    { new Guid("ad95982c-900a-416e-bce4-e24b9a729fba"), false, "Santé" },
                    { new Guid("d07a332c-5537-48ea-9b8a-9087973cbdf2"), false, "Repas / sommeil" },
                    { new Guid("f0105df6-66ee-4503-9c4e-77aee63f9395"), false, "Comportement" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Beneficiaires_ReferentId",
                table: "Beneficiaires",
                column: "ReferentId");

            migrationBuilder.CreateIndex(
                name: "IX_JournalAudit_UtilisateurId",
                table: "JournalAudit",
                column: "UtilisateurId");

            migrationBuilder.CreateIndex(
                name: "IX_Transmissions_AuteurId",
                table: "Transmissions",
                column: "AuteurId");

            migrationBuilder.CreateIndex(
                name: "IX_Transmissions_BeneficiaireId",
                table: "Transmissions",
                column: "BeneficiaireId");

            migrationBuilder.CreateIndex(
                name: "IX_TransmissionTag_TagId",
                table: "TransmissionTag",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_Utilisateurs_Email",
                table: "Utilisateurs",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "JournalAudit");

            migrationBuilder.DropTable(
                name: "ParametresInstallation");

            migrationBuilder.DropTable(
                name: "TransmissionTag");

            migrationBuilder.DropTable(
                name: "Tags");

            migrationBuilder.DropTable(
                name: "Transmissions");

            migrationBuilder.DropTable(
                name: "Beneficiaires");

            migrationBuilder.DropTable(
                name: "Utilisateurs");
        }
    }
}
