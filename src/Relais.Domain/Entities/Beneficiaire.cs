using Relais.Domain.Enums;

namespace Relais.Domain.Entities;

public class Beneficiaire
{
    public Guid Id { get; set; }
    public string Prenom { get; set; } = string.Empty;
    public Guid? ReferentId { get; set; }
    public Utilisateur? Referent { get; set; }
    public StatutBeneficiaire Statut { get; set; } = StatutBeneficiaire.Actif;
    public DateTime CreeLe { get; set; } = DateTime.UtcNow;

    public ICollection<Transmission> Transmissions { get; set; } = new List<Transmission>();
}
