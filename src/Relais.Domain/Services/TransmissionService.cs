using Relais.Domain.Entities;

namespace Relais.Domain.Services;

public sealed class TransmissionService
{
    public Transmission Creer(Guid beneficiaireId, Guid auteurId, string texte, IEnumerable<Guid> tagIds)
    {
        var texteNettoye = texte.Trim();
        if (texteNettoye.Length == 0)
        {
            throw new ArgumentException("Le texte de la transmission est obligatoire.", nameof(texte));
        }

        var transmission = new Transmission
        {
            Id = Guid.NewGuid(),
            BeneficiaireId = beneficiaireId,
            AuteurId = auteurId,
            Texte = texteNettoye,
            CreeLe = DateTime.UtcNow,
        };

        foreach (var tagId in tagIds.Distinct())
        {
            transmission.TransmissionTags.Add(new TransmissionTag
            {
                TransmissionId = transmission.Id,
                TagId = tagId,
            });
        }

        return transmission;
    }
}