using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Relais.Domain.Entities;
using Relais.Domain.Services;
using Relais.Infrastructure.Persistence;

namespace Relais.Api.Controllers;

[ApiController]
[Route("api/beneficiaires/{beneficiaireId:guid}/transmissions")]
[Authorize]
public class TransmissionsController : ControllerBase
{
    private readonly RelaisDbContext db;
    private readonly TransmissionService transmissionService;

    public TransmissionsController(RelaisDbContext db, TransmissionService transmissionService)
    {
        this.db = db;
        this.transmissionService = transmissionService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TransmissionResponse>>> GetAll(
        Guid beneficiaireId,
        CancellationToken cancellationToken)
    {
        if (!await db.Beneficiaires.AnyAsync(item => item.Id == beneficiaireId, cancellationToken))
        {
            return NotFound(new { message = "Bénéficiaire introuvable." });
        }

        var transmissions = await db.Transmissions
            .AsNoTracking()
            .Where(transmission => transmission.BeneficiaireId == beneficiaireId)
            .OrderByDescending(transmission => transmission.CreeLe)
            .Select(transmission => new TransmissionResponse(
                transmission.Id,
                transmission.Texte,
                transmission.CreeLe,
                transmission.ModifieLe,
                transmission.Auteur == null
                    ? null
                    : transmission.Auteur.Prenom + " " + transmission.Auteur.Nom,
                transmission.TransmissionTags
                    .OrderBy(item => item.Tag!.Libelle)
                    .Select(item => new TagResponse(item.TagId, item.Tag!.Libelle, item.Tag.EstAlerte))
                    .ToList()))
            .ToListAsync(cancellationToken);

        return Ok(transmissions);
    }

    [HttpGet("{transmissionId:guid}")]
    public async Task<ActionResult<TransmissionResponse>> GetById(
        Guid beneficiaireId,
        Guid transmissionId,
        CancellationToken cancellationToken)
    {
        var transmission = await db.Transmissions
            .AsNoTracking()
            .Where(item => item.Id == transmissionId && item.BeneficiaireId == beneficiaireId)
            .Select(item => new TransmissionResponse(
                item.Id,
                item.Texte,
                item.CreeLe,
                item.ModifieLe,
                item.Auteur == null ? null : item.Auteur.Prenom + " " + item.Auteur.Nom,
                item.TransmissionTags
                    .OrderBy(tag => tag.Tag!.Libelle)
                    .Select(tag => new TagResponse(tag.TagId, tag.Tag!.Libelle, tag.Tag.EstAlerte))
                    .ToList()))
            .SingleOrDefaultAsync(cancellationToken);

        return transmission is null ? NotFound() : Ok(transmission);
    }

    [HttpPost]
    public async Task<ActionResult<TransmissionResponse>> Create(
        Guid beneficiaireId,
        CreateTransmissionRequest request,
        CancellationToken cancellationToken)
    {
        var beneficiaire = await db.Beneficiaires.SingleOrDefaultAsync(
            item => item.Id == beneficiaireId,
            cancellationToken);
        if (beneficiaire is null)
        {
            return NotFound(new { message = "Bénéficiaire introuvable." });
        }

        if (beneficiaire.Statut != Domain.Enums.StatutBeneficiaire.Actif)
        {
            return Conflict(new { message = "Impossible d’ajouter une transmission à un bénéficiaire archivé." });
        }

        var auteurIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(auteurIdValue, out var auteurId))
        {
            return Unauthorized();
        }

        var tagIds = request.TagIds.Distinct().ToArray();
        var existingTagIds = await db.Tags
            .Where(tag => tagIds.Contains(tag.Id))
            .Select(tag => tag.Id)
            .ToListAsync(cancellationToken);
        if (existingTagIds.Count != tagIds.Length)
        {
            return BadRequest(new { message = "Un ou plusieurs tags sont introuvables." });
        }

        Transmission transmission;
        try
        {
            transmission = transmissionService.Creer(
                beneficiaireId,
                auteurId,
                request.Texte,
                tagIds);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }

        db.Transmissions.Add(transmission);
        db.JournalAudit.Add(new JournalAudit
        {
            Id = Guid.NewGuid(),
            UtilisateurId = auteurId,
            Action = "creation_transmission",
            Cible = $"Transmission:{transmission.Id}",
        });
        await db.SaveChangesAsync(cancellationToken);

        var response = await db.Transmissions
            .AsNoTracking()
            .Where(item => item.Id == transmission.Id)
            .Select(item => new TransmissionResponse(
                item.Id,
                item.Texte,
                item.CreeLe,
                item.ModifieLe,
                item.Auteur == null ? null : item.Auteur.Prenom + " " + item.Auteur.Nom,
                item.TransmissionTags
                    .OrderBy(tag => tag.Tag!.Libelle)
                    .Select(tag => new TagResponse(tag.TagId, tag.Tag!.Libelle, tag.Tag.EstAlerte))
                    .ToList()))
            .SingleAsync(cancellationToken);

        return CreatedAtAction(nameof(GetById), new { beneficiaireId, transmissionId = transmission.Id }, response);
    }
}

public sealed class CreateTransmissionRequest
{
    [Required, MinLength(1)]
    public string Texte { get; set; } = string.Empty;

    public List<Guid> TagIds { get; set; } = new();
}

public sealed record TransmissionResponse(
    Guid Id,
    string Texte,
    DateTime CreeLe,
    DateTime? ModifieLe,
    string? AuteurNom,
    IReadOnlyList<TagResponse> Tags);

public sealed record TagResponse(Guid Id, string Libelle, bool EstAlerte);