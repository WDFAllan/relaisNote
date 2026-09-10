using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Relais.Infrastructure.Persistence;

namespace Relais.Api.Controllers;

[ApiController]
[Route("api/tags")]
[Authorize]
public class TagsController : ControllerBase
{
    private readonly RelaisDbContext db;

    public TagsController(RelaisDbContext db)
    {
        this.db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TagResponse>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await db.Tags
            .AsNoTracking()
            .OrderBy(tag => tag.Libelle)
            .Select(tag => new TagResponse(tag.Id, tag.Libelle, tag.EstAlerte))
            .ToListAsync(cancellationToken));
    }
}