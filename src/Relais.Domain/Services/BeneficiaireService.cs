using Relais.Domain.Entities;
using Relais.Domain.Enums;

namespace Relais.Domain.Services;

public sealed class BeneficiaireService
{
    public Beneficiaire Creer(string prenom, Guid? referentId)
    {
        var prenomNettoye = prenom.Trim();
        if (prenomNettoye.Length == 0)
        {
            throw new ArgumentException("Le prénom du bénéficiaire est obligatoire.", nameof(prenom));
        }

        return new Beneficiaire
        {
            Id = Guid.NewGuid(),
            Prenom = prenomNettoye,
            ReferentId = referentId,
            Statut = StatutBeneficiaire.Actif,
            CreeLe = DateTime.UtcNow,
        };
    }

    public void Archiver(Beneficiaire beneficiaire)
    {
        if (beneficiaire.Statut == StatutBeneficiaire.Archive)
        {
            throw new InvalidOperationException("Le bénéficiaire est déjà archivé.");
        }

        beneficiaire.Statut = StatutBeneficiaire.Archive;
    }
}