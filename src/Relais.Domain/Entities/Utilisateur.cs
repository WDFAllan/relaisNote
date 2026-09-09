using Relais.Domain.Enums;

namespace Relais.Domain.Entities;

public class Utilisateur
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string MotDePasseHash { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public string Nom { get; set; } = string.Empty;
    public RoleUtilisateur Role { get; set; }
    public StatutUtilisateur Statut { get; set; } = StatutUtilisateur.Invite;
    public DateTime? DerniereConnexion { get; set; }
    public DateTime CreeLe { get; set; } = DateTime.UtcNow;

    public string NomComplet => $"{Prenom} {Nom}".Trim();
}
