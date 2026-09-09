namespace Relais.Domain.Entities;

public class JournalAudit
{
    public Guid Id { get; set; }

    public Guid UtilisateurId { get; set; }
    public Utilisateur? Utilisateur { get; set; }

    /// <summary>Ex. "connexion", "creation_transmission", "export".</summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>Type et identifiant de l'objet concerné, ex. "Transmission:3f2c...".</summary>
    public string? Cible { get; set; }

    public DateTime Horodatage { get; set; } = DateTime.UtcNow;
}
