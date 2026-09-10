using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Relais.Domain.Entities;
using Relais.Domain.Enums;
using Relais.Domain.Services;
using Relais.Infrastructure.Persistence;

namespace Relais.Api.Controllers;

[ApiController]
[Route("api/beneficiaires")]
[Authorize]
public class BeneficiairesController : ControllerBase
{
    private readonly RelaisDbContext db;
    private readonly BeneficiaireService beneficiaireService;

    public BeneficiairesController(RelaisDbContext db, BeneficiaireService beneficiaireService)
    {
        this.db = db;
        this.beneficiaireService = beneficiaireService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BeneficiaireResponse>>> GetAll(
        [FromQuery] bool inclureArchives = false,
        CancellationToken cancellationToken = default)
    {
        var query = db.Beneficiaires
            .AsNoTracking()
            .Include(beneficiaire => beneficiaire.Referent)
            .AsQueryable();

        if (!inclureArchives)
        {
            query = query.Where(beneficiaire => beneficiaire.Statut == StatutBeneficiaire.Actif);
        }

        var beneficiaires = await query
            .OrderBy(beneficiaire => beneficiaire.Prenom)
            .Select(beneficiaire => new BeneficiaireResponse(
                beneficiaire.Id,
                beneficiaire.Prenom,
                beneficiaire.Statut,
                beneficiaire.ReferentId,
                beneficiaire.Referent == null
                    ? null
                    : beneficiaire.Referent.Prenom + " " + beneficiaire.Referent.Nom,
                beneficiaire.CreeLe))
            .ToListAsync(cancellationToken);

        return Ok(beneficiaires);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BeneficiaireResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var beneficiaire = await db.Beneficiaires
            .AsNoTracking()
            .Include(item => item.Referent)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return beneficiaire is null
            ? NotFound()
            : Ok(ToResponse(beneficiaire));
    }

    [HttpPost]
    [Authorize(Roles = "Administrateur,Referent")]
    public async Task<ActionResult<BeneficiaireResponse>> Create(
        CreateBeneficiaireRequest request,
        CancellationToken cancellationToken)
    {
        if (request.ReferentId.HasValue && !await IsActiveReferent(request.ReferentId.Value, cancellationToken))
        {
            return BadRequest(new { message = "Le référent indiqué est introuvable ou inactif." });
        }

        Beneficiaire beneficiaire;
        try
        {
            beneficiaire = beneficiaireService.Creer(request.Prenom, request.ReferentId);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }

        db.Beneficiaires.Add(beneficiaire);
        AddAudit("creation_beneficiaire", $"Beneficiaire:{beneficiaire.Id}");
        await db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = beneficiaire.Id }, ToResponse(beneficiaire));
    }

    [HttpPost("{id:guid}/archiver")]
    [Authorize(Roles = "Administrateur,Referent")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        var beneficiaire = await db.Beneficiaires.SingleOrDefaultAsync(
            item => item.Id == id,
            cancellationToken);

        if (beneficiaire is null)
        {
            return NotFound();
        }

        try
        {
            beneficiaireService.Archiver(beneficiaire);
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new { message = exception.Message });
        }

        AddAudit("archivage_beneficiaire", $"Beneficiaire:{beneficiaire.Id}");
        await db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = nameof(RoleUtilisateur.Administrateur))]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var beneficiaire = await db.Beneficiaires.SingleOrDefaultAsync(
            item => item.Id == id,
            cancellationToken);

        if (beneficiaire is null)
        {
            return NotFound();
        }

        db.Beneficiaires.Remove(beneficiaire);
        AddAudit("suppression_beneficiaire", $"Beneficiaire:{beneficiaire.Id}");
        await db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private async Task<bool> IsActiveReferent(Guid id, CancellationToken cancellationToken)
    {
        return await db.Utilisateurs.AnyAsync(
            utilisateur => utilisateur.Id == id
                && utilisateur.Role == RoleUtilisateur.Referent
                && utilisateur.Statut == StatutUtilisateur.Actif,
            cancellationToken);
    }

    private void AddAudit(string action, string cible)
    {
        var utilisateurId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        if (Guid.TryParse(utilisateurId, out var parsedUtilisateurId))
        {
            db.JournalAudit.Add(new JournalAudit
            {
                Id = Guid.NewGuid(),
                UtilisateurId = parsedUtilisateurId,
                Action = action,
                Cible = cible,
            });
        }
    }

    private static BeneficiaireResponse ToResponse(Beneficiaire beneficiaire) => new(
        beneficiaire.Id,
        beneficiaire.Prenom,
        beneficiaire.Statut,
        beneficiaire.ReferentId,
        beneficiaire.Referent is null
            ? null
            : beneficiaire.Referent.Prenom + " " + beneficiaire.Referent.Nom,
        beneficiaire.CreeLe);
}

public sealed class CreateBeneficiaireRequest
{
    [Required, MinLength(1)]
    public string Prenom { get; set; } = string.Empty;

    public Guid? ReferentId { get; set; }
}

public sealed record BeneficiaireResponse(
    Guid Id,
    string Prenom,
    StatutBeneficiaire Statut,
    Guid? ReferentId,
    string? ReferentNom,
    DateTime CreeLe);