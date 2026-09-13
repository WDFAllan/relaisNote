namespace Relais.Domain.Entities;

public class UtilisateurEquipe
{
    public Guid UtilisateurId { get; set; }
    public Utilisateur? Utilisateur { get; set; }

    public Guid EquipeId { get; set; }
    public Equipe? Equipe { get; set; }

    public DateTime AffecteLe { get; set; } = DateTime.UtcNow;
}