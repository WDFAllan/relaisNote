import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import { api, getTokenExpiryMs, notifyUnauthorized, UNAUTHORIZED_EVENT } from './api'
import { BeneficiariesView } from './components/BeneficiariesView'
import { ServiceBeneficiariesView } from './components/ServiceBeneficiariesView'
import { TeamView } from './components/TeamView'
import type { Beneficiary, Service, Tag, Team, TeamUser, Transmission, User, View } from './types'

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
    const onUnauthorized = () => {
      localStorage.removeItem('relais_token')
      localStorage.removeItem('relais_user')
      setToken(null)
      setUser(null)
      setError('Session expirée, veuillez vous reconnecter.')
    }

    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  // Deconnecte proactivement des l expiration du JWT, sans attendre un appel API en echec.
  useEffect(() => {
    if (!token) return

    const expiryMs = getTokenExpiryMs(token)
    if (expiryMs === null) return

    const delay = expiryMs - Date.now()
    if (delay <= 0) {
      notifyUnauthorized()
      return
    }

    const timeoutId = window.setTimeout(notifyUnauthorized, delay)
    return () => window.clearTimeout(timeoutId)
  }, [token])

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

export default App
