namespace Relais.Domain.Entities;

/// <summary>
/// Ligne de configuration unique : chaque installation dessert une seule institution,
/// donc pas de table "Institution" multi-lignes ni de notion de tenant.
/// </summary>
public class ParametresInstallation
{
    public Guid Id { get; set; }
    public string NomInstitution { get; set; } = string.Empty;
    public string? EmailContact { get; set; }
    public int? DureeConservationJours { get; set; }
}
