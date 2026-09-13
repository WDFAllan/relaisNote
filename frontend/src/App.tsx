import { useEffect, useState, type FormEvent } from 'react'
import './App.css'

type User = { id: string; email: string; prenom: string; nom: string; role: number }
type TeamUser = User & { statut: number }
type Service = { id: string; nom: string; nombreEquipes: number; nombreBeneficiaires: number }
type Team = { id: string; nom: string; serviceId: string; serviceNom: string; nombreMembres: number }
type Beneficiary = { id: string; prenom: string; statut: number; serviceId: string | null; serviceNom?: string | null; referentNom: string | null }
type Tag = { id: string; libelle: string; estAlerte: boolean }
type Transmission = { id: string; texte: string; creeLe: string; auteurNom: string | null; tags: Tag[] }
type View = 'beneficiaries' | 'team' | 'service-beneficiaries'

const api = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message ?? `Erreur ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('relais_token'))
  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('relais_user') ?? 'null')
    } catch {
      return null
    }
  })
  const [view, setView] = useState<View>('beneficiaries')
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [transmissions, setTransmissions] = useState<Transmission[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [team, setTeam] = useState<TeamUser[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [error, setError] = useState('')

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  const loadData = async () => {
    const [people, availableTags] = await Promise.all([
      api<Beneficiary[]>('/api/beneficiaires', { headers: authHeaders }),
      api<Tag[]>('/api/tags', { headers: authHeaders }),
    ])

    setBeneficiaries(people)
    setTags(availableTags)

    if (!selectedId && people[0]) {
      setSelectedId(people[0].id)
    }

    if (user?.role === 0) {
      const [members, availableServices, availableTeams] = await Promise.all([
        api<TeamUser[]>('/api/auth/users', { headers: authHeaders }),
        api<Service[]>('/api/services', { headers: authHeaders }),
        api<Team[]>('/api/equipes', { headers: authHeaders }),
      ])
      setTeam(members)
      setServices(availableServices)
      setTeams(availableTeams)
    }
  }

  useEffect(() => {
    if (!token) return

    setError('')
    loadData().catch((e) => setError((e as Error).message))
  }, [token])

  useEffect(() => {
    if (!token || !selectedId) return

    setError('')
    api<Transmission[]>(`/api/beneficiaires/${selectedId}/transmissions`, {
      headers: authHeaders,
    })
      .then((data) => setTransmissions(data))
      .catch((e) => setError((e as Error).message))
  }, [selectedId, token])

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    try {
      const result = await api<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          motDePasse: form.get('password'),
        }),
      })

      localStorage.setItem('relais_token', result.token)
      localStorage.setItem('relais_user', JSON.stringify(result.user))
      setToken(result.token)
      setUser(result.user)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const createBeneficiary = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)

    try {
      const created = await api<Beneficiary>('/api/beneficiaires', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          prenom: form.get('prenom'),
          serviceId: form.get('serviceId') || null,
          referentId: null,
        }),
      })

      setBeneficiaries((current) => [...current, created])
      setSelectedId(created.id)
      event.currentTarget.reset()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const changeBeneficiaryService = async (beneficiary: Beneficiary, serviceId: string | null) => {
    setError('')
    try {
      const updated = await api<Beneficiary>(`/api/beneficiaires/${beneficiary.id}/service`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ serviceId }),
      })
      setBeneficiaries((current) => current.map((item) => item.id === updated.id ? updated : item))
      setServices((current) => current.map((service) => {
        if (service.id === beneficiary.serviceId) return { ...service, nombreBeneficiaires: Math.max(0, service.nombreBeneficiaires - 1) }
        if (service.id === updated.serviceId) return { ...service, nombreBeneficiaires: service.nombreBeneficiaires + 1 }
        return service
      }))
    } catch (e) {
      setError((e as Error).message)
      throw e
    }
  }

  const archiveBeneficiary = (beneficiary: Beneficiary) => {
    const overlay = document.createElement('div')
    overlay.className = 'delete-modal-backdrop'
    overlay.innerHTML = `
      <div class="delete-modal" role="dialog" aria-modal="true">
        <p class="eyebrow">ARCHIVAGE</p>
        <h2>Archiver ${beneficiary.prenom} ?</h2>
        <p class="delete-copy">
          ${beneficiary.prenom} n'apparaîtra plus dans la liste active, mais son historique de
          transmissions est conservé. Cette action est réversible.
        </p>
        <p class="delete-validation"></p>
        <div class="delete-modal-actions">
          <button type="button" class="delete-cancel">Annuler</button>
          <button type="button" class="delete-confirm">Archiver</button>
        </div>
      </div>
    `

    document.body.appendChild(overlay)

    const validation = overlay.querySelector<HTMLElement>('.delete-validation')
    const close = () => overlay.remove()

    overlay.querySelector('.delete-cancel')?.addEventListener('click', close)
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close()
    })

    overlay.querySelector('.delete-confirm')?.addEventListener('click', async () => {
      try {
        await api<void>(`/api/beneficiaires/${beneficiary.id}/archiver`, {
          method: 'POST',
          headers: authHeaders,
        })

        setBeneficiaries((current) => current.filter((item) => item.id !== beneficiary.id))
        setSelectedId(null)
        setTransmissions([])
        close()
      } catch (e) {
        if (validation) validation.textContent = (e as Error).message
      }
    })
  }

  const createTransmission = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedId) return

    setError('')
    const form = new FormData(event.currentTarget)

    try {
      const created = await api<Transmission>(`/api/beneficiaires/${selectedId}/transmissions`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          texte: form.get('texte'),
          tagIds: [form.get('tagId')].filter(Boolean),
        }),
      })

      setTransmissions((current) => [created, ...current])
      event.currentTarget.reset()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const createTeamUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)

    try {
      const created = await api<TeamUser>('/api/auth/users', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          email: form.get('email'),
          motDePasse: form.get('password'),
          prenom: form.get('prenom'),
          nom: form.get('nom'),
          role: Number(form.get('role')),
        }),
      })

      setTeam((current) => [...current, created])
      event.currentTarget.reset()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const createService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)

    try {
      const created = await api<Service>('/api/services', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ nom: form.get('nom') }),
      })
      setServices((current) => [...current, created])
      event.currentTarget.reset()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const createTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)

    try {
      const created = await api<Team>('/api/equipes', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ nom: form.get('nom'), serviceId: form.get('serviceId') }),
      })
      setTeams((current) => [...current, created])
      setServices((current) => current.map((service) => service.id === created.serviceId
        ? { ...service, nombreEquipes: service.nombreEquipes + 1 }
        : service))
      event.currentTarget.reset()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const addTeamMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const teamId = form.get('teamId')
    const userId = form.get('userId')

    try {
      await api<void>(`/api/equipes/${teamId}/membres/${userId}`, {
        method: 'POST',
        headers: authHeaders,
      })
      setTeams((current) => current.map((item) => item.id === teamId
        ? { ...item, nombreMembres: item.nombreMembres + 1 }
        : item))
      event.currentTarget.reset()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const logout = () => {
    localStorage.clear()
    setToken(null)
    setUser(null)
  }

  if (!token) {
    return (
      <main className="login-page">
        <div className="login-card">
          <div className="brand-mark">R</div>
          <p className="eyebrow">RELAIS / ESPACE ÉQUIPE</p>
          <h1>Les transmissions, au bon endroit.</h1>
          <p className="intro">
            Un espace calme pour suivre les personnes accompagnées et partager les observations utiles.
          </p>

          <form onSubmit={login} className="stack-form">
            <label>
              Email
              <input name="email" type="email" defaultValue="admin@relais.local" required />
            </label>
            <label>
              Mot de passe
              <input name="password" type="password" defaultValue="MotDePasseTest123!" required />
            </label>
            <button className="primary-button" type="submit">
              Ouvrir la session <span>→</span>
            </button>
          </form>

          {error && <p className="error">{error}</p>}
        </div>
      </main>
    )
  }

  const selected = beneficiaries.find((item) => item.id === selectedId)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="wordmark">
          <span>R</span>
          <strong>relais</strong>
        </div>

        <nav className="main-nav">
          <button
            className={view === 'beneficiaries' ? 'nav-button active' : 'nav-button'}
            onClick={() => setView('beneficiaries')}
          >
            Bénéficiaires
          </button>
          {user?.role === 0 && (
            <>
              <button
                className={view === 'team' ? 'nav-button active' : 'nav-button'}
                onClick={() => setView('team')}
              >
                Équipe
              </button>
              <button
                className={view === 'service-beneficiaries' ? 'nav-button active' : 'nav-button'}
                onClick={() => setView('service-beneficiaries')}
              >
                Par services
              </button>
            </>
          )}
        </nav>

        <div className="topbar-right">
          <span>
            {user?.prenom} {user?.nom}
          </span>
          <button className="quiet-button" onClick={logout}>
            Quitter
          </button>
        </div>
      </header>

      {view === 'team' && user?.role === 0 ? (
        <TeamView
          team={team}
          services={services}
          teams={teams}
          authHeaders={authHeaders}
          error={error}
          onCreate={createTeamUser}
          onCreateService={createService}
          onCreateTeam={createTeam}
          onAddMember={addTeamMember}
        />
      ) : view === 'service-beneficiaries' && user?.role === 0 ? (
        <ServiceBeneficiariesView
          services={services}
          allBeneficiaries={beneficiaries}
          authHeaders={authHeaders}
          onChangeService={changeBeneficiaryService}
          onOpenBeneficiary={(id) => { setSelectedId(id); setView('beneficiaries') }}
        />
      ) : (
        <BeneficiariesView
          beneficiaries={beneficiaries}
          services={services}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          selected={selected}
          transmissions={transmissions}
          tags={tags}
          error={error}
          isAdmin={user?.role === 0}
          onCreateBeneficiary={createBeneficiary}
          onArchiveBeneficiary={archiveBeneficiary}
          onCreateTransmission={createTransmission}
          onChangeService={changeBeneficiaryService}
        />
      )}
    </main>
  )
}

type BeneficiariesViewProps = {
  beneficiaries: Beneficiary[]
  services: Service[]
  selectedId: string | null
  setSelectedId: (id: string) => void
  selected?: Beneficiary
  transmissions: Transmission[]
  tags: Tag[]
  error: string
  isAdmin: boolean
  onCreateBeneficiary: (event: FormEvent<HTMLFormElement>) => void
  onArchiveBeneficiary: (beneficiary: Beneficiary) => void
  onCreateTransmission: (event: FormEvent<HTMLFormElement>) => void
  onChangeService: (beneficiary: Beneficiary, serviceId: string | null) => Promise<void>
}

function BeneficiariesView({
  beneficiaries,
  services,
  selectedId,
  setSelectedId,
  selected,
  transmissions,
  tags,
  error,
  isAdmin,
  onCreateBeneficiary,
  onArchiveBeneficiary,
  onCreateTransmission,
  onChangeService,
}: BeneficiariesViewProps) {
  const [selectedTransmissionTagId, setSelectedTransmissionTagId] = useState('')
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [nextServiceId, setNextServiceId] = useState('')

  const filteredTransmissions = transmissions.filter((item) => {
    if (showOnlyAlerts && !item.tags.some((tag) => tag.estAlerte)) return false
    if (selectedTransmissionTagId && !item.tags.some((tag) => tag.id === selectedTransmissionTagId)) return false
    return true
  })

  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>('.sidebar .search-box input')
    if (!input) return

    const filterRows = () => {
      const query = input.value.trim().toLocaleLowerCase()
      document.querySelectorAll<HTMLElement>('.sidebar .person-row').forEach((row) => {
        const text = row.textContent?.toLocaleLowerCase() ?? ''
        row.style.display = text.includes(query) ? '' : 'none'
      })
    }

    input.addEventListener('input', filterRows)
    return () => input.removeEventListener('input', filterRows)
  }, [beneficiaries])

  return (
    <section className="workspace">
      <aside className="sidebar">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SUIVI ACTUEL</p>
            <h2>Bénéficiaires</h2>
          </div>
        </div>

        {isAdmin && (
          <form className="quick-create" onSubmit={onCreateBeneficiary}>
            <label>
              Nouveau bénéficiaire
              <input name="prenom" placeholder="Prénom" required />
            </label>
            <label>
              Service
              <select name="serviceId" defaultValue="">
                <option value="">Sans service</option>
                {services.map((service) => <option value={service.id} key={service.id}>{service.nom}</option>)}
              </select>
            </label>
            <button className="primary-button" type="submit">
              Créer <span>+</span>
            </button>
          </form>
        )}

        <div className="search-box">
          ⌕ <input placeholder="Rechercher..." />
        </div>

        <div className="people-list">
          {beneficiaries.map((item) => (
            <button
              key={item.id}
              className={`person-row ${selectedId === item.id ? 'selected' : ''}`}
              onClick={() => setSelectedId(item.id)}
            >
              <span className="avatar">{item.prenom[0]}</span>
              <span>
                <strong>{item.prenom}</strong>
                <small>{item.referentNom ?? 'Sans référent'}</small>
              </span>
              <span className="chevron">›</span>
            </button>
          ))}

          {beneficiaries.length === 0 && <p className="empty">Aucun bénéficiaire actif.</p>}
        </div>
      </aside>

      <section className="content">
        <div className="content-heading">
          <div>
            <p className="eyebrow">CARNET DE TRANSMISSIONS</p>
            <h1>{selected?.prenom ?? 'Sélectionnez un bénéficiaire'}</h1>
            {selected && (
              <p className="meta">
                <span className="active-pill">Actif</span> {transmissions.length} transmission
                {transmissions.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {isAdmin && selected && (
            <div className="heading-actions">
              <button className="outline-button" onClick={() => { setNextServiceId(selected.serviceId ?? ''); setShowServiceModal(true) }}>Changer de service</button>
              <button className="delete-button" onClick={() => onArchiveBeneficiary(selected)}>Archiver</button>
            </div>
          )}
        </div>

        {error && <div className="error-banner">{error}</div>}

        {selected ? (
          <>
            <form className="transmission-form" onSubmit={onCreateTransmission}>
              <div className="form-label">
                <span>Nouvelle transmission</span>
                <small>Partagez une observation avec l’équipe</small>
              </div>

              <textarea name="texte" placeholder="Écrire une observation..." required />

              <div className="form-actions">
                <select name="tagId" defaultValue="">
                  <option value="">Sans tag</option>
                  {tags.map((tag) => (
                    <option value={tag.id} key={tag.id}>
                      {tag.libelle}
                    </option>
                  ))}
                </select>

                <button className="primary-button" type="submit">
                  Publier <span>↗</span>
                </button>
              </div>
            </form>

            <div className="transmission-filters">
              <button
                type="button"
                className={`filter-chip ${showOnlyAlerts ? 'active alert' : ''}`}
                onClick={() => setShowOnlyAlerts((value) => !value)}
              >
                Alertes
              </button>

              <select
                className="filter-select"
                value={selectedTransmissionTagId}
                onChange={(event) => setSelectedTransmissionTagId(event.target.value)}
              >
                <option value="">Tous les tags</option>
                {tags.map((tag) => (
                  <option value={tag.id} key={tag.id}>
                    {tag.libelle}
                  </option>
                ))}
              </select>
            </div>

            {filteredTransmissions.length === 0 ? (
              <div className="empty-state">
                <span>•</span>
                <h3>Aucune transmission</h3>
                <p>Essayez un autre filtre ou ajoutez une observation.</p>
              </div>
            ) : (
              <div className="timeline">
                {filteredTransmissions.map((item) => (
                  <article className="transmission" key={item.id}>
                    <span className="timeline-dot" />
                    <div className="transmission-head">
                      <strong>{item.auteurNom ?? 'Équipe'}</strong>
                      <time>{new Date(item.creeLe).toLocaleDateString('fr-FR')}</time>
                    </div>
                    <p>{item.texte}</p>
                    <div className="tag-list">
                      {item.tags.map((tag) => (
                        <span key={`${item.id}-${tag.id}`} className={`tag ${tag.estAlerte ? 'alert' : ''}`}>
                          {tag.libelle}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="empty-state large">
            <span>✦</span>
            <h3>Choisissez un bénéficiaire</h3>
            <p>La liste de gauche contient les personnes suivies. Sélectionnez-en une pour lire ses transmissions.</p>
          </div>
        )}
      </section>
      {showServiceModal && selected && <div className="organization-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setShowServiceModal(false) }}><section className="organization-modal" role="dialog" aria-modal="true"><div className="panel-heading"><h2>Changer de service</h2><button className="close-action" onClick={() => setShowServiceModal(false)}>Fermer</button></div><p className="delete-copy">Déplacez <strong>{selected.prenom}</strong> vers un autre service.</p><form className="organization-form" onSubmit={async (event) => { event.preventDefault(); await onChangeService(selected, nextServiceId || null); setShowServiceModal(false) }}><label>Service<select value={nextServiceId} onChange={(event) => setNextServiceId(event.target.value)}><option value="">Sans service</option>{services.map((service) => <option value={service.id} key={service.id}>{service.nom}</option>)}</select></label><button className="primary-button" type="submit">Enregistrer <span>→</span></button></form></section></div>}
    </section>
  )
}

type ServiceBeneficiariesViewProps = {
  services: Service[]
  allBeneficiaries: Beneficiary[]
  authHeaders: Record<string, string>
  onChangeService: (beneficiary: Beneficiary, serviceId: string | null) => Promise<void>
  onOpenBeneficiary: (id: string) => void
}

function ServiceBeneficiariesView({ services, allBeneficiaries, authHeaders, onChangeService, onOpenBeneficiary }: ServiceBeneficiariesViewProps) {
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [assignmentId, setAssignmentId] = useState('')

  useEffect(() => {
    if (!selectedServiceId && services[0]) setSelectedServiceId(services[0].id)
  }, [services, selectedServiceId])

  useEffect(() => {
    if (!selectedServiceId) return
    setLoading(true)
    setError('')
    api<Beneficiary[]>(`/api/services/${selectedServiceId}/beneficiaires`, { headers: authHeaders })
      .then(setBeneficiaries)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [selectedServiceId])

  const selectedService = services.find((service) => service.id === selectedServiceId)
  const filteredBeneficiaries = beneficiaries.filter((beneficiary) =>
    beneficiary.prenom.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
    || (beneficiary.referentNom ?? '').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const availableBeneficiaries = allBeneficiaries.filter((beneficiary) => beneficiary.serviceId !== selectedServiceId)

  const assignBeneficiary = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const beneficiary = allBeneficiaries.find((item) => item.id === assignmentId)
    if (!beneficiary || !selectedServiceId) return

    try {
      await onChangeService(beneficiary, selectedServiceId)
      setBeneficiaries((current) => [...current, { ...beneficiary, serviceId: selectedServiceId, serviceNom: selectedService?.nom }])
      setAssignmentId('')
      setShowAssignmentModal(false)
    } catch {
      // The parent action displays the API error.
    }
  }

  return (
    <section className="service-beneficiaries-page">
      <div className="team-page-heading">
        <div>
          <p className="eyebrow">VUE PAR SERVICE</p>
          <h1>Bénéficiaires</h1>
          <p className="intro">Retrouvez rapidement les personnes accompagnées dans chaque service.</p>
        </div>
        <div className="team-count"><strong>{services.length}</strong><span>services</span></div>
      </div>

      <div className="service-beneficiaries-browser">
        <aside className="organization-sidebar">
          <div className="panel-heading"><h2>Services</h2><span>{services.length}</span></div>
          <div className="service-navigation">
            {services.map((service) => (
              <button key={service.id} className={`service-navigation-item ${selectedServiceId === service.id ? 'selected' : ''}`} onClick={() => setSelectedServiceId(service.id)}>
                <span className="organization-icon">S</span>
                <span><strong>{service.nom}</strong><small>{service.nombreBeneficiaires} bénéficiaire{service.nombreBeneficiaires !== 1 ? 's' : ''}</small></span>
                <span className="chevron">›</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="service-beneficiaries-content">
          {selectedService ? <>
            <div className="detail-heading service-beneficiaries-heading">
              <div><p className="eyebrow">SERVICE SÉLECTIONNÉ</p><h2>{selectedService.nom}</h2><p className="meta">{beneficiaries.length} bénéficiaire{beneficiaries.length !== 1 ? 's' : ''}</p></div>
              <button className="outline-button" onClick={() => setShowAssignmentModal(true)}>+ Ajouter un bénéficiaire</button>
              <input className="service-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une personne..." />
            </div>
            {error && <div className="error-banner">{error}</div>}
            {loading ? <div className="empty-state"><h3>Chargement...</h3></div> : filteredBeneficiaries.length === 0 ? <div className="empty-state"><span>•</span><h3>Aucun bénéficiaire trouvé</h3><p>Ce service ne contient pas encore de personne correspondant à la recherche.</p></div> : <div className="beneficiary-service-grid">{filteredBeneficiaries.map((beneficiary) => <button className="beneficiary-service-card" key={beneficiary.id} onClick={() => onOpenBeneficiary(beneficiary.id)}><span className="avatar">{beneficiary.prenom[0]}</span><span><strong>{beneficiary.prenom}</strong><small>{beneficiary.referentNom ?? 'Sans référent'}</small></span><span className="chevron">›</span></button>)}</div>}
          </> : <div className="empty-state large"><span>✦</span><h3>Aucun service</h3><p>Créez un service pour y rattacher des bénéficiaires.</p></div>}
        </section>
      </div>
      {showAssignmentModal && selectedService && <div className="organization-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setShowAssignmentModal(false) }}><section className="organization-modal" role="dialog" aria-modal="true"><div className="panel-heading"><h2>Ajouter au service</h2><button className="close-action" onClick={() => setShowAssignmentModal(false)}>Fermer</button></div><p className="delete-copy">Choisissez un bénéficiaire à rattacher à <strong>{selectedService.nom}</strong>.</p>{availableBeneficiaries.length === 0 ? <p className="empty">Tous les bénéficiaires sont déjà dans ce service.</p> : <form className="organization-form" onSubmit={assignBeneficiary}><label>Bénéficiaire<select value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} required><option value="" disabled>Choisir une personne</option>{availableBeneficiaries.map((beneficiary) => <option value={beneficiary.id} key={beneficiary.id}>{beneficiary.prenom}{beneficiary.serviceNom ? ` · ${beneficiary.serviceNom}` : ' · Sans service'}</option>)}</select></label><button className="primary-button" type="submit">Rattacher au service <span>→</span></button></form>}</section></div>}
    </section>
  )
}

type TeamViewProps = {
  team: TeamUser[]
  services: Service[]
  teams: Team[]
  authHeaders: Record<string, string>
  error: string
  onCreate: (event: FormEvent<HTMLFormElement>) => void
  onCreateService: (event: FormEvent<HTMLFormElement>) => void
  onCreateTeam: (event: FormEvent<HTMLFormElement>) => void
  onAddMember: (event: FormEvent<HTMLFormElement>) => void
}

function TeamView({ team, services, teams, authHeaders, error, onCreate, onCreateService, onCreateTeam, onAddMember }: TeamViewProps) {
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [serviceBeneficiaries, setServiceBeneficiaries] = useState<Beneficiary[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamUser[]>([])
  const [detailError, setDetailError] = useState('')
  const [openAction, setOpenAction] = useState<'service' | 'team' | 'member' | 'user' | null>(null)

  const selectedService = services.find((service) => service.id === selectedServiceId)
  const serviceTeams = teams.filter((item) => item.serviceId === selectedServiceId)
  const selectedTeam = teams.find((item) => item.id === selectedTeamId)

  useEffect(() => {
    if (!selectedServiceId && services[0]) setSelectedServiceId(services[0].id)
  }, [services, selectedServiceId])

  useEffect(() => {
    if (!selectedServiceId) return
    setSelectedTeamId('')
    setDetailError('')
    api<Beneficiary[]>(`/api/services/${selectedServiceId}/beneficiaires`, { headers: authHeaders })
      .then(setServiceBeneficiaries)
      .catch((e) => setDetailError((e as Error).message))
  }, [selectedServiceId])

  useEffect(() => {
    if (!selectedTeamId) {
      setTeamMembers([])
      return
    }
    api<TeamUser[]>(`/api/equipes/${selectedTeamId}/membres`, { headers: authHeaders })
      .then(setTeamMembers)
      .catch((e) => setDetailError((e as Error).message))
  }, [selectedTeamId])

  const actionTitle = openAction === 'service'
    ? 'Nouveau service'
    : openAction === 'team'
      ? 'Nouvelle équipe'
      : openAction === 'member'
        ? 'Affecter un membre'
        : 'Nouveau compte'

  return (
    <section className="team-page">
      <div className="team-page-heading">
        <div><p className="eyebrow">ADMINISTRATION</p><h1>Organisation</h1><p className="intro">Parcourez les services et ouvrez une équipe pour voir ses membres et les personnes accompagnées.</p></div>
        <div className="team-count"><strong>{services.length}</strong><span>services</span></div>
      </div>

      {(error || detailError) && <div className="error-banner">{error || detailError}</div>}

      <div className="organization-browser">
        <aside className="organization-sidebar">
          <div className="panel-heading"><h2>Services</h2><button className="context-add" aria-label="Créer un service" title="Créer un service" onClick={() => setOpenAction('service')}>+</button></div>
          <div className="service-navigation">{services.map((service) => <button key={service.id} className={`service-navigation-item ${selectedServiceId === service.id ? 'selected' : ''}`} onClick={() => setSelectedServiceId(service.id)}><span className="organization-icon">S</span><span><strong>{service.nom}</strong><small>{service.nombreEquipes} équipe{service.nombreEquipes !== 1 ? 's' : ''} · {service.nombreBeneficiaires} bénéficiaire{service.nombreBeneficiaires !== 1 ? 's' : ''}</small></span><span className="chevron">›</span></button>)}</div>
        </aside>

        <section className="organization-detail">
          {!selectedService ? <div className="empty-state large"><span>✦</span><h3>Aucun service</h3><p>Créez un service pour commencer l’organisation.</p></div> : <>
            <div className="detail-heading"><div><p className="eyebrow">SERVICE</p><h2>{selectedService.nom}</h2><p className="meta">{serviceTeams.length} équipe{serviceTeams.length !== 1 ? 's' : ''} · {serviceBeneficiaries.length} bénéficiaire{serviceBeneficiaries.length !== 1 ? 's' : ''}</p></div></div>
            <div className="team-selector"><div className="panel-heading"><h2>Équipes du service</h2><button className="context-add" aria-label="Créer une équipe" title="Créer une équipe" onClick={() => setOpenAction('team')}>+</button></div><div className="team-selector-grid">{serviceTeams.map((item) => <button key={item.id} className={`team-selector-card ${selectedTeamId === item.id ? 'selected' : ''}`} onClick={() => setSelectedTeamId(item.id)}><span className="organization-icon team-icon">E</span><span><strong>{item.nom}</strong><small>{item.nombreMembres} membre{item.nombreMembres !== 1 ? 's' : ''}</small></span><span className="chevron">›</span></button>)}</div>{serviceTeams.length === 0 && <p className="empty">Aucune équipe dans ce service.</p>}</div>
            {selectedTeam ? <div className="team-detail"><div className="detail-heading"><div><p className="eyebrow">ÉQUIPE</p><h2>{selectedTeam.nom}</h2><p className="meta">{selectedTeam.serviceNom}</p></div></div><div className="detail-columns"><section className="detail-panel"><div className="panel-heading"><h3>Éducateurs et référents</h3><div className="panel-actions"><button className="context-add" aria-label="Affecter un membre" title="Affecter un membre" onClick={() => setOpenAction('member')}>+</button><button className="context-add" aria-label="Créer un compte" title="Créer un compte" onClick={() => setOpenAction('user')}>●</button></div></div><div className="team-list">{teamMembers.map((member) => <div className="team-row" key={member.id}><span className="avatar">{member.prenom[0]}</span><span><strong>{member.prenom} {member.nom}</strong><small>{member.email}</small></span><span className="role-label">{member.role === 1 ? 'Référent' : 'Éducateur'}</span></div>)}</div>{teamMembers.length === 0 && <p className="empty">Aucun membre affecté.</p>}</section><section className="detail-panel"><div className="panel-heading"><h3>Bénéficiaires du service</h3></div><div className="beneficiary-mini-list">{serviceBeneficiaries.map((beneficiary) => <div className="beneficiary-mini-row" key={beneficiary.id}><span className="avatar">{beneficiary.prenom[0]}</span><span><strong>{beneficiary.prenom}</strong><small>{beneficiary.referentNom ?? 'Sans référent'}</small></span></div>)}</div>{serviceBeneficiaries.length === 0 && <p className="empty">Aucun bénéficiaire rattaché.</p>}</section></div></div> : <div className="empty-state"><span>•</span><h3>Sélectionnez une équipe</h3><p>Vous verrez ici ses membres et les bénéficiaires de son service.</p></div>}
          </>}
        </section>
      </div>
      {openAction && <div className="organization-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setOpenAction(null) }}><section className="organization-modal" role="dialog" aria-modal="true"><div className="panel-heading"><h2>{actionTitle}</h2><button className="close-action" onClick={() => setOpenAction(null)}>Fermer</button></div>{openAction === 'service' && <form className="inline-create-form" onSubmit={onCreateService}><input name="nom" placeholder="Nom du service" required autoFocus /><button className="primary-button" type="submit">Créer <span>+</span></button></form>}{openAction === 'team' && <form className="organization-form compact-form" onSubmit={onCreateTeam}><label>Nom de l’équipe<input name="nom" placeholder="Équipe de jour" required /></label><label>Service<select name="serviceId" required value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)}><option value="" disabled>Choisir un service</option>{services.map((service) => <option value={service.id} key={service.id}>{service.nom}</option>)}</select></label><button className="primary-button" type="submit">Créer l’équipe <span>→</span></button></form>}{openAction === 'member' && <form className="organization-form compact-form" onSubmit={onAddMember}><label>Équipe<select name="teamId" required defaultValue={selectedTeamId}><option value="" disabled>Choisir une équipe</option>{teams.map((item) => <option value={item.id} key={item.id}>{item.nom} · {item.serviceNom}</option>)}</select></label><label>Utilisateur<select name="userId" required defaultValue=""><option value="" disabled>Choisir un membre</option>{team.map((member) => <option value={member.id} key={member.id}>{member.prenom} {member.nom}</option>)}</select></label><button className="primary-button" type="submit">Ajouter à l’équipe <span>+</span></button></form>}{openAction === 'user' && <form className="stack-form" onSubmit={onCreate}><div className="form-grid"><label>Prénom<input name="prenom" required /></label><label>Nom<input name="nom" required /></label></div><label>Email professionnel<input name="email" type="email" required /></label><label>Mot de passe<input name="password" type="password" minLength={12} required /></label><label>Fonction<select name="role" defaultValue="2"><option value="2">Éducateur</option><option value="1">Référent</option></select></label><button className="primary-button" type="submit">Créer le compte <span>→</span></button></form>}</section></div>}
    </section>
  )
}

export default App
