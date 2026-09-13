import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import type { Beneficiary, Service, Team, TeamUser } from '../types'

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

export function TeamView({ team, services, teams, authHeaders, error, onCreate, onCreateService, onCreateTeam, onAddMember }: TeamViewProps) {
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
