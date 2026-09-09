namespace Relais.Domain.Entities;

public class Tag
{
    public Guid Id { get; set; }
    public string Libelle { get; set; } = string.Empty;
    public bool EstAlerte { get; set; }
}
