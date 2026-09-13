import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import type { Beneficiary, Service } from '../types'

type ServiceBeneficiariesViewProps = {
  services: Service[]
  allBeneficiaries: Beneficiary[]
  authHeaders: Record<string, string>
  onChangeService: (beneficiary: Beneficiary, serviceId: string | null) => Promise<void>
  onOpenBeneficiary: (id: string) => void
}

export function ServiceBeneficiariesView({
  services,
  allBeneficiaries,
  authHeaders,
  onChangeService,
  onOpenBeneficiary,
}: ServiceBeneficiariesViewProps) {
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
