using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Relais.Domain.Entities;
using Relais.Domain.Enums;
using Relais.Infrastructure.Persistence;

namespace Relais.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly RelaisDbContext db;
    private readonly IConfiguration configuration;
    private readonly PasswordHasher<Utilisateur> passwordHasher = new();

    public AuthController(RelaisDbContext db, IConfiguration configuration)
    {
        this.db = db;
        this.configuration = configuration;
    }

    [HttpPost("setup")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Setup(SetupRequest request, CancellationToken cancellationToken)
    {
        if (await db.Utilisateurs.AnyAsync(cancellationToken))
        {
            return Conflict(new { message = "Le compte administrateur initial existe déjà." });
        }

        var utilisateur = new Utilisateur
        {
            Id = Guid.NewGuid(),
            Email = NormalizeEmail(request.Email),
            Prenom = request.Prenom.Trim(),
            Nom = request.Nom.Trim(),
            Role = RoleUtilisateur.Administrateur,
            Statut = StatutUtilisateur.Actif,
        };
        utilisateur.MotDePasseHash = passwordHasher.HashPassword(utilisateur, request.MotDePasse);

        db.Utilisateurs.Add(utilisateur);
        await db.SaveChangesAsync(cancellationToken);

        return Ok(CreateAuthResponse(utilisateur));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var utilisateur = await db.Utilisateurs.SingleOrDefaultAsync(
            user => user.Email == email,
            cancellationToken);

        if (utilisateur is null || utilisateur.Statut != StatutUtilisateur.Actif)
        {
            return Unauthorized(new { message = "Email ou mot de passe invalide." });
        }

        var verification = passwordHasher.VerifyHashedPassword(
            utilisateur,
            utilisateur.MotDePasseHash,
            request.MotDePasse);

        if (verification == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { message = "Email ou mot de passe invalide." });
        }

        utilisateur.DerniereConnexion = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Ok(CreateAuthResponse(utilisateur));
    }

    private AuthResponse CreateAuthResponse(Utilisateur utilisateur)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, utilisateur.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, utilisateur.Email),
            new Claim(ClaimTypes.Name, utilisateur.NomComplet),
            new Claim(ClaimTypes.Role, utilisateur.Role.ToString()),
        };

        var secret = configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret manquant dans la configuration.");
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            SecurityAlgorithms.HmacSha256);
        var expiresAt = DateTime.UtcNow.AddHours(8);
        var token = new JwtSecurityToken(
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return new AuthResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            expiresAt,
            new UserResponse(utilisateur.Id, utilisateur.Email, utilisateur.Prenom, utilisateur.Nom, utilisateur.Role));
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}

public sealed class SetupRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(12)]
    public string MotDePasse { get; set; } = string.Empty;

    [Required, MinLength(1)]
    public string Prenom { get; set; } = string.Empty;

    [Required, MinLength(1)]
    public string Nom { get; set; } = string.Empty;
}

public sealed class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string MotDePasse { get; set; } = string.Empty;
}

public sealed record AuthResponse(string Token, DateTime ExpiresAt, UserResponse User);

public sealed record UserResponse(
    Guid Id,
    string Email,
    string Prenom,
    string Nom,
    RoleUtilisateur Role);