using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Relais.Domain.Entities;
using Relais.Domain.Enums;
using Relais.Infrastructure.Persistence;

namespace Relais.Api.Controllers;

[ApiController]
[Route("api/equipes")]
[Authorize]
public class EquipesController : ControllerBase
{
    private readonly RelaisDbContext db;

    public EquipesController(RelaisDbContext db) => this.db = db;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<EquipeResponse>>> GetAll(
        [FromQuery] Guid? serviceId,
        CancellationToken cancellationToken)
    {
        var query = db.Equipes
            .AsNoTracking()
            .Where(team => team.EstActive);

        if (serviceId.HasValue)
        {
            query = query.Where(team => team.ServiceId == serviceId.Value);
        }

        return Ok(await query
            .OrderBy(team => team.Service!.Nom)
            .ThenBy(team => team.Nom)
            .Select(team => new EquipeResponse(
                team.Id,
                team.Nom,
                team.ServiceId,
                team.Service!.Nom,
                team.Membres.Count(member => member.Utilisateur!.Statut == StatutUtilisateur.Actif)))
            .ToListAsync(cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = "Administrateur")]
    public async Task<ActionResult<EquipeResponse>> Create(
        CreateEquipeRequest request,
        CancellationToken cancellationToken)
    {
        if (!await db.Services.AnyAsync(service => service.Id == request.ServiceId && service.EstActif, cancellationToken))
        {
            return BadRequest(new { message = "Le service indiqué est introuvable ou inactif." });
        }

        var nom = request.Nom.Trim();
        if (await db.Equipes.AnyAsync(team => team.ServiceId == request.ServiceId && team.Nom.ToLower() == nom.ToLower(), cancellationToken))
        {
            return Conflict(new { message = "Une équipe existe déjà avec ce nom dans ce service." });
        }

        var team = new Equipe { Id = Guid.NewGuid(), Nom = nom, ServiceId = request.ServiceId };
        db.Equipes.Add(team);
        await db.SaveChangesAsync(cancellationToken);

        var serviceName = await db.Services
            .Where(service => service.Id == team.ServiceId)
            .Select(service => service.Nom)
            .SingleAsync(cancellationToken);

        return Created($"/api/equipes/{team.Id}", new EquipeResponse(team.Id, team.Nom, team.ServiceId, serviceName, 0));
    }

    [HttpGet("{equipeId:guid}/membres")]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> GetMembers(
        Guid equipeId,
        CancellationToken cancellationToken)
    {
        if (!await db.Equipes.AnyAsync(team => team.Id == equipeId && team.EstActive, cancellationToken))
        {
            return NotFound(new { message = "Équipe introuvable." });
        }

        return Ok(await db.UtilisateurEquipes
            .AsNoTracking()
            .Where(member => member.EquipeId == equipeId && member.Utilisateur!.Statut == StatutUtilisateur.Actif)
            .OrderBy(member => member.Utilisateur!.Nom)
            .ThenBy(member => member.Utilisateur!.Prenom)
            .Select(member => new UserResponse(
                member.Utilisateur!.Id,
                member.Utilisateur.Email,
                member.Utilisateur.Prenom,
                member.Utilisateur.Nom,
                member.Utilisateur.Role,
                member.Utilisateur.Statut))
            .ToListAsync(cancellationToken));
    }

    [HttpPost("{equipeId:guid}/membres/{utilisateurId:guid}")]
    [Authorize(Roles = "Administrateur")]
    public async Task<IActionResult> AddMember(Guid equipeId, Guid utilisateurId, CancellationToken cancellationToken)
    {
        if (!await db.Equipes.AnyAsync(team => team.Id == equipeId && team.EstActive, cancellationToken))
        {
            return NotFound(new { message = "Équipe introuvable." });
        }

        if (!await db.Utilisateurs.AnyAsync(user => user.Id == utilisateurId && user.Statut == StatutUtilisateur.Actif, cancellationToken))
        {
            return BadRequest(new { message = "Utilisateur introuvable ou inactif." });
        }

        if (!await db.UtilisateurEquipes.AnyAsync(member => member.EquipeId == equipeId && member.UtilisateurId == utilisateurId, cancellationToken))
        {
            db.UtilisateurEquipes.Add(new UtilisateurEquipe { EquipeId = equipeId, UtilisateurId = utilisateurId });
            await db.SaveChangesAsync(cancellationToken);
        }

        return NoContent();
    }

    [HttpDelete("{equipeId:guid}/membres/{utilisateurId:guid}")]
    [Authorize(Roles = "Administrateur")]
    public async Task<IActionResult> RemoveMember(Guid equipeId, Guid utilisateurId, CancellationToken cancellationToken)
    {
        var member = await db.UtilisateurEquipes.SingleOrDefaultAsync(
            item => item.EquipeId == equipeId && item.UtilisateurId == utilisateurId,
            cancellationToken);

        if (member is null) return NotFound();

        db.UtilisateurEquipes.Remove(member);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}

public sealed class CreateEquipeRequest
{
    [Required, MinLength(1)]
    public string Nom { get; set; } = string.Empty;

    [Required]
    public Guid ServiceId { get; set; }
}

public sealed record EquipeResponse(Guid Id, string Nom, Guid ServiceId, string ServiceNom, int NombreMembres);