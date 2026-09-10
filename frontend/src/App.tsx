import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type User = { id: string; email: string; prenom: string; nom: string; role: number }
type TeamUser = User & { statut: number }
type Beneficiary = { id: string; prenom: string; statut: number; referentNom: string | null }
type Tag = { id: string; libelle: string; estAlerte: boolean }
type Transmission = { id: string; texte: string; creeLe: string; auteurNom: string | null; tags: Tag[] }

const api = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } })
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? `Erreur ${response.status}`)
  return response.json()
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('relais_token'))
  const [user, setUser] = useState<User | null>(() => JSON.parse(localStorage.getItem('relais_user') ?? 'null'))
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [transmissions, setTransmissions] = useState<Transmission[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [team, setTeam] = useState<TeamUser[]>([])
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showTeam, setShowTeam] = useState(false)
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  const loadBeneficiaries = async () => {
    const data = await api<Beneficiary[]>('/api/beneficiaires', { headers: authHeaders })
    setBeneficiaries(data)
    if (!selectedId && data[0]) setSelectedId(data[0].id)
  }
  const loadTransmissions = async (id: string) => setTransmissions(await api<Transmission[]>(`/api/beneficiaires/${id}/transmissions`, { headers: authHeaders }))
  const loadTeam = async () => setTeam(await api<TeamUser[]>('/api/auth/users', { headers: authHeaders }))

  useEffect(() => {
    if (!token) return
    Promise.all([
      loadBeneficiaries(),
      api<Tag[]>('/api/tags', { headers: authHeaders }).then(setTags),
      user?.role === 0 ? loadTeam() : Promise.resolve(),
    ]).catch((e) => setError(e.message))
  }, [token])
  useEffect(() => { if (selectedId) loadTransmissions(selectedId).catch((e) => setError(e.message)) }, [selectedId])

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    const form = new FormData(event.currentTarget)
    try {
      const result = await api<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email: form.get('email'), motDePasse: form.get('password') }),
      })
      localStorage.setItem('relais_token', result.token); localStorage.setItem('relais_user', JSON.stringify(result.user))
      setToken(result.token); setUser(result.user)
    } catch (e) { setError((e as Error).message) }
  }

  const createBeneficiary = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    try {
      const created = await api<Beneficiary>('/api/beneficiaires', { method: 'POST', headers: authHeaders, body: JSON.stringify({ prenom: form.get('prenom'), referentId: null }) })
      setBeneficiaries((current) => [...current, created]); setSelectedId(created.id); setShowCreate(false); event.currentTarget.reset()
    } catch (e) { setError((e as Error).message) }
  }

  const createTransmission = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selectedId) return
    const form = new FormData(event.currentTarget)
    try {
      const created = await api<Transmission>(`/api/beneficiaires/${selectedId}/transmissions`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ texte: form.get('texte'), tagIds: [form.get('tagId')].filter(Boolean) }) })
      setTransmissions((current) => [created, ...current]); event.currentTarget.reset()
    } catch (e) { setError((e as Error).message) }
  }

  const createTeamUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    try {
      const created = await api<TeamUser>('/api/auth/users', { method: 'POST', headers: authHeaders, body: JSON.stringify({ email: form.get('email'), motDePasse: form.get('password'), prenom: form.get('prenom'), nom: form.get('nom'), role: Number(form.get('role')) }) })
      setTeam((current) => [...current, created]); event.currentTarget.reset()
    } catch (e) { setError((e as Error).message) }
  }

  const logout = () => { localStorage.clear(); setToken(null); setUser(null) }

  if (!token) return <main className="login-page"><div className="login-card"><div className="brand-mark">R</div><p className="eyebrow">RELAIS / ESPACE ÉQUIPE</p><h1>Les transmissions, au bon endroit.</h1><p className="intro">Un espace calme pour suivre les personnes accompagnées et partager les observations utiles.</p><form onSubmit={login} className="stack-form"><label>Email<input name="email" type="email" defaultValue="admin@relais.local" required /></label><label>Mot de passe<input name="password" type="password" defaultValue="MotDePasseTest123!" required /></label><button className="primary-button" type="submit">Ouvrir la session <span>→</span></button></form>{error && <p className="error">{error}</p>}<p className="login-note">Accès réservé aux membres de l’équipe.</p></div></main>

  const selected = beneficiaries.find((item) => item.id === selectedId)
  return <main className="app-shell">
    <header className="topbar"><div className="wordmark"><span>R</span><strong>relais</strong></div><div className="topbar-right"><span className="status-dot">● API connectée</span>{user?.role === 0 && <button className="team-button" onClick={() => setShowTeam(true)}>Équipe</button>}<span>{user?.prenom} {user?.nom}</span><button className="quiet-button" onClick={logout}>Quitter</button></div></header>
    <section className="workspace">
      <aside className="sidebar"><div className="section-heading"><div><p className="eyebrow">SUIVI ACTUEL</p><h2>Bénéficiaires</h2></div><button className="icon-button" onClick={() => setShowCreate(true)} title="Ajouter un bénéficiaire">+</button></div><div className="search-box">⌕ <input placeholder="Rechercher..." /></div><div className="people-list">{beneficiaries.map((item) => <button className={`person-row ${selectedId === item.id ? 'selected' : ''}`} key={item.id} onClick={() => setSelectedId(item.id)}><span className="avatar">{item.prenom[0]}</span><span><strong>{item.prenom}</strong><small>{item.referentNom ?? 'Sans référent'}</small></span><span className="chevron">›</span></button>)}{beneficiaries.length === 0 && <p className="empty">Aucun bénéficiaire actif.</p>}</div></aside>
      <section className="content"><div className="content-heading"><div><p className="eyebrow">CARNET DE TRANSMISSIONS</p><h1>{selected?.prenom ?? 'Sélectionnez un bénéficiaire'}</h1>{selected && <p className="meta"><span className="active-pill">Actif</span> {transmissions.length} transmission{transmissions.length !== 1 ? 's' : ''}</p>}</div></div>{error && <div className="error-banner">{error}</div>}{selected ? <><form className="transmission-form" onSubmit={createTransmission}><div className="form-label"><span>Nouvelle transmission</span><small>Partagez une observation avec l’équipe</small></div><textarea name="texte" placeholder="Écrire une observation..." required /><div className="form-actions"><select name="tagId" defaultValue=""><option value="">Sans tag</option>{tags.map((tag) => <option value={tag.id} key={tag.id}>{tag.libelle}</option>)}</select><button className="primary-button" type="submit">Publier <span>↗</span></button></div></form><div className="timeline">{transmissions.map((item) => <article className="transmission" key={item.id}><div className="timeline-dot" /><div className="transmission-head"><strong>{item.auteurNom ?? 'Équipe Relais'}</strong><time>{new Date(item.creeLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</time></div><p>{item.texte}</p><div className="tag-list">{item.tags.map((tag) => <span className={tag.estAlerte ? 'tag alert' : 'tag'} key={tag.id}>{tag.libelle}</span>)}</div></article>)}{transmissions.length === 0 && <div className="empty-state"><span>✦</span><h3>Le carnet est vide</h3><p>La première observation donnera vie au suivi de {selected.prenom}.</p></div>}</div></> : <div className="empty-state large"><span>◌</span><h3>Choisissez un bénéficiaire</h3><p>Les transmissions et observations apparaîtront ici.</p></div>}</section>
    </section>
    {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><div className="modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowCreate(false)}>×</button><p className="eyebrow">NOUVEAU DOSSIER</p><h2>Ajouter un bénéficiaire</h2><form className="stack-form" onSubmit={createBeneficiary}><label>Prénom<input name="prenom" placeholder="Prénom" autoFocus required /></label><button className="primary-button" type="submit">Créer le dossier <span>→</span></button></form></div></div>}
    {showTeam && <div className="modal-backdrop" onClick={() => setShowTeam(false)}><div className="modal team-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowTeam(false)}>×</button><p className="eyebrow">ADMINISTRATION</p><h2>Équipe Relais</h2><div className="team-list">{team.map((member) => <div className="team-row" key={member.id}><span className="avatar">{member.prenom[0]}</span><span><strong>{member.prenom} {member.nom}</strong><small>{member.email} · {member.role === 1 ? 'Référent' : member.role === 2 ? 'Éducateur' : 'Administrateur'}</small></span><span className="active-pill">Actif</span></div>)}</div><hr /><h3>Créer un membre</h3><form className="stack-form" onSubmit={createTeamUser}><div className="form-grid"><label>Prénom<input name="prenom" required /></label><label>Nom<input name="nom" required /></label></div><label>Email<input name="email" type="email" required /></label><label>Mot de passe<input name="password" type="password" minLength={12} placeholder="12 caractères minimum" required /></label><label>Fonction<select name="role" defaultValue="2"><option value="2">Éducateur</option><option value="1">Référent</option></select></label><button className="primary-button" type="submit">Créer le compte <span>→</span></button></form></div></div>}
  </main>
}

export default App
