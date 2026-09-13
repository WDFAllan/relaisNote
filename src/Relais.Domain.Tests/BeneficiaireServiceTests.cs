using Relais.Domain.Enums;
using Relais.Domain.Services;

namespace Relais.Domain.Tests;

public class BeneficiaireServiceTests
{
    private readonly BeneficiaireService service = new();

    [Fact]
    public void Creer_AvecPrenomValide_RetourneUnBeneficiaireActif()
    {
        var referentId = Guid.NewGuid();

        var beneficiaire = service.Creer(" Alice ", referentId);

        Assert.Equal("Alice", beneficiaire.Prenom);
        Assert.Equal(referentId, beneficiaire.ReferentId);
        Assert.Equal(StatutBeneficiaire.Actif, beneficiaire.Statut);
        Assert.NotEqual(Guid.Empty, beneficiaire.Id);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Creer_AvecPrenomVide_LeveArgumentException(string prenom)
    {
        Assert.Throws<ArgumentException>(() => service.Creer(prenom, null));
    }

    [Fact]
    public void Archiver_SurBeneficiaireActif_ChangeLeStatut()
    {
        var beneficiaire = service.Creer("Alice", null);

        service.Archiver(beneficiaire);

        Assert.Equal(StatutBeneficiaire.Archive, beneficiaire.Statut);
    }

    [Fact]
    public void Archiver_SurBeneficiaireDejaArchive_LeveInvalidOperationException()
    {
        var beneficiaire = service.Creer("Alice", null);
        service.Archiver(beneficiaire);

        Assert.Throws<InvalidOperationException>(() => service.Archiver(beneficiaire));
    }
}
