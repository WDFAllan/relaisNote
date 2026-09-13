namespace Relais.Domain.Entities;

public class Service
{
    public Guid Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public bool EstActif { get; set; } = true;
    public DateTime CreeLe { get; set; } = DateTime.UtcNow;

    public ICollection<Equipe> Equipes { get; set; } = new List<Equipe>();
    public ICollection<Beneficiaire> Beneficiaires { get; set; } = new List<Beneficiaire>();
}