namespace Relais.Domain.Entities;

public class Transmission
{
    public Guid Id { get; set; }

    public Guid BeneficiaireId { get; set; }
    public Beneficiaire? Beneficiaire { get; set; }

    public Guid AuteurId { get; set; }
    public Utilisateur? Auteur { get; set; }

    public string Texte { get; set; } = string.Empty;

    public DateTime CreeLe { get; set; } = DateTime.UtcNow;
    public DateTime? ModifieLe { get; set; }

    public ICollection<TransmissionTag> TransmissionTags { get; set; } = new List<TransmissionTag>();
}

/// <summary>Table de jointure many-to-many entre Transmission et Tag.</summary>
public class TransmissionTag
{
    public Guid TransmissionId { get; set; }
    public Transmission? Transmission { get; set; }

    public Guid TagId { get; set; }
    public Tag? Tag { get; set; }
}
