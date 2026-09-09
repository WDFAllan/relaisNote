# Relais — squelette de projet

Point de départ du backend, généré à partir du cahier des charges technique.
À ouvrir dans **Claude Code** (ou votre IDE habituel) pour continuer.

## Structure

```
relais/
├── docker-compose.yml       # API + PostgreSQL + reverse proxy Caddy (HTTPS auto)
├── Caddyfile
├── src/
│   ├── Relais.sln
│   ├── Relais.Domain/        # Entités métier (Utilisateur, Beneficiaire, Transmission, Tag, JournalAudit...)
│   ├── Relais.Infrastructure/ # DbContext EF Core (PostgreSQL / Npgsql)
│   └── Relais.Api/            # API ASP.NET Core, auth JWT, Dockerfile
```

## Ce qui est déjà en place

- Entités du domaine alignées sur le modèle de données du cahier des charges (section 5)
- `RelaisDbContext` avec les relations et les 6 tags standard pré-remplis (dont "À signaler")
- Authentification JWT configurée dans `Program.cs`
- `docker-compose.yml` prêt à builder l'API, lancer PostgreSQL, et exposer le tout en HTTPS via Caddy

## Ce qu'il reste à faire (prochaines étapes suggérées)

1. **Restaurer les paquets et vérifier la compilation** : `dotnet restore src/Relais.sln` puis `dotnet build src/Relais.sln`.
2. **Créer la première migration EF Core** :
   ```
   cd src/Relais.Api
   dotnet ef migrations add InitialCreate --project ../Relais.Infrastructure --startup-project .
   ```
3. **Ajouter les endpoints** (contrôleurs ou minimal API) pour l'authentification, les bénéficiaires, les transmissions — pour l'instant seul `/health` existe.
4. **Brancher ASP.NET Core Identity** pour la gestion des mots de passe et des invitations (actuellement, `MotDePasseHash` est un champ brut sur `Utilisateur`, à remplacer ou compléter selon le choix Identity retenu).
5. **Démarrer en local** :
   ```
   cp .env.example .env   # à créer, avec DB_PASSWORD et JWT_SECRET
   docker compose up --build
   ```
6. **Frontend React** : pas encore scaffoldé dans ce squelette — à générer séparément (Vite + React + TypeScript conseillé).

## Variables d'environnement attendues (`.env`)

```
DB_PASSWORD=un_mot_de_passe_solide
JWT_SECRET=une_chaine_longue_et_aleatoire
RELAIS_DOMAIN=localhost
ASPNETCORE_ENVIRONMENT=Development
```
