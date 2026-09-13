using Microsoft.EntityFrameworkCore;
using Relais.Domain.Entities;

namespace Relais.Infrastructure.Persistence;

public class RelaisDbContext : DbContext
{
    public RelaisDbContext(DbContextOptions<RelaisDbContext> options) : base(options) { }

    public DbSet<ParametresInstallation> ParametresInstallation => Set<ParametresInstallation>();
    public DbSet<Utilisateur> Utilisateurs => Set<Utilisateur>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Equipe> Equipes => Set<Equipe>();
    public DbSet<UtilisateurEquipe> UtilisateurEquipes => Set<UtilisateurEquipe>();
    public DbSet<Beneficiaire> Beneficiaires => Set<Beneficiaire>();
    public DbSet<Transmission> Transmissions => Set<Transmission>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<JournalAudit> JournalAudit => Set<JournalAudit>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Utilisateur>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<Service>(e =>
        {
            e.HasIndex(service => service.Nom).IsUnique();
        });

        modelBuilder.Entity<Equipe>(e =>
        {
            e.HasIndex(team => new { team.ServiceId, team.Nom }).IsUnique();
            e.HasOne(team => team.Service)
                .WithMany(service => service.Equipes)
                .HasForeignKey(team => team.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<UtilisateurEquipe>(e =>
        {
            e.HasKey(member => new { member.UtilisateurId, member.EquipeId });
            e.HasOne(member => member.Utilisateur)
                .WithMany()
                .HasForeignKey(member => member.UtilisateurId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(member => member.Equipe)
                .WithMany(team => team.Membres)
                .HasForeignKey(member => member.EquipeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Beneficiaire>(e =>
        {
            e.HasOne(b => b.Service)
                .WithMany(service => service.Beneficiaires)
                .HasForeignKey(b => b.ServiceId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(b => b.Referent)
                .WithMany()
                .HasForeignKey(b => b.ReferentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Transmission>(e =>
        {
            e.HasOne(t => t.Beneficiaire)
                .WithMany(b => b.Transmissions)
                .HasForeignKey(t => t.BeneficiaireId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(t => t.Auteur)
                .WithMany()
                .HasForeignKey(t => t.AuteurId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Table de jointure Transmission <-> Tag (many-to-many explicite)
        modelBuilder.Entity<TransmissionTag>(e =>
        {
            e.HasKey(tt => new { tt.TransmissionId, tt.TagId });

            e.HasOne(tt => tt.Transmission)
                .WithMany(t => t.TransmissionTags)
                .HasForeignKey(tt => tt.TransmissionId);

            e.HasOne(tt => tt.Tag)
                .WithMany()
                .HasForeignKey(tt => tt.TagId);
        });

        modelBuilder.Entity<JournalAudit>(e =>
        {
            e.HasOne(j => j.Utilisateur)
                .WithMany()
                .HasForeignKey(j => j.UtilisateurId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Tags standard fournis par défaut à l'installation.
        var comportement = Guid.Parse("10000000-0000-0000-0000-000000000001");
        var sante = Guid.Parse("10000000-0000-0000-0000-000000000002");
        var repasSommeil = Guid.Parse("10000000-0000-0000-0000-000000000003");
        var activite = Guid.Parse("10000000-0000-0000-0000-000000000004");
        var positif = Guid.Parse("10000000-0000-0000-0000-000000000005");
        var signaler = Guid.Parse("10000000-0000-0000-0000-000000000006");

        modelBuilder.Entity<Tag>().HasData(
            new Tag { Id = comportement, Libelle = "Comportement", EstAlerte = false },
            new Tag { Id = sante, Libelle = "Santé", EstAlerte = false },
            new Tag { Id = repasSommeil, Libelle = "Repas / sommeil", EstAlerte = false },
            new Tag { Id = activite, Libelle = "Activité", EstAlerte = false },
            new Tag { Id = positif, Libelle = "Point positif", EstAlerte = false },
            new Tag { Id = signaler, Libelle = "À signaler", EstAlerte = true }
        );
    }
}
