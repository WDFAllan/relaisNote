namespace Relais.Domain.Entities;

public class Equipe
{
    public Guid Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public Guid ServiceId { get; set; }
    public Service? Service { get; set; }
    public bool EstActive { get; set; } = true;
    public DateTime CreeLe { get; set; } = DateTime.UtcNow;

    public ICollection<UtilisateurEquipe> Membres { get; set; } = new List<UtilisateurEquipe>();
}