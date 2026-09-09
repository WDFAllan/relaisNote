using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Relais.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// --- Base de données ---
builder.Services.AddDbContext<RelaisDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// --- Authentification JWT ---
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret manquant dans la configuration.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.FromMinutes(2),
        };
    });
builder.Services.AddAuthorization();

// --- API ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Applique les migrations au démarrage — pratique pour une installation self-host
// sans étape manuelle supplémentaire. À affiner (migration manuelle) si besoin
// d'un contrôle plus fin en production.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<RelaisDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
