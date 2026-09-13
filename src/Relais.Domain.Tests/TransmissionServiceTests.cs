using Relais.Domain.Services;

namespace Relais.Domain.Tests;

public class TransmissionServiceTests
{
    private readonly TransmissionService service = new();

    [Fact]
    public void Creer_AvecTexteValide_RetourneUneTransmissionLieeAuBeneficiaireEtAlAuteur()
    {
        var beneficiaireId = Guid.NewGuid();
        var auteurId = Guid.NewGuid();

        var transmission = service.Creer(beneficiaireId, auteurId, " Repas bien pris ", []);

        Assert.Equal(beneficiaireId, transmission.BeneficiaireId);
        Assert.Equal(auteurId, transmission.AuteurId);
        Assert.Equal("Repas bien pris", transmission.Texte);
        Assert.NotEqual(Guid.Empty, transmission.Id);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Creer_AvecTexteVide_LeveArgumentException(string texte)
    {
        Assert.Throws<ArgumentException>(
            () => service.Creer(Guid.NewGuid(), Guid.NewGuid(), texte, []));
    }

    [Fact]
    public void Creer_AvecTagsEnDoublon_NeGardeQueDesTagsUniques()
    {
        var tagId = Guid.NewGuid();

        var transmission = service.Creer(Guid.NewGuid(), Guid.NewGuid(), "Texte", [tagId, tagId]);

        var tag = Assert.Single(transmission.TransmissionTags);
        Assert.Equal(tagId, tag.TagId);
        Assert.Equal(transmission.Id, tag.TransmissionId);
    }

    [Fact]
    public void Creer_AvecPlusieursTags_LesAssocieTousALaTransmission()
    {
        var tagIds = new[] { Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid() };

        var transmission = service.Creer(Guid.NewGuid(), Guid.NewGuid(), "Texte", tagIds);

        Assert.Equal(tagIds.Length, transmission.TransmissionTags.Count);
        Assert.All(transmission.TransmissionTags, tt => Assert.Contains(tt.TagId, tagIds));
    }
}
