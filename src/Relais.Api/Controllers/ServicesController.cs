using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Relais.Domain.Entities;
using Relais.Infrastructure.Persistence;

namespace Relais.Api.Controllers;

[ApiController]
[Route("api/services")]
[Authorize]
public class ServicesController : ControllerBase
{
    private readonly RelaisDbContext db;

    public ServicesController(RelaisDbContext db) => this.db = db;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ServiceResponse>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await db.Services
            .AsNoTracking()
            .Where(service => service.EstActif)
            .OrderBy(service => service.Nom)
            .Select(service => new ServiceResponse(
                service.Id,
                service.Nom,
                service.Equipes.Count(team => team.EstActive),
                service.Beneficiaires.Count(beneficiaire => beneficiaire.Statut == Domain.Enums.StatutBeneficiaire.Actif)))
            .ToListAsync(cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = "Administrateur")]
    public async Task<ActionResult<ServiceResponse>> Create(
        CreateServiceRequest request,
        CancellationToken cancellationToken)
    {
        var nom = request.Nom.Trim();
        if (await db.Services.AnyAsync(service => service.Nom.ToLower() == nom.ToLower(), cancellationToken))
        {
            return Conflict(new { message = "Un service existe déjà avec ce nom." });
        }

        var service = new Service { Id = Guid.NewGuid(), Nom = nom };
        db.Services.Add(service);
        await db.SaveChangesAsync(cancellationToken);

        return Created($"/api/services/{service.Id}", new ServiceResponse(service.Id, service.Nom, 0, 0));
    }

    [HttpGet("{serviceId:guid}/beneficiaires")]
    public async Task<ActionResult<IReadOnlyList<BeneficiaireResponse>>> GetBeneficiaries(
        Guid serviceId,
        CancellationToken cancellationToken)
    {
        if (!await db.Services.AnyAsync(service => service.Id == serviceId && service.EstActif, cancellationToken))
        {
            return NotFound(new { message = "Service introuvable." });
        }

        return Ok(await db.Beneficiaires
            .AsNoTracking()
            .Where(beneficiaire => beneficiaire.ServiceId == serviceId
                && beneficiaire.Statut == Domain.Enums.StatutBeneficiaire.Actif)
            .OrderBy(beneficiaire => beneficiaire.Prenom)
            .Select(beneficiaire => new BeneficiaireResponse(
                beneficiaire.Id,
                beneficiaire.Prenom,
                beneficiaire.Statut,
                beneficiaire.ServiceId,
                beneficiaire.Service == null ? null : beneficiaire.Service.Nom,
                beneficiaire.ReferentId,
                beneficiaire.Referent == null
                    ? null
                    : beneficiaire.Referent.Prenom + " " + beneficiaire.Referent.Nom,
                beneficiaire.CreeLe))
            .ToListAsync(cancellationToken));
    }
}

public sealed class CreateServiceRequest
{
    [Required, MinLength(1)]
    public string Nom { get; set; } = string.Empty;
}

public sealed record ServiceResponse(Guid Id, string Nom, int NombreEquipes, int NombreBeneficiaires);